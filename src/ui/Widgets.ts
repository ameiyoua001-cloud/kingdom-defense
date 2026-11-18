import Phaser from 'phaser';
import { COLORS, FONT_FAMILY } from '../core/constants';
import { Sfx } from '../core/Sfx';

/** 精致木质/羊皮纸风格按钮，带悬停与按压反馈，命中区域适合手指点击 */
export function makeButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  height: number,
  label: string,
  onClick: () => void,
  opts: { fontSize?: number; color?: number; textColor?: string; icon?: string } = {}
): Phaser.GameObjects.Container {
  const { fontSize = 22, color = COLORS.wood, textColor = '#f7ecd8', icon } = opts;
  const c = scene.add.container(x, y);
  const bg = scene.add.graphics();
  const drawBg = (fill: number): void => {
    bg.clear();
    bg.fillStyle(0x2c2118, 0.9);
    bg.fillRoundedRect(-width / 2 - 3, -height / 2 - 3, width + 6, height + 6, 12);
    bg.fillStyle(fill);
    bg.fillRoundedRect(-width / 2, -height / 2, width, height, 10);
    bg.lineStyle(2, 0xffffff, 0.22);
    bg.strokeRoundedRect(-width / 2 + 2, -height / 2 + 2, width - 4, height - 4, 8);
  };
  drawBg(color);
  const text = scene.add
    .text(icon ? 10 : 0, 0, label, {
      fontFamily: FONT_FAMILY,
      fontSize: `${fontSize}px`,
      color: textColor,
      fontStyle: 'bold'
    })
    .setOrigin(0.5);
  c.add([bg, text]);
  if (icon) {
    const img = scene.add.image(-width / 2 + 26, 0, icon).setDisplaySize(26, 26);
    c.add(img);
    text.setX(12);
  }
  c.setSize(width + 6, height + 6);
  c.setInteractive({ useHandCursor: true });
  c.on('pointerover', () => {
    drawBg(Phaser.Display.Color.IntegerToColor(color).brighten(12).color);
    scene.tweens.add({ targets: c, scale: 1.04, duration: 90 });
  });
  c.on('pointerout', () => {
    drawBg(color);
    scene.tweens.add({ targets: c, scale: 1, duration: 90 });
  });
  c.on('pointerdown', () => {
    Sfx.unlock();
    Sfx.click();
    scene.tweens.add({ targets: c, scale: 0.95, duration: 60, yoyo: true });
  });
  c.on('pointerup', onClick);
  return c;
}

/** 圆形图标按钮（暂停 / 加速 / 声音等） */
export function makeIconButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  icon: string,
  onClick: () => void,
  radius = 24
): { container: Phaser.GameObjects.Container; setIcon: (key: string) => void } {
  const c = scene.add.container(x, y);
  const bg = scene.add.graphics();
  const drawBg = (fill: number): void => {
    bg.clear();
    bg.fillStyle(0x2c2118, 0.9);
    bg.fillCircle(0, 0, radius + 3);
    bg.fillStyle(fill);
    bg.fillCircle(0, 0, radius);
    bg.lineStyle(2, 0xffffff, 0.2);
    bg.strokeCircle(0, 0, radius - 3);
  };
  drawBg(COLORS.wood);
  const img = scene.add.image(0, 0, icon).setDisplaySize(radius * 1.15, radius * 1.15);
  c.add([bg, img]);
  c.setSize(radius * 2 + 6, radius * 2 + 6);
  c.setInteractive({ useHandCursor: true });
  c.on('pointerover', () => drawBg(0xa9713f));
  c.on('pointerout', () => drawBg(COLORS.wood));
  c.on('pointerdown', () => {
    Sfx.unlock();
    Sfx.click();
  });
  c.on('pointerup', onClick);
  return { container: c, setIcon: (key: string) => img.setTexture(key) };
}

/** 羊皮纸面板 */
export function makePanel(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  height: number
): { container: Phaser.GameObjects.Container; bg: Phaser.GameObjects.Graphics } {
  const c = scene.add.container(x, y);
  const bg = scene.add.graphics();
  bg.fillStyle(0x2c2118, 0.55);
  bg.fillRoundedRect(-width / 2 + 5, -height / 2 + 7, width, height, 16);
  bg.fillStyle(COLORS.parchment);
  bg.fillRoundedRect(-width / 2, -height / 2, width, height, 14);
  bg.lineStyle(4, COLORS.woodDark);
  bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 14);
  bg.lineStyle(2, COLORS.parchmentDark);
  bg.strokeRoundedRect(-width / 2 + 6, -height / 2 + 6, width - 12, height - 12, 10);
  c.add(bg);
  return { container: c, bg };
}

/** 半透明遮罩 */
export function makeDim(scene: Phaser.Scene, width: number, height: number, alpha = 0.55): Phaser.GameObjects.Rectangle {
  return scene.add.rectangle(width / 2, height / 2, width, height, 0x120d08, alpha).setInteractive();
}

/** 飘字提示（金币不足等） */
export function toast(scene: Phaser.Scene, x: number, y: number, msg: string, color = '#ffd9d6'): void {
  const t = scene.add
    .text(x, y, msg, {
      fontFamily: FONT_FAMILY,
      fontSize: '20px',
      fontStyle: 'bold',
      color,
      stroke: '#2c2118',
      strokeThickness: 4
    })
    .setOrigin(0.5)
    .setDepth(900);
  scene.tweens.add({
    targets: t,
    y: y - 46,
    alpha: 0,
    duration: 1100,
    ease: 'Cubic.Out',
    onComplete: () => t.destroy()
  });
}

/** 世界坐标浮动数字（赏金 / 伤害） */
export function floatText(scene: Phaser.Scene, x: number, y: number, msg: string, color = '#f4c542'): void {
  const t = scene.add
    .text(x, y, msg, {
      fontFamily: FONT_FAMILY,
      fontSize: '17px',
      fontStyle: 'bold',
      color,
      stroke: '#2c2118',
      strokeThickness: 3
    })
    .setOrigin(0.5)
    .setDepth(800);
  scene.tweens.add({
    targets: t,
    y: y - 34,
    alpha: 0,
    duration: 800,
    ease: 'Cubic.Out',
    onComplete: () => t.destroy()
  });
}