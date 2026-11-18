import Phaser from 'phaser';
import { LEVELS } from '../config';
import { COLORS, FONT_FAMILY, GAME_HEIGHT, GAME_WIDTH, SCENES } from '../core/constants';
import { SaveManager } from '../core/SaveManager';
import { Sfx } from '../core/Sfx';
import { makeButton, makeIconButton, toast } from '../ui/Widgets';

interface NodeDef {
  levelId: string;
  x: number;
  y: number;
}

/** 世界地图：羊皮纸风格，展示关卡节点、星级与解锁状态 */
export class WorldMapScene extends Phaser.Scene {
  private nodes: NodeDef[] = [
    { levelId: 'forest-1', x: 250, y: 560 },
    // 后续章节预留位（第二阶段扩展）
    { levelId: 'highland-2', x: 620, y: 500 },
    { levelId: 'citadel-3', x: 1020, y: 420 }
  ];

  constructor() {
    super(SCENES.world);
  }

  create(): void {
    this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'bg-world');

    this.add
      .text(GAME_WIDTH / 2, 66, '王国疆域图', {
        fontFamily: FONT_FAMILY,
        fontSize: '44px',
        fontStyle: 'bold',
        color: '#5e3d20',
        stroke: '#f2e3c2',
        strokeThickness: 6
      })
      .setOrigin(0.5);

    makeButton(this, 96, 64, 130, 48, '返回', () => this.scene.start(SCENES.menu), { fontSize: 20 });
    const soundBtn = makeIconButton(this, GAME_WIDTH - 60, 64, Sfx.enabled ? 'icon-sound-on' : 'icon-sound-off', () => {
      const on = Sfx.toggle();
      soundBtn.setIcon(on ? 'icon-sound-on' : 'icon-sound-off');
    });

    const levelIds = LEVELS.map((l) => l.id);
    this.nodes.forEach((node, i) => this.drawNode(node, i, levelIds));

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 40, '通关前一关卡即可解锁下一章节（后续章节将在第二阶段开放）', {
        fontFamily: FONT_FAMILY,
        fontSize: '16px',
        color: '#8a6a42'
      })
      .setOrigin(0.5);
  }

  private drawNode(node: NodeDef, index: number, levelIds: readonly string[]): void {
    const level = LEVELS.find((l) => l.id === node.levelId);
    const unlocked = level !== undefined && SaveManager.isUnlocked(levelIds, index);
    const progress = level ? SaveManager.getLevelProgress(level.id) : undefined;
    const c = this.add.container(node.x, node.y);

    const g = this.add.graphics();
    g.fillStyle(0x2c2118, 0.25);
    g.fillEllipse(4, 10, 108, 40);
    g.fillStyle(unlocked ? COLORS.wood : 0x8c8378);
    g.fillCircle(0, 0, 46);
    g.lineStyle(4, unlocked ? COLORS.woodDark : 0x6b645b);
    g.strokeCircle(0, 0, 46);
    g.fillStyle(unlocked ? COLORS.parchment : 0xb0a898);
    g.fillCircle(0, 0, 38);
    c.add(g);

    const num = this.add
      .text(0, -2, `${index + 1}`, {
        fontFamily: FONT_FAMILY,
        fontSize: '34px',
        fontStyle: 'bold',
        color: unlocked ? '#5e3d20' : '#7a7268'
      })
      .setOrigin(0.5);
    c.add(num);

    // 星级
    for (let s = 0; s < 3; s++) {
      const earned = (progress?.stars ?? 0) > s;
      const star = this.add.image(-26 + s * 26, 62, earned ? 'icon-star' : 'icon-star-empty').setScale(0.8);
      c.add(star);
    }

    const label = this.add
      .text(0, -70, level ? level.name : '未知之地', {
        fontFamily: FONT_FAMILY,
        fontSize: '22px',
        fontStyle: 'bold',
        color: unlocked ? '#5e3d20' : '#8c8378',
        stroke: '#f2e3c2',
        strokeThickness: 4
      })
      .setOrigin(0.5);
    c.add(label);

    if (!unlocked) {
      // 锁形图标
      const lock = this.add.graphics();
      lock.fillStyle(0x55483a);
      lock.fillRoundedRect(-11, -4, 22, 17, 4);
      lock.lineStyle(4, 0x55483a);
      lock.strokeCircle(0, -6, 7);
      lock.setPosition(0, 26);
      c.add(lock);
    }

    c.setSize(110, 130);
    c.setInteractive({ useHandCursor: unlocked });
    if (unlocked && level) {
      c.on('pointerover', () => this.tweens.add({ targets: c, scale: 1.08, duration: 110 }));
      c.on('pointerout', () => this.tweens.add({ targets: c, scale: 1, duration: 110 }));
      c.on('pointerup', () => {
        Sfx.unlock();
        Sfx.click();
        this.cameras.main.fadeOut(280, 20, 14, 8);
        this.time.delayedCall(300, () => this.scene.start(SCENES.battle, { levelId: level.id }));
      });
    } else {
      c.on('pointerup', () => {
        Sfx.error();
        toast(this, node.x, node.y - 110, level ? '先通关上一关！' : '此区域将在后续阶段开放');
      });
    }
  }
}