import Phaser from 'phaser';
import type { EnemyType, LevelConfig, TowerType, Vec2 } from '../types';
import { ENEMY_CONFIGS, TOWER_CONFIGS, getLevel } from '../config';
import {
  EARLY_CALL_GOLD_PER_SEC,
  GAME_HEIGHT,
  GAME_WIDTH,
  SCENES,
  WAVE_BREAK_SECONDS
} from '../core/constants';
import { earlyCallBonus, starsForLives } from '../core/Balance';
import { SaveManager } from '../core/SaveManager';
import { Sfx } from '../core/Sfx';
import { WaveManager } from '../core/WaveManager';
import { generateBattleBackground } from '../art/ArtGen';
import { Enemy } from '../entities/Enemy';
import { Projectile } from '../entities/Projectile';
import { Tower } from '../entities/Tower';
import { floatText, toast } from '../ui/Widgets';
import { HUDScene, type BattleAPI, type HudState } from './HUDScene';

interface BuildSpot {
  pos: Vec2;
  image: Phaser.GameObjects.Image;
  tower: Tower | null;
}

/** 森林战斗场景：第一阶段全部玩法的运行时载体 */
export class BattleScene extends Phaser.Scene {
  private level!: LevelConfig;
  private gold = 0;
  private lives = 0;
  private livesMax = 0;
  private enemies: Enemy[] = [];
  private towers: Tower[] = [];
  private projectiles: Projectile[] = [];
  private spots: BuildSpot[] = [];
  private waveManager!: WaveManager;
  private speed = 1;
  private manualPaused = false;
  private gameOver = false;
  /** 正在为兵营设置集结点 */
  private rallyTower: Tower | null = null;
  private rangeGfx!: Phaser.GameObjects.Graphics;
  private rallyGfx!: Phaser.GameObjects.Graphics;
  private hud!: HUDScene;
  private lastWaveAnnounced = 0;
  private goldText!: Phaser.GameObjects.Text;
  private livesText!: Phaser.GameObjects.Text;
  private waveText!: Phaser.GameObjects.Text;

  constructor() {
    super(SCENES.battle);
  }

  init(data: { levelId?: string }): void {
    this.level = getLevel(data?.levelId ?? 'forest-1');
    this.gold = this.level.gold;
    this.lives = this.level.lives;
    this.livesMax = this.level.lives;
    this.enemies = [];
    this.towers = [];
    this.projectiles = [];
    this.spots = [];
    this.speed = 1;
    this.manualPaused = false;
    this.gameOver = false;
    this.rallyTower = null;
    this.lastWaveAnnounced = 0;
    this.waveManager = new WaveManager(this.level.waves, WAVE_BREAK_SECONDS);
  }

  create(): void {
    generateBattleBackground(this, this.level);
    this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, `bg-battle-${this.level.id}`);
    // 城堡
    const castle = this.add.image(this.level.castle.x, this.level.castle.y - 40, 'castle');
    castle.setOrigin(0.5, 0.72).setDepth(this.level.castle.y + 40);

    // 出兵口标记
    for (const path of this.level.paths) {
      const start = path[0];
      const g = this.add.graphics().setDepth(5);
      g.fillStyle(0x2c2118, 0.5);
      g.fillEllipse(start.x, start.y, 70, 30);
      const arrow = this.add.triangle(start.x, start.y, 0, 0, 22, 10, 0, 20, 0xd9463e).setDepth(6);
      arrow.setAlpha(0.9);
      this.tweens.add({ targets: arrow, alpha: 0.35, duration: 700, yoyo: true, repeat: -1 });
    }

    // 建造地基
    for (const pos of this.level.buildSpots) {
      const image = this.add.image(pos.x, pos.y, 'spot').setDepth(pos.y - 1);
      const spot: BuildSpot = { pos, image, tower: null };
      image.setInteractive({ useHandCursor: true });
      image.on('pointerup', () => this.onSpotClicked(spot));
      this.spots.push(spot);
    }

    this.rangeGfx = this.add.graphics().setDepth(1500);
    this.rallyGfx = this.add.graphics().setDepth(1500);

