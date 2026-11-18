import type { EnemyType, WaveConfig } from '../types';

export type WavePhase = 'idle' | 'break' | 'spawning' | 'allSpawned';

export interface SpawnOrder {
  enemy: EnemyType;
  path: number;
}

interface PendingSpawn extends SpawnOrder {
  t: number;
}

/**
 * 波次调度器（纯逻辑，可单测）：
 * idle → 手动开战 → spawning → break（倒计时自动开下一波，可提前召唤）→ … → allSpawned
 */
export class WaveManager {
  readonly totalWaves: number;
  /** 已开始的波次数（1 起） */
  waveIndex = 0;
  phase: WavePhase = 'idle';
  breakLeft = 0;
  private waves: readonly WaveConfig[];
  private breakSeconds: number;
  private pending: PendingSpawn[] = [];

  constructor(waves: readonly WaveConfig[], breakSeconds: number) {
    this.waves = waves;
    this.totalWaves = waves.length;
    this.breakSeconds = breakSeconds;
  }

  /** 立即开始下一波；返回是否成功 */
  callNext(): boolean {
    if (this.phase === 'spawning' || this.phase === 'allSpawned') return false;
    if (this.waveIndex >= this.totalWaves) return false;
    const wave = this.waves[this.waveIndex];
    this.waveIndex++;
    this.pending = [];
    for (const group of wave.groups) {
      for (let i = 0; i < group.count; i++) {
        this.pending.push({ t: group.delay + i * group.interval, enemy: group.enemy, path: group.path });
      }
    }
    this.pending.sort((a, b) => a.t - b.t);
    this.phase = 'spawning';
    this.breakLeft = 0;
    return true;
  }

  /** 推进 dt 秒，返回本帧应生成的敌人 */
  update(dt: number): SpawnOrder[] {
    const out: SpawnOrder[] = [];
    if (this.phase === 'break') {
      this.breakLeft -= dt;
      if (this.breakLeft <= 0) this.callNext();
    }
    if (this.phase === 'spawning') {
      const still: PendingSpawn[] = [];
      for (const p of this.pending) {
        p.t -= dt;
        if (p.t <= 0) out.push({ enemy: p.enemy, path: p.path });
        else still.push(p);
      }
      this.pending = still;
      if (this.pending.length === 0) {
        if (this.waveIndex >= this.totalWaves) {
          this.phase = 'allSpawned';
        } else {
          this.phase = 'break';
          this.breakLeft = this.breakSeconds;
        }
      }
    }
    return out;
  }
}