import Phaser from 'phaser';
import type { TowerType, Vec2 } from '../types';
import { TOWER_CONFIGS, TOWER_ORDER } from '../config';
import { COLORS, FONT_FAMILY, GAME_HEIGHT, GAME_WIDTH, SCENES } from '../core/constants';
import { Sfx } from '../core/Sfx';
import type { WavePhase } from '../core/WaveManager';
import { makeButton, makeDim, makeIconButton, makePanel } from '../ui/Widgets';

export interface HudState {
  gold: number;
  lives: number;
  wave: number;
  totalWaves: number;
  phase: WavePhase;
  breakLeft: number;
  speed: number;
  paused: boolean;
  gameOver: boolean;
}

export interface TowerInfo {
  type: TowerType;
  level: number;
  upgradeCost: number | null;
  sellValue: number;
}

/** BattleScene 暴露给 HUD 的操作接口 */
export interface BattleAPI {
  getState(): HudState;
  callWave(): void;
  toggleSpeed(): void;
  togglePause(): void;
  restart(): void;
  toWorldMap(): void;
  openBuildMenu(spotIndex: number): void;
  openTowerMenu(spotIndex: number): void;
  buildTower(spotIndex: number, type: TowerType): void;
  upgradeTower(spotIndex: number): void;
  sellTower(spotIndex: number): void;
  setRally(spotIndex: number): void;
  spotScreenPos(spotIndex: number): Vec2;
  towerInfo(spotIndex: number): TowerInfo | null;
  canAfford(cost: number): boolean;
}

const TOWER_TINT: Record<TowerType, number> = {
  arrow: 0x3f8a58,
  mage: 0x7a4fb5,
  cannon: 0xb5651d,
  barracks: 0x3f6fb5
};

/** 战斗覆盖层 UI：与战斗场景同坐标系，负责全部交互面板 */
export class HUDScene extends Phaser.Scene {
  private api: BattleAPI | null = null;
  private menuLayer: Phaser.GameObjects.Container | null = null;
  private waveBtn!: Phaser.GameObjects.Container;
  private waveBtnLabel!: Phaser.GameObjects.Text;
  private pauseBtn!: { container: Phaser.GameObjects.Container; setIcon: (k: string) => void };
  private speedBtn!: { container: Phaser.GameObjects.Container; setIcon: (k: string) => void };
  private pauseOverlay: Phaser.GameObjects.Container | null = null;
  private lastBreakCeil = -1;

  constructor() {
    super(SCENES.hud);
  }

