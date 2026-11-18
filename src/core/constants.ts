/** 游戏逻辑分辨率（16:9） */
export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

/** 出售返还比例 */
export const SELL_REFUND_RATIO = 0.6;

/** 提前召唤下一波的奖励金币（每剩余秒） */
export const EARLY_CALL_GOLD_PER_SEC = 2;

/** 波次间歇（秒） */
export const WAVE_BREAK_SECONDS = 14;

/** 三星生命阈值比例（相对初始生命） */
export const STAR_THRESHOLDS = { three: 0.9, two: 0.5 } as const;

/** 统一文字样式 */
export const FONT_FAMILY = '"Noto Sans SC","PingFang SC","Microsoft YaHei",sans-serif';

export const COLORS = {
  parchment: 0xf2e3c2,
  parchmentDark: 0xd9c294,
  ink: 0x3a2a1a,
  gold: 0xf4c542,
  goldDark: 0xb8860b,
  red: 0xd9463e,
  green: 0x5fae4c,
  blue: 0x4f8fdd,
  wood: 0x8a5a33,
  woodDark: 0x5e3d20,
  stone: 0x9a958c
} as const;

/** 场景键 */
export const SCENES = {
  boot: 'Boot',
  menu: 'MainMenu',
  world: 'WorldMap',
  battle: 'Battle',
  hud: 'HUD'
} as const;