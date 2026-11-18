import type { DamageKind } from '../types';

/**
 * 伤害结算（纯函数，可单测）：
 * - physical 受护甲减免
 * - magic 受魔抗减免
 * - explosive 视为物理溅射，同样受护甲减免
 * 至少造成 1 点伤害。
 */
export function computeDamage(base: number, kind: DamageKind, armor: number, magicResist: number): number {
  const reduction = kind === 'magic' ? magicResist : armor;
  const clamped = Math.max(0, Math.min(0.9, reduction));
  return Math.max(1, Math.round(base * (1 - clamped)));
}

/** 出售返还金额 */
export function sellRefund(totalInvested: number, ratio: number): number {
  return Math.floor(totalInvested * ratio);
}

/** 根据剩余生命比例计算星级（1~3） */
export function starsForLives(livesLeft: number, livesMax: number): number {
  const ratio = livesMax <= 0 ? 0 : livesLeft / livesMax;
  if (ratio >= 0.9) return 3;
  if (ratio >= 0.5) return 2;
  return 1;
}

/** 提前召唤下一波的金币奖励 */
export function earlyCallBonus(secondsLeft: number, goldPerSec: number): number {
  return Math.max(0, Math.floor(secondsLeft * goldPerSec));
}