/** 本地存档（LocalStorage），带容错，隐私模式等不可用场景自动降级为内存存档 */

export interface LevelProgress {
  stars: number;
  bestLives: number;
}

export interface SaveData {
  version: number;
  sound: boolean;
  levels: Record<string, LevelProgress>;
}

const STORAGE_KEY = 'kingdom-defense-save-v1';

function defaultSave(): SaveData {
  return { version: 1, sound: true, levels: {} };
}

class SaveManagerImpl {
  private data: SaveData;

  constructor() {
    this.data = this.load();
  }

  private load(): SaveData {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultSave();
      const parsed = JSON.parse(raw) as Partial<SaveData>;
      if (typeof parsed !== 'object' || parsed === null) return defaultSave();
      return {
        version: 1,
        sound: parsed.sound !== false,
        levels: typeof parsed.levels === 'object' && parsed.levels !== null ? parsed.levels : {}
      };
    } catch {
      return defaultSave();
    }
  }

  private persist(): void {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch {
      // 存储不可用时静默降级，仅保留内存数据
    }
  }

  get sound(): boolean {
    return this.data.sound;
  }

  setSound(on: boolean): void {
    this.data.sound = on;
    this.persist();
  }

  getLevelProgress(levelId: string): LevelProgress | undefined {
    return this.data.levels[levelId];
  }

  /** 通关后记录成绩（只保留更好的星级与生命） */
  recordVictory(levelId: string, stars: number, livesLeft: number): void {
    const prev = this.data.levels[levelId];
    this.data.levels[levelId] = {
      stars: Math.max(prev?.stars ?? 0, stars),
      bestLives: Math.max(prev?.bestLives ?? 0, livesLeft)
    };
    this.persist();
  }

  /** 关卡是否解锁：第一关默认解锁，其余需要上一关至少一星 */
  isUnlocked(levelIds: readonly string[], index: number): boolean {
    if (index <= 0) return true;
    const prev = this.data.levels[levelIds[index - 1]];
    return (prev?.stars ?? 0) >= 1;
  }

  reset(): void {
    this.data = defaultSave();
    this.persist();
  }
}

export const SaveManager = new SaveManagerImpl();