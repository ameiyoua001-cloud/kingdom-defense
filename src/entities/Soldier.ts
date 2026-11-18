import Phaser from 'phaser';
import type { BarracksStats, Vec2 } from '../types';
import { dist } from '../core/PathFollower';
import { Sfx } from '../core/Sfx';
import type { Enemy } from './Enemy';

const ENGAGE_RADIUS = 46;
const CHASE_LEASH = 110;
const SOLDIER_SPEED = 95;
const MELEE_RANGE = 26;

/** 王国士兵：驻守集结点，拦截路过的敌人并近战 */
export class Soldier {
  readonly sprite: Phaser.GameObjects.Image;
  private hpBar: Phaser.GameObjects.Graphics;
  private scene: Phaser.Scene;
  private stats: BarracksStats;
  hp: number;
  dead = false;
  /** 集结点（三个士兵围绕集结点小三角站位） */
  rally: Vec2;
  private slot: Vec2;
  target: Enemy | null = null;
  private attackTimer = 0;
  onDeath: ((s: Soldier) => void) | null = null;

  constructor(scene: Phaser.Scene, stats: BarracksStats, rally: Vec2, slotIndex: number) {
    this.scene = scene;
    this.stats = stats;
    this.hp = stats.soldierHp;
    this.rally = rally;
    const angle = (slotIndex * Math.PI * 2) / 3 - Math.PI / 2;
    this.slot = { x: rally.x + Math.cos(angle) * 16, y: rally.y + Math.sin(angle) * 12 };
    this.sprite = scene.add.image(this.slot.x, this.slot.y, 'soldier');
    this.sprite.setDepth(this.slot.y);
    this.hpBar = scene.add.graphics().setDepth(1000);
  }

  get x(): number {
    return this.sprite.x;
  }

  get y(): number {
    return this.sprite.y;
  }

  setStats(stats: BarracksStats): void {
    const ratio = this.hp / this.stats.soldierHp;
    this.stats = stats;
    this.hp = Math.round(stats.soldierHp * ratio);
  }

  setRally(rally: Vec2, slotIndex: number): void {
    this.rally = rally;
    const angle = (slotIndex * Math.PI * 2) / 3 - Math.PI / 2;
    this.slot = { x: rally.x + Math.cos(angle) * 16, y: rally.y + Math.sin(angle) * 12 };
    this.releaseTarget();
  }

  update(dt: number, enemies: readonly Enemy[]): void {
    if (this.dead) return;
    // 目标失效则释放
    if (this.target && (this.target.dead || this.target.blocker !== this)) this.target = null;
    // 搜索可拦截敌人
    if (!this.target) {
      let best: Enemy | null = null;
      let bestD = Infinity;
      for (const e of enemies) {
        if (e.dead || e.blocker) continue;
        const dRally = dist(e.pos, this.rally);
        if (dRally > ENGAGE_RADIUS) continue;
        const dSelf = dist(e.pos, { x: this.x, y: this.y });
        if (dSelf < bestD) {
          bestD = dSelf;
          best = e;
        }
      }
      if (best) {
        this.target = best;
        best.blocker = this;
      }
    }

    let dest: Vec2 = this.slot;
    if (this.target) {
      // 追击超出拴绳范围则放弃
      if (dist(this.target.pos, this.rally) > CHASE_LEASH) {
        this.releaseTarget();
      } else {
        dest = this.target.pos;
      }
    }

    const d = dist({ x: this.x, y: this.y }, dest);
    const stopDist = this.target ? MELEE_RANGE : 3;
    if (d > stopDist) {
      const step = Math.min(SOLDIER_SPEED * dt, d - stopDist);
      const dx = (dest.x - this.x) / d;
      const dy = (dest.y - this.y) / d;
      this.sprite.x += dx * step;
      this.sprite.y += dy * step;
      this.sprite.setFlipX(dx < -0.05);
    } else if (this.target) {
      // 近战攻击
      this.attackTimer -= dt;
      if (this.attackTimer <= 0) {
        this.attackTimer = this.stats.soldierAttackRate;
        this.target.takeDamage(this.stats.soldierDamage, 'physical');
        this.scene.tweens.add({
          targets: this.sprite,
          x: this.sprite.x + (this.target.x - this.x) * 0.18,
          duration: 80,
          yoyo: true
        });
      }
    }
    this.sprite.setDepth(this.sprite.y);
    this.drawHpBar();
  }

  private drawHpBar(): void {
    this.hpBar.clear();
    if (this.hp >= this.stats.soldierHp) return;
    const w = 26;
    const x = this.x - w / 2;
    const y = this.y - 30;
    this.hpBar.fillStyle(0x2c2118, 0.85);
    this.hpBar.fillRoundedRect(x - 1, y - 1, w + 2, 6, 3);
    this.hpBar.fillStyle(0x5fae4c);
    this.hpBar.fillRoundedRect(x, y, w * Math.max(0, this.hp / this.stats.soldierHp), 4, 2);
  }

  releaseTarget(): void {
    if (this.target && this.target.blocker === this) this.target.blocker = null;
    this.target = null;
  }

  takeDamage(amount: number): void {
    if (this.dead) return;
    this.hp -= amount;
    this.sprite.setTintFill(0xff9a94);
    this.scene.time.delayedCall(70, () => {
      if (!this.dead) this.sprite.clearTint();
    });
    if (this.hp <= 0) this.die();
  }

  /** 外部强制移除（出售兵营 / 关卡结束） */
  destroy(): void {
    this.dead = true;
    this.onDeath = null;
    this.releaseTarget();
    this.hpBar.destroy();
    this.sprite.destroy();
  }

  private die(): void {
    this.dead = true;
    this.releaseTarget();
    Sfx.soldierDie();
    this.hpBar.destroy();
    this.scene.tweens.add({
      targets: this.sprite,
      alpha: 0,
      angle: 90,
      y: this.sprite.y + 8,
      duration: 320,
      onComplete: () => this.sprite.destroy()
    });
    this.onDeath?.(this);
  }
}