  create(): void {
    this.menuLayer = null;
    this.pauseOverlay = null;
    this.lastBreakCeil = -1;

    // 右上角控制按钮
    this.pauseBtn = makeIconButton(this, GAME_WIDTH - 176, 40, 'icon-pause', () => this.api?.togglePause());
    this.speedBtn = makeIconButton(this, GAME_WIDTH - 116, 40, 'icon-speed', () => this.api?.toggleSpeed());
    const soundBtn = makeIconButton(this, GAME_WIDTH - 56, 40, Sfx.enabled ? 'icon-sound-on' : 'icon-sound-off', () => {
      const on = Sfx.toggle();
      soundBtn.setIcon(on ? 'icon-sound-on' : 'icon-sound-off');
    });
    this.pauseBtn.container.setDepth(3000);
    this.speedBtn.container.setDepth(3000);
    soundBtn.container.setDepth(3000);
    this.speedLabel = this.add
      .text(GAME_WIDTH - 116, 74, '×1', { fontFamily: FONT_FAMILY, fontSize: '15px', fontStyle: 'bold', color: '#f2e3c2', stroke: '#2c2118', strokeThickness: 3 })
      .setOrigin(0.5)
      .setDepth(3000);

    // 右下角：召唤波次按钮
    this.waveBtn = makeButton(this, GAME_WIDTH - 140, GAME_HEIGHT - 58, 224, 64, '召唤第 1 波', () => this.api?.callWave(), {
      fontSize: 22,
      color: 0xb5651d
    });
    this.waveBtn.setDepth(3000);
    this.waveBtnLabel = this.waveBtn.list[this.waveBtn.list.length - 1] as Phaser.GameObjects.Text;
    this.tweens.add({ targets: this.waveBtn, scale: 1.04, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    // bind 可能先于 create 执行（场景启动时序），这里补一次状态同步
    if (this.api) this.refresh();
  }

  private speedLabel!: Phaser.GameObjects.Text;

  bind(api: BattleAPI): void {
    this.api = api;
    this.refresh();
  }

  /** 每帧轻量刷新（仅在变化时改文字） */
  tick(): void {
    if (!this.api || !this.waveBtn) return;
    const s = this.api.getState();
    if (s.phase === 'break') {
      const ceil = Math.max(0, Math.ceil(s.breakLeft));
      if (ceil !== this.lastBreakCeil) {
        this.lastBreakCeil = ceil;
        this.waveBtnLabel.setText(`下一波 ${ceil}s · 提前迎战`);
      }
      this.waveBtn.setVisible(true);
    }
  }

  refresh(): void {
    if (!this.api || !this.waveBtn) return;
    const s = this.api.getState();
    this.pauseBtn.setIcon(s.paused ? 'icon-play' : 'icon-pause');
    this.speedLabel.setText(`×${s.speed}`);
    if (s.gameOver) {
      this.waveBtn.setVisible(false);
    } else if (s.phase === 'idle') {
      this.waveBtn.setVisible(true);
      this.waveBtnLabel.setText('召唤第 1 波');
    } else if (s.phase === 'break') {
      this.waveBtn.setVisible(true);
      this.lastBreakCeil = -1;
      this.tick();
    } else {
      this.waveBtn.setVisible(false);
    }
    if (s.paused && !s.gameOver) this.showPauseOverlay();
    else this.hidePauseOverlay();
  }

  closeMenus(): void {
    this.menuLayer?.destroy();
    this.menuLayer = null;
  }

  /* ---------------- 建造轮盘 ---------------- */

  showBuildMenu(spotIndex: number, pos: Vec2, gold: number): void {
    this.closeMenus();
    const layer = this.add.container(0, 0).setDepth(4000);
    this.menuLayer = layer;
    const offsets: Vec2[] = [
      { x: 0, y: -86 },
      { x: 86, y: 0 },
      { x: 0, y: 86 },
      { x: -86, y: 0 }
    ];
    TOWER_ORDER.forEach((type, i) => {
      const cfg = TOWER_CONFIGS[type];
      const cost = cfg.levels[0].cost;
      const affordable = gold >= cost;
      let bx = pos.x + offsets[i].x;
      let by = pos.y + offsets[i].y;
      bx = Phaser.Math.Clamp(bx, 60, GAME_WIDTH - 60);
      by = Phaser.Math.Clamp(by, 100, GAME_HEIGHT - 60);
      const node = this.add.container(bx, by);
      const g = this.add.graphics();
      g.fillStyle(0x2c2118, 0.85);
      g.fillCircle(0, 0, 43);
      g.fillStyle(affordable ? TOWER_TINT[type] : 0x6b645b);
      g.fillCircle(0, 0, 39);
      g.lineStyle(3, 0xf2e3c2, affordable ? 0.9 : 0.4);
      g.strokeCircle(0, 0, 39);
      const icon = this.add.image(0, -6, `tower-${type}-1`).setDisplaySize(46, 50);
      const price = this.add
        .text(0, 26, `${cost}`, { fontFamily: FONT_FAMILY, fontSize: '16px', fontStyle: 'bold', color: affordable ? '#f4c542' : '#c9beb0', stroke: '#2c2118', strokeThickness: 3 })
        .setOrigin(0.5);
      const coin = this.add.image(-18, 26, 'icon-coin').setScale(0.55);
      node.add([g, icon, coin, price]);
      node.setSize(86, 86);
      node.setInteractive({ useHandCursor: true });
      node.on('pointerover', () => this.tweens.add({ targets: node, scale: 1.1, duration: 90 }));
      node.on('pointerout', () => this.tweens.add({ targets: node, scale: 1, duration: 90 }));
      node.on('pointerup', () => {
        Sfx.unlock();
        this.api?.buildTower(spotIndex, type);
      });
      node.setScale(0.3);
      this.tweens.add({ targets: node, scale: 1, duration: 160, delay: i * 40, ease: 'Back.Out' });
      layer.add(node);
    });
    // 塔名提示（轮盘中心上方）
    const hint = this.add
      .text(pos.x, pos.y, '选择防御塔', { fontFamily: FONT_FAMILY, fontSize: '15px', fontStyle: 'bold', color: '#f7ecd8', stroke: '#2c2118', strokeThickness: 4 })
      .setOrigin(0.5);
    layer.add(hint);
  }

  /* ---------------- 塔操作面板 ---------------- */

  showTowerMenu(spotIndex: number, pos: Vec2): void {
    this.closeMenus();
    const info = this.api?.towerInfo(spotIndex);
    if (!info) return;
    const cfg = TOWER_CONFIGS[info.type];
    const panelW = 300;
    const panelH = 190;
    let px = Phaser.Math.Clamp(pos.x, panelW / 2 + 16, GAME_WIDTH - panelW / 2 - 16);
    let py = pos.y - 150;
    if (py - panelH / 2 < 76) py = pos.y + 150;
    py = Phaser.Math.Clamp(py, panelH / 2 + 76, GAME_HEIGHT - panelH / 2 - 16);

    const { container } = makePanel(this, px, py, panelW, panelH);
    container.setDepth(4000);
    this.menuLayer = container;

    container.add(
      this.add.text(0, -panelH / 2 + 26, `${cfg.name} · Lv.${info.level}`, {
        fontFamily: FONT_FAMILY, fontSize: '21px', fontStyle: 'bold', color: '#3a2a1a'
      }).setOrigin(0.5)
    );
    container.add(
      this.add.text(0, -panelH / 2 + 52, cfg.description, {
        fontFamily: FONT_FAMILY, fontSize: '13px', color: '#6e5a3e', wordWrap: { width: panelW - 30 }, align: 'center'
      }).setOrigin(0.5)
    );

    // 升级按钮
    if (info.upgradeCost !== null) {
      const cost = info.upgradeCost;
      const affordable = this.api?.canAfford(cost) ?? false;
      const up = makeButton(this, 0, 6, panelW - 60, 46, `升级  ${cost} 金币`, () => this.api?.upgradeTower(spotIndex), {
        fontSize: 18,
        color: affordable ? 0x3f8a58 : 0x8c8378
      });
      container.add(up);
    } else {
      container.add(
        this.add.text(0, 6, '已达最高等级', { fontFamily: FONT_FAMILY, fontSize: '18px', fontStyle: 'bold', color: '#8a6a42' }).setOrigin(0.5)
      );
    }

    // 兵营集结点按钮
    if (info.type === 'barracks') {
      const rally = makeButton(this, -72, 58, 140, 42, '集结点', () => {
        this.closeMenus();
        this.api?.setRally(spotIndex);
      }, { fontSize: 17, color: COLORS.blue });
      const sell = makeButton(this, 76, 58, 140, 42, `出售 +${info.sellValue}`, () => this.api?.sellTower(spotIndex), {
        fontSize: 17,
        color: 0xb5482e
      });
      container.add([rally, sell]);
    } else {
      const sell = makeButton(this, 0, 58, panelW - 60, 42, `出售 +${info.sellValue} 金币`, () => this.api?.sellTower(spotIndex), {
        fontSize: 17,
        color: 0xb5482e
      });
      container.add(sell);
    }
    container.setScale(0.8).setAlpha(0);
    this.tweens.add({ targets: container, scale: 1, alpha: 1, duration: 140, ease: 'Back.Out' });
  }

  /* ---------------- 暂停 ---------------- */

  private showPauseOverlay(): void {
    if (this.pauseOverlay) return;
    const c = this.add.container(0, 0).setDepth(5000);
    c.add(makeDim(this, GAME_WIDTH, GAME_HEIGHT, 0.6));
    const { container: panel } = makePanel(this, GAME_WIDTH / 2, GAME_HEIGHT / 2, 400, 330);
    c.add(panel);
    panel.add(
      this.add.text(0, -110, '战斗暂停', { fontFamily: FONT_FAMILY, fontSize: '34px', fontStyle: 'bold', color: '#3a2a1a' }).setOrigin(0.5)
    );
    panel.add(makeButton(this, 0, -40, 280, 56, '继续战斗', () => this.api?.togglePause(), { fontSize: 22, color: 0x3f8a58 }));
    panel.add(makeButton(this, 0, 28, 280, 56, '重新开始', () => this.api?.restart(), { fontSize: 22, color: 0xb5651d }));
    panel.add(makeButton(this, 0, 96, 280, 56, '返回地图', () => this.api?.toWorldMap(), { fontSize: 22, color: 0x8c8378 }));
    this.pauseOverlay = c;
  }

  private hidePauseOverlay(): void {
    this.pauseOverlay?.destroy();
    this.pauseOverlay = null;
  }

  /* ---------------- 结算 ---------------- */

  showResult(victory: boolean, stars: number, livesLeft: number, levelName: string): void {
    this.closeMenus();
    this.hidePauseOverlay();
    const c = this.add.container(0, 0).setDepth(6000);
    c.add(makeDim(this, GAME_WIDTH, GAME_HEIGHT, 0.66));
    const { container: panel } = makePanel(this, GAME_WIDTH / 2, GAME_HEIGHT / 2, 520, 400);
    c.add(panel);

    panel.add(
      this.add.text(0, -140, victory ? '防线守住了！' : '城堡陷落……', {
        fontFamily: FONT_FAMILY, fontSize: '42px', fontStyle: 'bold', color: victory ? '#3f8a58' : '#b5482e'
      }).setOrigin(0.5)
    );
    panel.add(
      this.add.text(0, -96, `${levelName} · 剩余生命 ${livesLeft}`, {
        fontFamily: FONT_FAMILY, fontSize: '19px', color: '#6e5a3e'
      }).setOrigin(0.5)
    );

    if (victory) {
      for (let i = 0; i < 3; i++) {
        const earned = i < stars;
        const star = this.add.image(-70 + i * 70, -30, earned ? 'icon-star' : 'icon-star-empty').setScale(0.2).setAlpha(0);
        panel.add(star);
        this.tweens.add({
          targets: star,
          scale: earned ? 1.7 : 1.3,
          alpha: 1,
          duration: 300,
          delay: 300 + i * 260,
          ease: 'Back.Out'
        });
      }
    } else {
      panel.add(
        this.add.text(0, -30, '调整塔的组合与位置，再试一次！', {
          fontFamily: FONT_FAMILY, fontSize: '18px', color: '#6e5a3e'
        }).setOrigin(0.5)
      );
    }

    panel.add(makeButton(this, -110, 110, 200, 58, '再战一次', () => this.api?.restart(), { fontSize: 22, color: 0xb5651d }));
    panel.add(makeButton(this, 110, 110, 200, 58, '返回地图', () => this.api?.toWorldMap(), { fontSize: 22, color: 0x3f8a58 }));

    panel.setScale(0.85).setAlpha(0);
    this.tweens.add({ targets: panel, scale: 1, alpha: 1, duration: 260, ease: 'Back.Out' });
  }
}