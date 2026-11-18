import Phaser from 'phaser';
import type { BarracksStats, TowerAttackStats, TowerConfig, TowerType, Vec2 } from '../types';
import { TOWER_CONFIGS } from '../config';
import { SELL_REFUND_RATIO } from '../core/constants';
import { dist, nearestPointOnPaths } from '../core/PathFollower';
import { sellRefund } from '../core/Balance';
import { Sfx } from '../core/Sfx';
import type { Enemy } from './Enemy';
import { Projectile } from './Projectile';
import { Soldier } from './Soldier';

/** 防御塔：攻击塔自动索敌开火；兵营维护士兵与集结点 */
export class Tower {
  readonly type: TowerType;
  readonly spot: Vec2;
  readonly config: TowerConfig;
  level = 1;
  invested: number;
  readonly sprite: Phaser.GameObjects.Image;
  readonly soldiers: Soldier[] = [];
  rally: Vec2;
  private scene: Phaser.Scene;
  private cooldown = 0;
  private respawnQueue: number[] = [];
  private rallyFlag: Phaser.GameObjects.Image | null = null;
  private levelPips: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, type: TowerType, spot: Vec2, paths: readonly (readonly Vec2[])[]) {
    this.scene = scene;
    this.type = type;
    this.spot = spot;
    this.config = TOWER_CONFIGS[type];
    this.invested = this.config.levels[0].cost;
    this.sprite = scene.add.image(spot.x, spot.y + 12, `tower-${type}-1`).setOrigin(0.5, 0.9);
    this.sprite.setDepth(spot.y + 12);
    this.levelPips = scene.add.graphics().setDepth(1001);
    this.rally = nearestPointOnPaths(paths, spot);
    if (type === 'barracks') {
      this.rally = this.clampRally(this.rally);
      this.rallyFlag = scene.add.image(this.rally.x, this.rally.y - 12, 'flag-rally').setDepth(1002).setScale(0.9);
      this.spawnInitialSoldiers();
    }
    this.drawPips();
    // 建造动画
    this.sprite.setScale(0.4);
    scene.tweens.add({ targets: this.sprite, scale: 1, duration: 240, ease: 'Back.Out' });
  }

  get attackStats(): TowerAttackStats | undefined {
    return this.config.levels[this.level - 1].attack;
  }

  get barracksStats(): BarracksStats | undefined {
    return this.config.levels[this.level - 1].barracks;
  }

  get upgradeCost(): number | null {
    return this.level < this.config.levels.length ? this.config.levels[this.level].cost : null;
  }

  get sellValue(): number {
    return sellRefund(this.invested, SELL_REFUND_RATIO);
  }

  private drawPips(): void {
    this.levelPips.clear();
    for (let i = 0; i < this.level; i++) {
      this.levelPips.fillStyle(0xf4c542);
      this.levelPips.fillCircle(this.spot.x - 10 + i * 10, this.spot.y + 30, 3.4);
      this.levelPips.lineStyle(1.5, 0x2c2118);
      this.levelPips.strokeCircle(this.spot.x - 10 + i * 10, this.spot.y + 30, 3.4);
    }
  }

  clampRally(p: Vec2): Vec2 {
    const radius = this.barracksStats?.rallyRadius ?? 150;
    const d = dist(p, this.spot);
    if (d <= radius) return p;
    const t = radius / d;
    return { x: this.spot.x + (p.x - this.spot.x) * t, y: this.spot.y + (p.y - this.spot.y) * t };
  }

  setRally(p: Vec2): void {
    if (this.type !== 'barracks') return;
    this.rally = this.clampRally(p);
    this.rallyFlag?.setPosition(this.rally.x, this.rally.y - 12);
    this.soldiers.forEach((s, i) => s.setRally(this.rally, i));
  }

  private spawnInitialSoldiers(): void {
    const stats = this.barracksStats;
    if (!stats) return;
    for (let i = 0; i < stats.soldierCount; i++) this.spawnSoldier(i);
  }

  private spawnSoldier(slotIndex: number): void {
    const stats = this.barracksStats;
    if (!stats) return;
    const s = new Soldier(this.scene, stats, this.rally, slotIndex);
    s.onDeath = (dead) => {
      const idx = this.soldiers.indexOf(dead);
      if (idx >= 0) this.soldiers.splice(idx, 1);
      this.respawnQueue.push(stats.soldierRespawn);
    };
    this.soldiers.push(s);
  }

  update(dt: number, enemies: readonly Enemy[], projectiles: Projectile[]): void {
    if (this.type === 'barracks') {
      // 士兵补员
      for (let i = this.respawnQueue.length - 1; i >= 0; i--) {
        this.respawnQueue[i] -= dt;
        if (this.respawnQueue[i] <= 0) {
          this.respawnQueue.splice(i, 1);
          const stats = this.barracksStats;
          if (stats && this.soldiers.length < stats.soldierCount) this.spawnSoldier(this.soldiers.length);
        }
      }
      for (const s of this.soldiers) s.update(dt, enemies);
      return;
    }
    const stats = this.attackStats;
    if (!stats) return;
    this.cooldown -= dt;
    if (this.cooldown > 0) return;
    // 索敌：范围内、存活、最接近城堡者优先
    let best: Enemy | null = null;
    for (const e of enemies) {
      if (e.dead) continue;
      if (dist(e.pos, this.spot) > stats.range) continue;
      if (!best || e.remaining < best.remaining) best = e;
    }
    if (!best) return;
    this.cooldown = stats.fireRate;
    const muzzle = this.muzzlePos();
    const texKey = this.type === 'arrow' ? 'proj-arrow' : this.type === 'mage' ? 'proj-magic' : 'proj-cannonball';
    projectiles.push(new Projectile(this.scene, muzzle, best, stats, texKey));
    if (this.type === 'arrow') Sfx.arrow();
    else if (this.type === 'mage') Sfx.magic();
    else Sfx.cannon();
    // 开火后坐动画
    this.scene.tweens.add({ targets: this.sprite, scaleY: 0.94, duration: 70, yoyo: true });
  }

  private muzzlePos(): Vec2 {
    if (this.type === 'mage') return { x: this.spot.x, y: this.spot.y - 62 };
    if (this.type === 'cannon') return { x: this.spot.x + 16, y: this.spot.y - 48 };
    return { x: this.spot.x, y: this.spot.y - 72 };
  }

  upgrade(): boolean {
    const cost = this.upgradeCost;
    if (cost === null) return false;
    this.level++;
    this.invested += cost;
    this.sprite.setTexture(`tower-${this.type}-${this.level}`);
    this.drawPips();
    Sfx.upgrade();
    this.scene.tweens.add({ targets: this.sprite, scale: 1.12, duration: 120, yoyo: true, ease: 'Quad.Out' });
    if (this.type === 'barracks') {
      const stats = this.barracksStats;
      if (stats) {
        for (const s of this.soldiers) s.setStats(stats);
        this.rally = this.clampRally(this.rally);
        while (this.soldiers.length + this.respawnQueue.length < stats.soldierCount) {
          this.spawnSoldier(this.soldiers.length);
        }
      }
    }
    return true;
  }

  /** 出售 / 关卡结束时清理 */
  destroy(): void {
    for (const s of this.soldiers) s.destroy();
    this.soldiers.length = 0;
    this.respawnQueue.length = 0;
    this.rallyFlag?.destroy();
    this.levelPips.destroy();
    this.sprite.destroy();
  }
}