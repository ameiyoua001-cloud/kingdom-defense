/** 关卡与数值配置的类型定义（对应 src/config/*.json） */

export type TowerType = 'arrow' | 'mage' | 'cannon' | 'barracks';
export type EnemyType = 'goblin' | 'wolf' | 'ogre';
export type DamageKind = 'physical' | 'magic' | 'explosive';

export interface Vec2 {
  x: number;
  y: number;
}

/** 炮塔单级数值（攻击塔） */
export interface TowerAttackStats {
  damage: number;
  damageKind: DamageKind;
  /** 攻击间隔（秒） */
  fireRate: number;
  range: number;
  projectileSpeed: number;
  /** 溅射半径，0 表示无溅射 */
  splash?: number;
}

/** 兵营单级数值 */
export interface BarracksStats {
  soldierHp: number;
  soldierDamage: number;
  soldierAttackRate: number;
  soldierRespawn: number;
  soldierCount: number;
  /** 集结点可设置范围（以塔为圆心） */
  rallyRadius: number;
}

export interface TowerLevelConfig {
  cost: number;
  attack?: TowerAttackStats;
  barracks?: BarracksStats;
}

export interface TowerConfig {
  id: TowerType;
  name: string;
  description: string;
  levels: TowerLevelConfig[];
}

export interface EnemyConfig {
  id: EnemyType;
  name: string;
  hp: number;
  /** 移动速度（像素/秒） */
  speed: number;
  /** 物理减伤 0~1 */
  armor: number;
  /** 魔法减伤 0~1 */
  magicResist: number;
  bounty: number;
  /** 漏过时扣除的生命 */
  livesCost: number;
  /** 被士兵拦截时的攻击力 */
  damage: number;
  attackRate: number;
  /** 贴图缩放 */
  scale: number;
}

export interface WaveGroup {
  enemy: EnemyType;
  count: number;
  /** 组内出兵间隔（秒） */
  interval: number;
  /** 相对波次开始的延迟（秒） */
  delay: number;
  path: number;
}

export interface WaveConfig {
  groups: WaveGroup[];
}

export interface LevelConfig {
  id: string;
  name: string;
  subtitle: string;
  gold: number;
  lives: number;
  paths: Vec2[][];
  buildSpots: Vec2[];
  castle: Vec2;
  waves: WaveConfig[];
}