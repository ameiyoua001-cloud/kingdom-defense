import Phaser from 'phaser';
import type { EnemyConfig, Vec2 } from '../types';
import { computeDamage } from '../core/Balance';
import { PathFollower } from '../core/PathFollower';
import { Sfx } from '../core/Sfx';
import type { Soldier } from './Soldier';

/** 敌人实体：沿折线路径行进，可被士兵拦截进入近战 */
export class Enemy {
  readonly config: EnemyConfig;
  readonly follower: PathFollower;
  readonly sprite: Phaser.GameObjects.Image;
  readonly hpBar: Phaser.GameObjects.Graphics;
  hp: number;
  dead = false;
  leaked = false;
  /** 当前拦截该敌人的士兵 */
  blocker: Soldier | null = null;
  private attackTimer = 0;
  private bobSeed = Math.random() * Math.PI * 2;
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene, config: EnemyConfig, path: readonly Vec2[]) {
    this.scene = scene;
    this.config = config;
    this.hp = config.hp;
    this.follower = new PathFollower(path);
    this.sprite = scene.add.image(this.follower.x, this.follower.y, config.id).setScale(config.scale);
    this.sprite.setDepth(this.follower.y);
    this.hpBar = scene.add.graphics().setDepth(1000);
    // 出场淡入
    this.sprite.setAlpha(0);
    scene.tweens.add({ targets: this.sprite, alpha: 1, duration: 250 });
  }

  get x(): number {
    return this.follower.x;
  }

  get y(): number {
    return this.follower.y;
  }

  get pos(): Vec2 {
    return { x: this.follower.x, y: this.follower.y };
  }

  /** 剩余路程越小越接近城堡（炮塔优先目标） */
  get remaining(): number {
    return this.follower.remaining;
  }

  update(dt: number, time: number): void {
    if (this.dead) return;
    if (this.blocker && !this.blocker.dead) {
      // 近战：站定攻击士兵
      this.attackTimer -= dt;
      if (this.attackTimer <= 0) {
        this.attackTimer = this.config.attackRate;
        this.blocker.takeDamage(this.config.damage);
        // 攻击前扑动画
        const dx = this.blocker.x - this.x;
        const dy = this.blocker.y - this.y;
        const len = Math.hypot(dx, dy) || 1;
        this.scene.tweens.add({
          targets: this.sprite,
          x: this.sprite.x + (dx / len) * 8,
          y: this.sprite.y + (dy / len) * 8,
          duration: 90,
          yoyo: true
        });
      }
    } else {
      this.blocker = null;
      const arrived = this.follower.advance(this.config.speed * dt);
      if (arrived) {
        this.leaked = true;
        this.remove();
        return;
      }
    }
    // 朝向与行走摆动
    const facingLeft = Math.cos(this.follower.angle) < -0.1;
    this.sprite.setFlipX(facingLeft);
    if (!this.blocker) {
      this.sprite.y = this.follower.y + Math.sin(time * 0.012 + this.bobSeed) * 2.4;
    }
    this.sprite.x = this.follower.x;
    this.sprite.setDepth(this.follower.y);
    this.drawHpBar();
  }

  private drawHpBar(): void {
    this.hpBar.clear();
    if (this.hp >= this.config.hp) return;
    const w = this.config.id === 'ogre' ? 46 : 30;
    const x = this.follower.x - w / 2;
    const y = this.follower.y - this.sprite.displayHeight / 2 - 10;
    this.hpBar.fillStyle(0x2c2118, 0.85);
    this.hpBar.fillRoundedRect(x - 1, y - 1, w + 2, 7, 3);
    this.hpBar.fillStyle(0xd9463e);
    this.hpBar.fillRoundedRect(x, y, w * Math.max(0, this.hp / this.config.hp), 5, 2);
  }

  takeDamage(base: number, kind: 'physical' | 'magic' | 'explosive'): void {
    if (this.dead) return;
    const dmg = computeDamage(base, kind, this.config.armor, this.config.magicResist);
    this.hp -= dmg;
    // 受击闪白
    this.sprite.setTintFill(0xffffff);
    this.scene.time.delayedCall(60, () => {
      if (!this.dead) this.sprite.clearTint();
    });
    if (this.hp <= 0) this.die();
  }

  private die(): void {
    this.dead = true;
    if (this.blocker) {
      this.blocker.releaseTarget();
      this.blocker = null;
    }
    Sfx.hit();
    const { x, y } = this;
    this.scene.tweens.add({
      targets: this.sprite,
      alpha: 0,
      scale: this.config.scale * 0.6,
      y: y + 6,
      duration: 260,
      onComplete: () => this.sprite.destroy()
    });
    this.hpBar.destroy();
    // 消散粒子
    const emitter = this.scene.add.particles(x, y, 'particle', {
      speed: { min: 20, max: 70 },
      scale: { start: 0.7, end: 0 },
      lifespan: 350,
      quantity: 6,
      tint: 0xd9c294,
      emitting: false
    });
    emitter.setDepth(950);
    emitter.explode(6);
    this.scene.time.delayedCall(450, () => emitter.destroy());
  }

  /** 漏过（到达城堡）时移除，不播死亡动画 */
  private remove(): void {
    this.dead = true;
    if (this.blocker) {
      this.blocker.releaseTarget();
      this.blocker = null;
    }
    this.sprite.destroy();
    this.hpBar.destroy();
  }

  destroy(): void {
    if (!this.dead) {
      this.dead = true;
      this.sprite.destroy();
      this.hpBar.destroy();
    }
  }
}