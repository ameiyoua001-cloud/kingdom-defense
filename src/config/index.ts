import towersData from './towers.json';
import enemiesData from './enemies.json';
import levelsData from './levels.json';
import type { EnemyConfig, EnemyType, LevelConfig, TowerConfig, TowerType } from '../types';

const towerList = towersData.towers as unknown as TowerConfig[];
const enemyList = enemiesData.enemies as unknown as EnemyConfig[];
const levelList = levelsData.levels as unknown as LevelConfig[];

export const TOWER_CONFIGS: Readonly<Record<TowerType, TowerConfig>> = Object.fromEntries(
  towerList.map((t) => [t.id, t])
) as Record<TowerType, TowerConfig>;

export const ENEMY_CONFIGS: Readonly<Record<EnemyType, EnemyConfig>> = Object.fromEntries(
  enemyList.map((e) => [e.id, e])
) as Record<EnemyType, EnemyConfig>;

export const LEVELS: readonly LevelConfig[] = levelList;

export const TOWER_ORDER: readonly TowerType[] = ['arrow', 'mage', 'cannon', 'barracks'];

export function getLevel(id: string): LevelConfig {
  const level = levelList.find((l) => l.id === id);
  if (!level) throw new Error(`未知关卡: ${id}`);
  return level;
}