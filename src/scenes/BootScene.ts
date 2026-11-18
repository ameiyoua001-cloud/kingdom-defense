import Phaser from 'phaser';
import { generateAllTextures } from '../art/ArtGen';
import { FONT_FAMILY, SCENES } from '../core/constants';
import { makeButton } from '../ui/Widgets';

/** 启动场景：生成全部程序化贴图后进入主菜单 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENES.boot);
  }

  create(): void {
    generateAllTextures(this);
    this.scene.start(SCENES.menu);
  }
}

/** 主菜单 */
export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super(SCENES.menu);
  }

  create(): void {
    this.add.image(640, 360, 'bg-menu');
    // 飘动云层
    for (let i = 0; i < 3; i++) {
      const cloud = this.add.graphics();
      cloud.fillStyle(0xffffff, 0.75);
      cloud.fillEllipse(0, 0, 130, 34);
      cloud.fillEllipse(-40, 8, 70, 26);
      cloud.fillEllipse(46, 6, 80, 28);
      cloud.setPosition(200 + i * 420, 70 + i * 46);
      this.tweens.add({
        targets: cloud,
        x: cloud.x + 90,
        duration: 9000 + i * 3000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.InOut'
      });
    }

    // 标题
    const title = this.add
      .text(640, 200, '王国防线', {
        fontFamily: FONT_FAMILY,
        fontSize: '92px',
        fontStyle: 'bold',
        color: '#f7ecd8',
        stroke: '#2c2118',
        strokeThickness: 12
      })
      .setOrigin(0.5);
    this.add
      .text(640, 278, '—— 最后的城堡 ——', {
        fontFamily: FONT_FAMILY,
        fontSize: '34px',
        fontStyle: 'bold',
        color: '#f4c542',
        stroke: '#2c2118',
        strokeThickness: 6
      })
      .setOrigin(0.5);
    this.add
      .text(640, 322, 'Kingdom Defense: The Last Castle', {
        fontFamily: FONT_FAMILY,
        fontSize: '18px',
        color: '#e8d5b0',
        stroke: '#2c2118',
        strokeThickness: 3
      })
      .setOrigin(0.5);
    this.tweens.add({ targets: title, y: 192, duration: 2200, yoyo: true, repeat: -1, ease: 'Sine.InOut' });

    // 开始按钮
    makeButton(this, 640, 460, 300, 72, '开始征战', () => this.scene.start(SCENES.world), {
      fontSize: 30,
      color: 0x3f8a58
    });
    this.add
      .text(640, 660, '第一阶段原型 · 迷雾森林 10 波防守战 · 本地自动存档', {
        fontFamily: FONT_FAMILY,
        fontSize: '16px',
        color: '#d9c294',
        stroke: '#2c2118',
        strokeThickness: 3
      })
      .setOrigin(0.5);
  }
}