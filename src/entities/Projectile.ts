import Phaser from 'phaser';
import type { DamageKind, TowerAttackStats } from '../types';
import { dist } from '../core/PathFollower';
import { Sfx } from '../core/Sfx';
import type { Enemy } from './Enemy';

/** 追踪弹道：命中后结算伤害，火炮附带范围溅射 */
export class Projectile {
  private sprite: Phaser.GameObjects.Image;
  private scene: Phaser.Scene;
  private target: Enemy;
  private stats: TowerAttackStats;
  private lastPos: { x: number; y: number };
  done = false;

  constructor(scene: Phaser.Scene, from: { x: number; y: number }, target: Enemy, stats: TowerAttackStats, texture: string) {
    this.scene = scene;
    this.target = target;
    this.stats = stats;
    this.lastPos = { x: target.x, y: target.y };
    this.sprite = scene.add.image(from.x, from.y, texture).setDepth(960);
    if (texture === 'proj-magic') {
      scene.tweens.add({ targets: this.sprite, scale: 1.25, duration: 160, yoyo: true, repeat: -1 });
    }
  }

  update(dt: number, enemies: readonly Enemy[]): void {
    if (this.done) return;
    if (!this.target.dead) {
      this.lastPos = { x: this.target.x, y: this.target.y };
    } else if (this.stats.damageKind !== 'explosive') {
      // 目标已死亡：非溅射弹直接消散
      this.finish(false);
      return;
    }
    const d = dist({ x: this.sprite.x, y: this.sprite.y }, this.lastPos);
    const step = this.stats.projectileSpeed * dt;
    if (d <= Math.max(step, 10)) {
      this.hit(enemies);
      return;
    }
    const dx = (this.lastPos.x - this.sprite.x) / d;
    const dy = (this.lastPos.y - this.sprite.y) / d;
    this.sprite.x += dx * step;
    this.sprite.y += dy * step;
    if (this.stats.damageKind === 'physical') {
      this.sprite.setRotation(Math.atan2(dy, dx));
    }
  }

  private hit(enemies: readonly Enemy[]): void {
    const kind: DamageKind = this.stats.damageKind;
    if (kind === 'explosive') {
      const radius = this.stats.splash ?? 50;
      for (const e of enemies) {
        if (e.dead) continue;
        if (dist(e.pos, this.lastPos) <= radius) e.takeDamage(this.stats.damage, 'explosive');
      }
      this.explodeFx(this.lastPos.x, this.lastPos.y, radius);
      Sfx.explosion();
    } else {
      if (!this.target.dead) this.target.takeDamage(this.stats.damage, kind);
      this.impactFx(this.lastPos.x, this.lastPos.y, kind === 'magic' ? 0xc79bf0 : 0xd9c294);
    }
    this.finish(true);
  }

  private explodeFx(x: number, y: number, radius: number): void {
    const ring = this.scene.add.circle(x, y, 10, 0xffb347, 0.55).setDepth(970);
    this.scene.tweens.add({
      targets: ring,
      scale: radius / 10,
      alpha: 0,
      duration: 260,
      onComplete: () => ring.destroy()
    });
    const emitter = this.scene.add.particles(x, y, 'particle', {
      speed: { min: 40, max: 140 },
      scale: { start: 1.1, end: 0 },
      lifespan: 380,
      tint: [0xffb347, 0xd9463e, 0x6a6f7d],
      emitting: false
    });
    emitter.setDepth(971);
    emitter.explode(12);
    this.scene.time.delayedCall(500, () => emitter.destroy());
  }

  private impactFx(x: number, y: number, tint: number): void {
    const emitter = this.scene.add.particles(x, y, 'particle', {
      speed: { min: 15, max: 60 },
      scale: { start: 0.55, end: 0 },
      lifespan: 240,
      tint,
      emitting: false
    });
    emitter.setDepth(971);
    emitter.explode(4);
    this.scene.time.delayedCall(350, () => emitter.destroy());
  }

  private finish(_hit: boolean): void {
    this.done = true;
    this.scene.tweens.killTweensOf(this.sprite);
    this.sprite.destroy();
  }
}