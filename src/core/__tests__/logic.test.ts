import { describe, expect, it } from 'vitest';
import { PathFollower, nearestPointOnPaths } from '../PathFollower';
import { computeDamage, earlyCallBonus, sellRefund, starsForLives } from '../Balance';
import { WaveManager } from '../WaveManager';
import type { WaveConfig } from '../../types';

describe('PathFollower', () => {
  const path = [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 100, y: 100 }
  ];

  it('沿折线匀速前进并更新坐标', () => {
    const f = new PathFollower(path);
    expect(f.totalLength).toBe(200);
    f.advance(50);
    expect(f.x).toBe(50);
    expect(f.y).toBe(0);
    f.advance(80);
    expect(f.x).toBe(100);
    expect(f.y).toBe(30);
  });

  it('到达终点后 finished 为真且不再越界', () => {
    const f = new PathFollower(path);
    expect(f.advance(250)).toBe(true);
    expect(f.finished).toBe(true);
    expect(f.x).toBe(100);
    expect(f.y).toBe(100);
    expect(f.remaining).toBe(0);
  });

  it('剩余距离随行进递减', () => {
    const f = new PathFollower(path);
    f.advance(120);
    expect(f.remaining).toBe(80);
  });
});

describe('nearestPointOnPaths', () => {
  it('找到路径上最近点（含垂足）', () => {
    const p = nearestPointOnPaths([[{ x: 0, y: 100 }, { x: 200, y: 100 }]], { x: 50, y: 40 });
    expect(p.x).toBe(50);
    expect(p.y).toBe(100);
  });
});

describe('computeDamage', () => {
  it('物理伤害受护甲减免', () => {
    expect(computeDamage(20, 'physical', 0.35, 0)).toBe(13);
  });
  it('魔法伤害无视护甲但受魔抗减免', () => {
    expect(computeDamage(20, 'magic', 0.35, 0)).toBe(20);
    expect(computeDamage(20, 'magic', 0, 0.2)).toBe(16);
  });
  it('至少造成 1 点伤害', () => {
    expect(computeDamage(1, 'physical', 0.9, 0)).toBe(1);
  });
});

describe('经济与星级', () => {
  it('出售按投入比例返还（向下取整）', () => {
    expect(sellRefund(180, 0.6)).toBe(108);
  });
  it('星级按剩余生命比例', () => {
    expect(starsForLives(20, 20)).toBe(3);
    expect(starsForLives(12, 20)).toBe(2);
    expect(starsForLives(5, 20)).toBe(1);
  });
  it('提前召唤奖励不为负', () => {
    expect(earlyCallBonus(10, 2)).toBe(20);
    expect(earlyCallBonus(-1, 2)).toBe(0);
  });
});

describe('WaveManager', () => {
  const waves: WaveConfig[] = [
    { groups: [{ enemy: 'goblin', count: 3, interval: 1, delay: 0, path: 0 }] },
    { groups: [{ enemy: 'wolf', count: 2, interval: 1, delay: 0, path: 1 }] }
  ];

  it('首波需手动召唤，按间隔出兵', () => {
    const wm = new WaveManager(waves, 10);
    expect(wm.phase).toBe('idle');
    expect(wm.update(5)).toHaveLength(0);
    expect(wm.callNext()).toBe(true);
    expect(wm.update(0.01).map((o) => o.enemy)).toEqual(['goblin']);
    expect(wm.update(1)).toHaveLength(1);
    expect(wm.update(1)).toHaveLength(1);
    expect(wm.phase).toBe('break');
  });

  it('间歇倒计时结束自动开下一波，最后一波后进入 allSpawned', () => {
    const wm = new WaveManager(waves, 10);
    wm.callNext();
    wm.update(2.5); // 第一波出完
    expect(wm.phase).toBe('break');
    wm.update(10); // 自动开第二波
    expect(wm.waveIndex).toBe(2);
    wm.update(2);
    expect(wm.phase).toBe('allSpawned');
    expect(wm.callNext()).toBe(false);
  });

  it('出兵顺序按时间排序且携带路径编号', () => {
    const wm = new WaveManager(
      [{ groups: [
        { enemy: 'wolf', count: 1, interval: 1, delay: 0, path: 1 },
        { enemy: 'goblin', count: 1, interval: 1, delay: 0.5, path: 0 }
      ] }],
      10
    );
    wm.callNext();
    const first = wm.update(0.4);
    expect(first.map((o) => o.enemy)).toEqual(['wolf']);
    const second = wm.update(0.2);
    expect(second.map((o) => o.path)).toEqual([0]);
  });
});