    // 顶部信息条（战斗场景自绘，HUD 只放交互按钮）
    const bar = this.add.graphics().setDepth(2000);
    bar.fillStyle(0x2c2118, 0.82);
    bar.fillRoundedRect(12, 10, 460, 52, 12);
    this.add.image(44, 36, 'icon-coin').setDepth(2001).setScale(1.1);
    this.goldText = this.add.text(64, 36, `${this.gold}`, this.hudTextStyle('#f4c542')).setOrigin(0, 0.5).setDepth(2001);
    this.add.image(180, 36, 'icon-heart').setDepth(2001).setScale(1.1);
    this.livesText = this.add.text(200, 36, `${this.lives}`, this.hudTextStyle('#ff8a80')).setOrigin(0, 0.5).setDepth(2001);
    this.waveText = this.add.text(320, 36, '', this.hudTextStyle('#f2e3c2')).setOrigin(0, 0.5).setDepth(2001);

    // 全局点击：取消菜单 / 设置集结点
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      Sfx.unlock();
      if (this.gameOver) return;
      if (this.rallyTower) {
        const p = this.rallyTower.clampRally({ x: pointer.worldX, y: pointer.worldY });
        this.rallyTower.setRally(p);
        this.rallyTower = null;
        this.rallyGfx.clear();
        toast(this, p.x, p.y - 40, '集结点已设置', '#d6f0c8');
        return;
      }
      if (over.length === 0) this.hud.closeMenus();
    });

    // 启动 HUD 覆盖场景
    this.scene.launch(SCENES.hud);
    this.hud = this.scene.get(SCENES.hud) as HUDScene;
    this.hud.bind(this.makeApi());
    this.cameras.main.fadeIn(350, 20, 14, 8);
    this.toastCenter('点击木牌地基建造防御塔，然后召唤第一波敌人！');
  }

  private hudTextStyle(color: string): Phaser.Types.GameObjects.Text.TextStyle {
    return { fontFamily: '"Noto Sans SC","PingFang SC","Microsoft YaHei",sans-serif', fontSize: '24px', fontStyle: 'bold', color };
  }

  private toastCenter(msg: string): void {
    toast(this, GAME_WIDTH / 2, 120, msg, '#f7ecd8');
  }

  /* ---------------- HUD API ---------------- */

  private makeApi(): BattleAPI {
    return {
      getState: (): HudState => ({
        gold: this.gold,
        lives: this.lives,
        wave: this.waveManager.waveIndex,
        totalWaves: this.waveManager.totalWaves,
        phase: this.waveManager.phase,
        breakLeft: this.waveManager.breakLeft,
        speed: this.speed,
        paused: this.manualPaused,
        gameOver: this.gameOver
      }),
      callWave: () => this.callWave(),
      toggleSpeed: () => {
        this.speed = this.speed === 1 ? 2 : 1;
        this.hud.refresh();
      },
      togglePause: () => {
        this.manualPaused = !this.manualPaused;
        this.hud.refresh();
      },
      restart: () => {
        this.scene.stop(SCENES.hud);
        this.scene.restart({ levelId: this.level.id });
      },
      toWorldMap: () => {
        this.scene.stop(SCENES.hud);
        this.scene.start(SCENES.world);
      },
      openBuildMenu: (spotIndex: number) => {
        const spot = this.spots[spotIndex];
        if (spot) this.openBuildMenu(spot);
      },
      openTowerMenu: (spotIndex: number) => {
        const spot = this.spots[spotIndex];
        if (spot?.tower) this.openTowerMenu(spot);
      },
      buildTower: (spotIndex: number, type: TowerType) => {
        const spot = this.spots[spotIndex];
        if (spot) this.buildTower(spot, type);
      },
      upgradeTower: (spotIndex: number) => {
        const spot = this.spots[spotIndex];
        if (spot?.tower) this.upgradeTower(spot);
      },
      sellTower: (spotIndex: number) => {
        const spot = this.spots[spotIndex];
        if (spot?.tower) this.sellTower(spot);
      },
      setRally: (spotIndex: number) => {
        const spot = this.spots[spotIndex];
        if (spot?.tower?.type === 'barracks') this.startRallyMode(spot.tower);
      },
      spotScreenPos: (spotIndex: number) => this.spots[spotIndex]?.pos ?? { x: 640, y: 360 },
      towerInfo: (spotIndex: number) => {
        const t = this.spots[spotIndex]?.tower;
        if (!t) return null;
        return { type: t.type, level: t.level, upgradeCost: t.upgradeCost, sellValue: t.sellValue };
      },
      canAfford: (cost: number) => this.gold >= cost
    };
  }

  /* ---------------- 交互 ---------------- */

  private onSpotClicked(spot: BuildSpot): void {
    if (this.gameOver || this.manualPaused) return;
    Sfx.unlock();
    this.hud.closeMenus();
    if (spot.tower) this.openTowerMenu(spot);
    else this.openBuildMenu(spot);
  }

  private openBuildMenu(spot: BuildSpot): void {
    const idx = this.spots.indexOf(spot);
    this.hud.showBuildMenu(idx, spot.pos, this.gold);
  }

  private openTowerMenu(spot: BuildSpot): void {
    const tower = spot.tower;
    if (!tower) return;
    const idx = this.spots.indexOf(spot);
    this.drawRange(tower);
    this.hud.showTowerMenu(idx, spot.pos);
  }

  private drawRange(tower: Tower): void {
    this.rangeGfx.clear();
    const stats = tower.attackStats;
    if (stats) {
      this.rangeGfx.fillStyle(0xffffff, 0.12);
      this.rangeGfx.fillCircle(tower.spot.x, tower.spot.y, stats.range);
      this.rangeGfx.lineStyle(2, 0xffffff, 0.5);
      this.rangeGfx.strokeCircle(tower.spot.x, tower.spot.y, stats.range);
    } else if (tower.barracksStats) {
      this.rangeGfx.lineStyle(2, 0xf4c542, 0.5);
      this.rangeGfx.strokeCircle(tower.spot.x, tower.spot.y, tower.barracksStats.rallyRadius);
      this.rangeGfx.fillStyle(0xf4c542, 0.8);
      this.rangeGfx.fillCircle(tower.rally.x, tower.rally.y, 5);
    }
  }

  private buildTower(spot: BuildSpot, type: TowerType): void {
    if (spot.tower || this.gameOver) return;
    const cost = TOWER_CONFIGS[type].levels[0].cost;
    if (this.gold < cost) {
      Sfx.error();
      toast(this, spot.pos.x, spot.pos.y - 70, '金币不足！');
      return;
    }
    this.gold -= cost;
    spot.tower = new Tower(this, type, spot.pos, this.level.paths);
    this.towers.push(spot.tower);
    spot.image.setVisible(false);
    Sfx.build();
    this.hud.closeMenus();
    this.updateTopBar();
  }

  private upgradeTower(spot: BuildSpot): void {
    const tower = spot.tower;
    if (!tower || this.gameOver) return;
    const cost = tower.upgradeCost;
    if (cost === null) return;
    if (this.gold < cost) {
      Sfx.error();
      toast(this, spot.pos.x, spot.pos.y - 90, '金币不足！');
      return;
    }
    this.gold -= cost;
    tower.upgrade();
    floatText(this, spot.pos.x, spot.pos.y - 80, '升级！', '#d6f0c8');
    this.hud.closeMenus();
    this.updateTopBar();
  }

  private sellTower(spot: BuildSpot): void {
    const tower = spot.tower;
    if (!tower || this.gameOver) return;
    const refund = tower.sellValue;
    this.gold += refund;
    tower.destroy();
    this.towers = this.towers.filter((t) => t !== tower);
    spot.tower = null;
    spot.image.setVisible(true);
    Sfx.sell();
    floatText(this, spot.pos.x, spot.pos.y - 60, `+${refund}`, '#f4c542');
    this.rangeGfx.clear();
    this.hud.closeMenus();
    this.updateTopBar();
  }

  private startRallyMode(tower: Tower): void {
    this.rallyTower = tower;
    this.rangeGfx.clear();
    this.rallyGfx.clear();
    const r = tower.barracksStats?.rallyRadius ?? 150;
    this.rallyGfx.fillStyle(0xf4c542, 0.1);
    this.rallyGfx.fillCircle(tower.spot.x, tower.spot.y, r);
    this.rallyGfx.lineStyle(2.5, 0xf4c542, 0.8);
    this.rallyGfx.strokeCircle(tower.spot.x, tower.spot.y, r);
    this.toastCenter('点击黄色范围内的任意位置设置集结点');
  }

  /* ---------------- 波次 ---------------- */

  private callWave(): void {
    if (this.gameOver || this.manualPaused) return;
    const phase = this.waveManager.phase;
    if (phase === 'idle' || phase === 'break') {
      const bonus = phase === 'break' ? earlyCallBonus(this.waveManager.breakLeft, EARLY_CALL_GOLD_PER_SEC) : 0;
      if (this.waveManager.callNext()) {
        if (bonus > 0) {
          this.gold += bonus;
          floatText(this, GAME_WIDTH - 180, 120, `提前迎战 +${bonus}`, '#f4c542');
        }
        Sfx.waveStart();
        this.toastCenter(`第 ${this.waveManager.waveIndex} 波来袭！`);
        this.updateTopBar();
        this.hud.refresh();
      }
    }
  }

  /* ---------------- 主循环 ---------------- */

  override update(_time: number, deltaMs: number): void {
    if (this.gameOver || this.manualPaused) return;
    const dt = Math.min(deltaMs / 1000, 0.05) * this.speed;
    const time = _time;

    // 波次出兵
    const orders = this.waveManager.update(dt);
    for (const order of orders) {
      this.spawnEnemy(order.enemy as EnemyType, order.path);
    }
    if (this.waveManager.waveIndex !== this.lastWaveAnnounced) {
      this.lastWaveAnnounced = this.waveManager.waveIndex;
      this.updateTopBar();
      this.hud.refresh();
    }

    // 实体更新
    for (const tower of this.towers) tower.update(dt, this.enemies, this.projectiles);
    for (const enemy of this.enemies) enemy.update(dt, time);
    for (const proj of this.projectiles) proj.update(dt, this.enemies);

    // 清理：阵亡结算赏金，漏过扣生命
    const survivors: Enemy[] = [];
    for (const e of this.enemies) {
      if (e.leaked) {
        this.lives = Math.max(0, this.lives - e.config.livesCost);
        Sfx.lifeLost();
        this.cameras.main.shake(160, 0.004);
        floatText(this, this.level.castle.x - 60, this.level.castle.y - 120, `-${e.config.livesCost}`, '#ff8a80');
        this.updateTopBar();
        if (this.lives <= 0) {
          this.endBattle(false);
          return;
        }
      } else if (e.dead) {
        this.gold += e.config.bounty;
        Sfx.coin();
        floatText(this, e.x, e.y - 26, `+${e.config.bounty}`);
        this.updateTopBar();
      } else {
        survivors.push(e);
      }
    }
    this.enemies = survivors;
    this.projectiles = this.projectiles.filter((p) => !p.done);

    // 胜利判定：全部波次出完且场上无敌人
    if (this.waveManager.phase === 'allSpawned' && this.enemies.length === 0) {
      this.endBattle(true);
      return;
    }
    this.hud.tick();
  }

  private spawnEnemy(type: EnemyType, pathIndex: number): void {
    const config = ENEMY_CONFIGS[type];
    const path = this.level.paths[Math.min(pathIndex, this.level.paths.length - 1)];
    this.enemies.push(new Enemy(this, config, path));
  }

  private updateTopBar(): void {
    this.goldText.setText(`${this.gold}`);
    this.livesText.setText(`${this.lives}`);
    this.waveText.setText(`波次 ${Math.max(1, this.waveManager.waveIndex)}/${this.waveManager.totalWaves}`);
    this.hud.refresh();
  }

  private endBattle(victory: boolean): void {
    if (this.gameOver) return;
    this.gameOver = true;
    this.rangeGfx.clear();
    this.rallyGfx.clear();
    this.rallyTower = null;
    this.hud.closeMenus();
    if (victory) {
      const stars = starsForLives(this.lives, this.livesMax);
      SaveManager.recordVictory(this.level.id, stars, this.lives);
      Sfx.victory();
    } else {
      Sfx.defeat();
    }
    this.hud.showResult(victory, victory ? starsForLives(this.lives, this.livesMax) : 0, this.lives, this.level.name);
  }
}