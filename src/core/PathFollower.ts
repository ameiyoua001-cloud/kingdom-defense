import type { Vec2 } from '../types';

/**
 * 折线路径跟随器（纯逻辑，无引擎依赖，可单测）。
 * 敌人沿路径点匀速前进，支持暂停（被士兵拦截时）。
 */
export class PathFollower {
  readonly points: readonly Vec2[];
  readonly totalLength: number;
  private segLengths: number[] = [];
  /** 已走过的距离 */
  distance = 0;
  x: number;
  y: number;
  /** 当前朝向（弧度） */
  angle = 0;
  finished = false;

  constructor(points: readonly Vec2[]) {
    if (points.length < 2) throw new Error('路径至少需要两个点');
    this.points = points;
    let total = 0;
    for (let i = 0; i < points.length - 1; i++) {
      const len = Math.hypot(points[i + 1].x - points[i].x, points[i + 1].y - points[i].y);
      this.segLengths.push(len);
      total += len;
    }
    this.totalLength = total;
    this.x = points[0].x;
    this.y = points[0].y;
    this.angle = Math.atan2(points[1].y - points[0].y, points[1].x - points[0].x);
  }

  /** 前进 dist 像素，返回是否到达终点 */
  advance(dist: number): boolean {
    if (this.finished) return true;
    this.distance = Math.min(this.distance + dist, this.totalLength);
    this.syncPosition();
    if (this.distance >= this.totalLength) this.finished = true;
    return this.finished;
  }

  private syncPosition(): void {
    let rest = this.distance;
    for (let i = 0; i < this.segLengths.length; i++) {
      const len = this.segLengths[i];
      const a = this.points[i];
      const b = this.points[i + 1];
      if (rest <= len || i === this.segLengths.length - 1) {
        const t = len === 0 ? 0 : Math.min(rest / len, 1);
        this.x = a.x + (b.x - a.x) * t;
        this.y = a.y + (b.y - a.y) * t;
        this.angle = Math.atan2(b.y - a.y, b.x - a.x);
        return;
      }
      rest -= len;
    }
  }

  /** 距终点的剩余距离（用于“最接近城堡”的目标选择） */
  get remaining(): number {
    return this.totalLength - this.distance;
  }
}

/** 两点距离 */
export function dist(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** 求路径上距离某点最近的位置（用于兵营默认集结点） */
export function nearestPointOnPaths(paths: readonly (readonly Vec2[])[], p: Vec2): Vec2 {
  let best: Vec2 = paths[0][0];
  let bestD = Infinity;
  for (const path of paths) {
    for (let i = 0; i < path.length - 1; i++) {
      const a = path[i];
      const b = path[i + 1];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const lenSq = dx * dx + dy * dy;
      const t = lenSq === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq));
      const q = { x: a.x + dx * t, y: a.y + dy * t };
      const d = dist(q, p);
      if (d < bestD) {
        bestD = d;
        best = q;
      }
    }
  }
  return best;
}