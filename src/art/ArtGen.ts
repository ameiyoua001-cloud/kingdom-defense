import Phaser from 'phaser';
import type { LevelConfig, Vec2 } from '../types';
import { GAME_HEIGHT, GAME_WIDTH } from '../core/constants';

/**
 * 原创程序化美术：所有贴图均由代码绘制生成，
 * 不使用任何外部图片素材，保证完全原创。
 * 风格：粗描边 + 高饱和色块的 2D 卡通手绘感。
 */

const INK = 0x2c2118;

function tex(scene: Phaser.Scene, key: string, w: number, h: number, draw: (g: Phaser.GameObjects.Graphics) => void): void {
  if (scene.textures.exists(key)) return;
  const g = scene.make.graphics({});
  draw(g);
  g.generateTexture(key, w, h);
  g.destroy();
}

function outline(g: Phaser.GameObjects.Graphics, width = 3): void {
  g.lineStyle(width, INK, 1);
}

function starPoints(cx: number, cy: number, outer: number, inner: number): Phaser.Geom.Point[] {
  const pts: Phaser.Geom.Point[] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    pts.push(new Phaser.Geom.Point(cx + Math.cos(a) * r, cy + Math.sin(a) * r));
  }
  return pts;
}

/** 简单可复现随机数（用于地图装饰散布） */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------------- 通用图标 ---------------- */

function drawIcons(scene: Phaser.Scene): void {
  tex(scene, 'icon-coin', 28, 28, (g) => {
    outline(g);
    g.fillStyle(0xf4c542);
    g.fillCircle(14, 14, 11);
    g.strokeCircle(14, 14, 11);
    g.fillStyle(0xffe08a);
    g.fillCircle(11, 11, 4);
    g.lineStyle(2, 0xb8860b);
    g.strokeCircle(14, 14, 7);
  });

  tex(scene, 'icon-heart', 28, 28, (g) => {
    outline(g);
    g.fillStyle(0xd9463e);
    g.fillCircle(9, 10, 7);
    g.fillCircle(19, 10, 7);
    g.fillTriangle(2, 13, 26, 13, 14, 26);
    g.fillStyle(0xff8a80);
    g.fillCircle(9, 8, 2.5);
  });

  tex(scene, 'icon-star', 36, 36, (g) => {
    outline(g);
    g.fillStyle(0xf4c542);
    g.fillPoints(starPoints(18, 19, 15, 6.5), true);
    g.strokePoints(starPoints(18, 19, 15, 6.5), true, true);
  });

  tex(scene, 'icon-star-empty', 36, 36, (g) => {
    g.lineStyle(3, 0x7a6a52);
    g.fillStyle(0x55483a);
    g.fillPoints(starPoints(18, 19, 15, 6.5), true);
    g.strokePoints(starPoints(18, 19, 15, 6.5), true, true);
  });

  tex(scene, 'icon-pause', 30, 30, (g) => {
    g.fillStyle(0xf2e3c2);
    g.fillRoundedRect(6, 5, 7, 20, 2);
    g.fillRoundedRect(17, 5, 7, 20, 2);
  });

  tex(scene, 'icon-play', 30, 30, (g) => {
    g.fillStyle(0xf2e3c2);
    g.fillTriangle(8, 5, 8, 25, 25, 15);
  });

  tex(scene, 'icon-speed', 30, 30, (g) => {
    g.fillStyle(0xf2e3c2);
    g.fillTriangle(3, 6, 3, 24, 15, 15);
    g.fillTriangle(15, 6, 15, 24, 27, 15);
  });

  const speaker = (g: Phaser.GameObjects.Graphics): void => {
    g.fillStyle(0xf2e3c2);
    g.fillRect(5, 11, 6, 8);
    g.fillTriangle(11, 11, 11, 19, 19, 25);
    g.fillTriangle(11, 11, 11, 19, 19, 5);
  };
  tex(scene, 'icon-sound-on', 30, 30, (g) => {
    speaker(g);
    g.lineStyle(2.5, 0xf2e3c2);
    g.beginPath();
    g.arc(19, 15, 7, -0.9, 0.9);
    g.strokePath();
  });
  tex(scene, 'icon-sound-off', 30, 30, (g) => {
    speaker(g);
    g.lineStyle(3, 0xd9463e);
    g.lineBetween(20, 9, 28, 21);
    g.lineBetween(28, 9, 20, 21);
  });

  tex(scene, 'particle', 10, 10, (g) => {
    g.fillStyle(0xffffff);
    g.fillCircle(5, 5, 4);
  });

  tex(scene, 'flag-rally', 30, 36, (g) => {
    outline(g, 2);
    g.fillStyle(0x8a5a33);
    g.fillRect(5, 2, 4, 32);
    g.fillStyle(0xd9463e);
    g.fillTriangle(9, 3, 28, 9, 9, 16);
    g.strokeTriangle(9, 3, 28, 9, 9, 16);
  });
}

/* ---------------- 防御塔 ---------------- */

function drawArrowTower(g: Phaser.GameObjects.Graphics, level: number): void {
  const h = 62 + level * 14;
  const top = 108 - h;
  outline(g);
  if (level === 1) {
    // 木质瞭望塔
    g.fillStyle(0x8a5a33);
    g.fillRect(26, top + 26, 8, h - 26);
    g.fillRect(46, top + 26, 8, h - 26);
    g.strokeRect(26, top + 26, 8, h - 26);
    g.strokeRect(46, top + 26, 8, h - 26);
    g.fillStyle(0xa9713f);
    g.fillRoundedRect(18, top + 10, 44, 22, 4);
    g.strokeRoundedRect(18, top + 10, 44, 22, 4);
    g.fillStyle(0x3a2a1a);
    g.fillRect(34, top + 16, 12, 10);
    g.fillStyle(0xd9b23a);
    g.fillTriangle(14, top + 12, 66, top + 12, 40, top - 8);
    g.strokeTriangle(14, top + 12, 66, top + 12, 40, top - 8);
  } else {
    // 石塔
    g.fillStyle(level === 3 ? 0xb5b0a6 : 0x9a958c);
    g.fillRect(24, top + 14, 32, h - 14);
    g.strokeRect(24, top + 14, 32, h - 14);
    g.fillStyle(0x7d786f);
    g.fillRect(24, top + 30, 32, 4);
    g.fillRect(24, top + 52, 32, 4);
    g.fillStyle(0x3a2a1a);
    g.fillRect(35, top + 20, 10, 12);
    // 垛口
    g.fillStyle(level === 3 ? 0xb5b0a6 : 0x9a958c);
    for (let i = 0; i < 3; i++) {
      g.fillRect(22 + i * 13, top + 4, 9, 12);
      g.strokeRect(22 + i * 13, top + 4, 9, 12);
    }
    if (level === 3) {
      g.fillStyle(0x4f8fdd);
      g.fillTriangle(20, top + 6, 60, top + 6, 40, top - 16);
      g.strokeTriangle(20, top + 6, 60, top + 6, 40, top - 16);
      g.fillStyle(0x8a5a33);
      g.fillRect(38, top - 30, 3, 16);
      g.fillStyle(0xf4c542);
      g.fillTriangle(41, top - 30, 58, top - 25, 41, top - 19);
    }
  }
}

function drawMageTower(g: Phaser.GameObjects.Graphics, level: number): void {
  outline(g);
  // 石基座
  g.fillStyle(0x8d8798);
  g.fillRect(28, 62, 24, 44);
  g.strokeRect(28, 62, 24, 44);
  g.fillStyle(0x6f6a7c);
  g.fillRoundedRect(22, 56, 36, 12, 4);
  g.strokeRoundedRect(22, 56, 36, 12, 4);
  // 光晕
  g.fillStyle(0xa06be0, 0.25);
  g.fillCircle(40, 36, 22 + level * 3);
  // 主水晶
  const s = 12 + level * 3;
  g.fillStyle(level === 3 ? 0xc79bf0 : 0xa06be0);
  g.fillPoints([
    new Phaser.Geom.Point(40, 36 - s),
    new Phaser.Geom.Point(40 + s * 0.7, 36),
    new Phaser.Geom.Point(40, 36 + s),
    new Phaser.Geom.Point(40 - s * 0.7, 36)
  ], true);
  g.strokePoints([
    new Phaser.Geom.Point(40, 36 - s),
    new Phaser.Geom.Point(40 + s * 0.7, 36),
    new Phaser.Geom.Point(40, 36 + s),
    new Phaser.Geom.Point(40 - s * 0.7, 36)
  ], true, true);
  g.fillStyle(0xe8d5ff);
  g.fillTriangle(40, 36 - s + 4, 40 + 4, 36, 40 - 3, 36 + 2);
  if (level >= 2) {
    g.fillStyle(0x8a54c9);
    g.fillCircle(20, 48, 5);
    g.strokeCircle(20, 48, 5);
    g.fillCircle(60, 48, 5);
    g.strokeCircle(60, 48, 5);
  }
  if (level === 3) {
    g.lineStyle(3, 0xf4c542);
    g.strokeCircle(40, 36, s + 7);
  }
}

function drawCannonTower(g: Phaser.GameObjects.Graphics, level: number): void {
  outline(g);
  // 木台
  g.fillStyle(0x8a5a33);
  g.fillRoundedRect(12, 52, 66, 20, 5);
  g.strokeRoundedRect(12, 52, 66, 20, 5);
  g.fillStyle(0x5e3d20);
  g.fillCircle(24, 70, 9);
  g.strokeCircle(24, 70, 9);
  g.fillCircle(66, 70, 9);
  g.strokeCircle(66, 70, 9);
  // 炮管（朝右上）
  const len = 34 + level * 7;
  const barrel = new Phaser.Geom.Rectangle(0, 0, len, 16 + level * 2);
  const cx = 42;
  const cy = 46;
  g.save();
  g.translateCanvas(cx, cy);
  g.rotateCanvas(-0.5);
  g.fillStyle(level === 3 ? 0x4a4f5c : 0x565b66);
  g.fillRoundedRect(-8, -barrel.height / 2, barrel.width, barrel.height, 6);
  g.strokeRoundedRect(-8, -barrel.height / 2, barrel.width, barrel.height, 6);
  g.fillStyle(0x30333c);
  g.fillRect(len - 14, -barrel.height / 2, 5, barrel.height);
  if (level >= 2) {
    g.fillStyle(0xb8860b);
    g.fillRect(4, -barrel.height / 2, 4, barrel.height);
  }
  g.restore();
  g.fillStyle(0x3a2a1a);
  g.fillCircle(cx, cy, 7 + level);
  g.strokeCircle(cx, cy, 7 + level);
  if (level === 3) {
    g.fillStyle(0xd9463e);
    g.fillTriangle(14, 52, 30, 52, 22, 40);
  }
}

function drawBarracks(g: Phaser.GameObjects.Graphics, level: number): void {
  outline(g);
  const wall = level === 3 ? 0xb5b0a6 : 0xd9c294;
  g.fillStyle(wall);
  g.fillRect(16, 40, 68, 42);
  g.strokeRect(16, 40, 68, 42);
  // 屋顶
  g.fillStyle(level === 1 ? 0xc05a3a : level === 2 ? 0x4f8fdd : 0x3f6fb5);
  g.fillTriangle(8, 42, 92, 42, 50, 10);
  g.strokeTriangle(8, 42, 92, 42, 50, 10);
  // 门
  g.fillStyle(0x5e3d20);
  g.fillRoundedRect(40, 56, 20, 26, { tl: 8, tr: 8, bl: 0, br: 0 });
  g.strokeRoundedRect(40, 56, 20, 26, { tl: 8, tr: 8, bl: 0, br: 0 });
  // 盾徽
  g.fillStyle(0x4f8fdd);
  g.fillCircle(27, 56, 8);
  g.strokeCircle(27, 56, 8);
  g.lineStyle(2.5, 0xf4c542);
  g.lineBetween(27, 50, 27, 62);
  g.lineBetween(21, 56, 33, 56);
  if (level >= 2) {
    outline(g, 2);
    g.fillStyle(0x8a5a33);
    g.fillRect(74, 16, 3, 26);
    g.fillStyle(level === 3 ? 0xf4c542 : 0xd9463e);
    g.fillTriangle(77, 16, 96, 22, 77, 29);
  }
}

function drawTowers(scene: Phaser.Scene): void {
  const drawers: Record<string, (g: Phaser.GameObjects.Graphics, lv: number) => void> = {
    arrow: drawArrowTower,
    mage: drawMageTower,
    cannon: drawCannonTower,
    barracks: drawBarracks
  };
  for (const [type, draw] of Object.entries(drawers)) {
    for (let lv = 1; lv <= 3; lv++) {
      tex(scene, `tower-${type}-${lv}`, type === 'barracks' ? 100 : 80, 110, (g) => draw(g, lv));
    }
  }
}

/* ---------------- 角色 ---------------- */

function drawCharacters(scene: Phaser.Scene): void {
  tex(scene, 'soldier', 36, 44, (g) => {
    outline(g, 2.5);
    // 身体
    g.fillStyle(0x4f8fdd);
    g.fillRoundedRect(10, 18, 16, 18, 4);
    g.strokeRoundedRect(10, 18, 16, 18, 4);
    // 头
    g.fillStyle(0xf0c8a0);
    g.fillCircle(18, 12, 8);
    g.strokeCircle(18, 12, 8);
    // 头盔
    g.fillStyle(0xc9cdd6);
    g.fillRoundedRect(9, 2, 18, 10, { tl: 8, tr: 8, bl: 0, br: 0 });
    g.strokeRoundedRect(9, 2, 18, 10, { tl: 8, tr: 8, bl: 0, br: 0 });
    g.fillStyle(0xd9463e);
    g.fillTriangle(18, 0, 24, 4, 18, 6);
    // 眼
    g.fillStyle(INK);
    g.fillCircle(21, 13, 1.6);
    // 盾
    g.fillStyle(0x3f6fb5);
    g.fillRoundedRect(2, 20, 10, 14, 3);
    g.strokeRoundedRect(2, 20, 10, 14, 3);
    g.lineStyle(2, 0xf4c542);
    g.lineBetween(7, 22, 7, 32);
    // 剑
    g.fillStyle(0xd7dbe2);
    g.fillRect(29, 12, 3, 18);
    g.fillStyle(0x8a5a33);
    g.fillRect(27, 28, 7, 3);
    // 腿
    g.fillStyle(0x3a3f4c);
    g.fillRect(12, 36, 5, 7);
    g.fillRect(20, 36, 5, 7);
  });

  tex(scene, 'goblin', 40, 44, (g) => {
    outline(g, 2.5);
    // 身体
    g.fillStyle(0x6fae4c);
    g.fillRoundedRect(12, 20, 16, 16, 5);
    g.strokeRoundedRect(12, 20, 16, 16, 5);
    // 头
    g.fillStyle(0x7cc257);
    g.fillCircle(20, 13, 9);
    g.strokeCircle(20, 13, 9);
    // 尖耳
    g.fillStyle(0x7cc257);
    g.fillTriangle(11, 11, 2, 6, 12, 16);
    g.strokeTriangle(11, 11, 2, 6, 12, 16);
    g.fillTriangle(29, 11, 38, 6, 28, 16);
    g.strokeTriangle(29, 11, 38, 6, 28, 16);
    // 眼 & 嘴
    g.fillStyle(0xd9463e);
    g.fillCircle(17, 12, 2);
    g.fillCircle(24, 12, 2);
    g.lineStyle(2, INK);
    g.lineBetween(16, 18, 25, 18);
    // 腰布
    g.fillStyle(0x8a5a33);
    g.fillRect(12, 30, 16, 6);
    // 匕首
    g.fillStyle(0xd7dbe2);
    g.fillTriangle(33, 22, 37, 30, 31, 30);
    // 腿
    g.fillStyle(0x5c9440);
    g.fillRect(14, 36, 5, 7);
    g.fillRect(22, 36, 5, 7);
  });

  tex(scene, 'wolf', 56, 36, (g) => {
    outline(g, 2.5);
    // 身体
    g.fillStyle(0x7d8291);
    g.fillEllipse(26, 20, 34, 18);
    g.strokeEllipse(26, 20, 34, 18);
    // 头
    g.fillStyle(0x8d92a1);
    g.fillCircle(44, 14, 9);
    g.strokeCircle(44, 14, 9);
    // 吻部
    g.fillStyle(0x8d92a1);
    g.fillRoundedRect(48, 13, 8, 6, 2);
    g.strokeRoundedRect(48, 13, 8, 6, 2);
    g.fillStyle(INK);
    g.fillCircle(55, 15, 1.8);
    // 耳
    g.fillStyle(0x6a6f7d);
    g.fillTriangle(39, 7, 42, 0, 45, 7);
    g.fillTriangle(45, 7, 48, 1, 50, 8);
    // 眼
    g.fillStyle(0xf4c542);
    g.fillCircle(45, 12, 2);
    // 尾
    g.fillStyle(0x6a6f7d);
    g.fillTriangle(9, 18, 0, 10, 12, 24);
    // 腿
    g.fillStyle(0x5d6270);
    g.fillRect(14, 26, 4, 9);
    g.fillRect(24, 27, 4, 9);
    g.fillRect(34, 26, 4, 9);
  });

  tex(scene, 'ogre', 64, 72, (g) => {
    outline(g, 3);
    // 大肚身体
    g.fillStyle(0xc99a6b);
    g.fillEllipse(30, 46, 40, 42);
    g.strokeEllipse(30, 46, 40, 42);
    // 肚皮
    g.fillStyle(0xe0b98c);
    g.fillEllipse(30, 52, 24, 24);
    // 头
    g.fillStyle(0xc99a6b);
    g.fillCircle(30, 17, 11);
    g.strokeCircle(30, 17, 11);
    // 眼
    g.fillStyle(0xd9463e);
    g.fillCircle(26, 15, 2.2);
    g.fillCircle(35, 15, 2.2);
    g.lineStyle(2.5, INK);
    g.lineBetween(24, 23, 37, 23);
    // 獠牙
    g.fillStyle(0xfff6e0);
    g.fillTriangle(26, 23, 29, 23, 27, 27);
    g.fillTriangle(33, 23, 36, 23, 35, 27);
    // 护肩
    g.fillStyle(0x6e4a2a);
    g.fillRoundedRect(6, 28, 16, 10, 4);
    g.strokeRoundedRect(6, 28, 16, 10, 4);
    // 大棒
    g.fillStyle(0x8a5a33);
    g.fillRoundedRect(48, 18, 9, 34, 4);
    g.strokeRoundedRect(48, 18, 9, 34, 4);
    g.fillStyle(0x6e4a2a);
    g.fillEllipse(52, 16, 16, 18);
    g.strokeEllipse(52, 16, 16, 18);
    g.fillStyle(0xd7dbe2);
    g.fillCircle(49, 12, 2);
    g.fillCircle(56, 17, 2);
    // 腿
    g.fillStyle(0xb08050);
    g.fillRect(18, 62, 9, 9);
    g.fillRect(34, 62, 9, 9);
  });
}

/* ---------------- 弹道 ---------------- */

function drawProjectiles(scene: Phaser.Scene): void {
  tex(scene, 'proj-arrow', 20, 8, (g) => {
    g.fillStyle(0x8a5a33);
    g.fillRect(2, 3, 12, 2);
    g.fillStyle(0xd7dbe2);
    g.fillTriangle(14, 0, 20, 4, 14, 8);
    g.fillStyle(0xd9463e);
    g.fillTriangle(0, 1, 5, 4, 0, 7);
  });
  tex(scene, 'proj-magic', 18, 18, (g) => {
    g.fillStyle(0xa06be0, 0.4);
    g.fillCircle(9, 9, 8);
    g.fillStyle(0xc79bf0);
    g.fillCircle(9, 9, 5);
    g.fillStyle(0xf0e4ff);
    g.fillCircle(8, 8, 2);
  });
  tex(scene, 'proj-cannonball', 14, 14, (g) => {
    outline(g, 2);
    g.fillStyle(0x3a3f4c);
    g.fillCircle(7, 7, 5.5);
    g.strokeCircle(7, 7, 5.5);
    g.fillStyle(0x6a7080);
    g.fillCircle(5.5, 5.5, 1.8);
  });
}

/* ---------------- 场景元素 ---------------- */

function drawScenery(scene: Phaser.Scene): void {
  // 建造地基
  tex(scene, 'spot', 96, 72, (g) => {
    outline(g);
    g.fillStyle(0x9c7a4e);
    g.fillEllipse(48, 44, 84, 44);
    g.strokeEllipse(48, 44, 84, 44);
    g.fillStyle(0xb5905e);
    g.fillEllipse(48, 40, 70, 34);
    g.lineStyle(2.5, 0x6e4a2a);
    g.strokeEllipse(48, 40, 62, 28);
    // 木牌 + 锤子
    g.fillStyle(0x8a5a33);
    g.fillRect(44, 12, 6, 22);
    g.fillStyle(0xd9c294);
    g.fillRoundedRect(30, 2, 34, 18, 4);
    g.strokeRoundedRect(30, 2, 34, 18, 4);
    g.fillStyle(0x5e3d20);
    g.fillRect(42, 7, 10, 4);
    g.fillRect(45, 7, 4, 10);
  });

  // 城堡（原创门楼造型）
  tex(scene, 'castle', 210, 200, (g) => {
    outline(g, 3.5);
    // 主墙
    g.fillStyle(0xa8a29a);
    g.fillRect(40, 80, 130, 110);
    g.strokeRect(40, 80, 130, 110);
    // 垛口
    for (let i = 0; i < 5; i++) {
      g.fillStyle(0xa8a29a);
      g.fillRect(42 + i * 26, 66, 16, 18);
      g.strokeRect(42 + i * 26, 66, 16, 18);
    }
    // 双塔
    for (const tx of [18, 150]) {
      g.fillStyle(0xb5b0a6);
      g.fillRect(tx, 46, 42, 144);
      g.strokeRect(tx, 46, 42, 144);
      g.fillStyle(0x4f8fdd);
      g.fillTriangle(tx - 6, 48, tx + 48, 48, tx + 21, 8);
      g.strokeTriangle(tx - 6, 48, tx + 48, 48, tx + 21, 8);
      g.fillStyle(0x3a2a1a);
      g.fillRect(tx + 15, 70, 12, 16);
      g.fillStyle(0x8a5a33);
      g.fillRect(tx + 19, 0, 3, 12);
      g.fillStyle(0xf4c542);
      g.fillTriangle(tx + 22, 0, tx + 40, 5, tx + 22, 10);
    }
    // 城门
    g.fillStyle(0x5e3d20);
    g.fillRoundedRect(82, 120, 46, 70, { tl: 22, tr: 22, bl: 0, br: 0 });
    g.strokeRoundedRect(82, 120, 46, 70, { tl: 22, tr: 22, bl: 0, br: 0 });
    g.lineStyle(2.5, 0x3a2a1a);
    for (let i = 1; i < 4; i++) g.lineBetween(82 + i * 11.5, 128, 82 + i * 11.5, 188);
    // 盾徽
    g.fillStyle(0x4f8fdd);
    g.fillCircle(105, 100, 12);
    g.strokeCircle(105, 100, 12);
    g.lineStyle(3, 0xf4c542);
    g.lineBetween(105, 92, 105, 108);
    g.lineBetween(97, 100, 113, 100);
  });

  // 树木（阔叶）
  tex(scene, 'tree-1', 92, 112, (g) => {
    outline(g);
    g.fillStyle(0x8a5a33);
    g.fillRect(40, 74, 12, 32);
    g.strokeRect(40, 74, 12, 32);
    g.fillStyle(0x4c8f3f);
    g.fillCircle(46, 44, 32);
    g.strokeCircle(46, 44, 32);
    g.fillStyle(0x63aa4e);
    g.fillCircle(34, 36, 18);
    g.fillCircle(58, 34, 15);
    g.fillStyle(0x7cc257);
    g.fillCircle(40, 28, 9);
  });
  // 松树
  tex(scene, 'tree-2', 70, 96, (g) => {
    outline(g);
    g.fillStyle(0x6e4a2a);
    g.fillRect(30, 74, 10, 18);
    g.strokeRect(30, 74, 10, 18);
    g.fillStyle(0x2f6e46);
    g.fillTriangle(6, 78, 64, 78, 35, 40);
    g.strokeTriangle(6, 78, 64, 78, 35, 40);
    g.fillStyle(0x3f8a58);
    g.fillTriangle(12, 58, 58, 58, 35, 24);
    g.strokeTriangle(12, 58, 58, 58, 35, 24);
    g.fillStyle(0x4fa768);
    g.fillTriangle(18, 40, 52, 40, 35, 8);
    g.strokeTriangle(18, 40, 52, 40, 35, 8);
  });
  tex(scene, 'bush', 52, 36, (g) => {
    outline(g, 2.5);
    g.fillStyle(0x5c9440);
    g.fillCircle(16, 22, 12);
    g.fillCircle(34, 22, 13);
    g.fillCircle(26, 14, 11);
    g.fillStyle(0x7cc257);
    g.fillCircle(22, 14, 5);
  });
  tex(scene, 'rock', 44, 32, (g) => {
    outline(g, 2.5);
    g.fillStyle(0x9a958c);
    g.fillPoints([
      new Phaser.Geom.Point(6, 28), new Phaser.Geom.Point(2, 16), new Phaser.Geom.Point(14, 4),
      new Phaser.Geom.Point(30, 6), new Phaser.Geom.Point(40, 18), new Phaser.Geom.Point(36, 28)
    ], true);
    g.fillStyle(0xb5b0a6);
    g.fillTriangle(14, 8, 26, 8, 18, 18);
  });
  tex(scene, 'flower', 16, 16, (g) => {
    g.fillStyle(0xf2e3c2);
    for (let i = 0; i < 5; i++) {
      const a = (i * Math.PI * 2) / 5;
      g.fillCircle(8 + Math.cos(a) * 4, 8 + Math.sin(a) * 4, 3);
    }
    g.fillStyle(0xf4c542);
    g.fillCircle(8, 8, 3);
  });
}

/* ---------------- 大背景 ---------------- */

function drawMenuBackground(scene: Phaser.Scene): void {
  tex(scene, 'bg-menu', GAME_WIDTH, GAME_HEIGHT, (g) => {
    // 天空渐变
    g.fillGradientStyle(0x8ecae6, 0x8ecae6, 0xf7e1b5, 0xf7e1b5, 1);
    g.fillRect(0, 0, GAME_WIDTH, 480);
    // 太阳
    g.fillStyle(0xfff3c4, 0.9);
    g.fillCircle(1050, 120, 56);
    g.fillStyle(0xffe08a, 0.5);
    g.fillCircle(1050, 120, 78);
    // 远山
    g.fillStyle(0x7fa8c9);
    g.fillTriangle(-80, 480, 320, 190, 700, 480);
    g.fillTriangle(420, 480, 820, 230, 1240, 480);
    g.fillStyle(0x9dbdd8);
    g.fillTriangle(760, 480, 1120, 260, 1480, 480);
    // 山丘上的城堡剪影
    g.fillStyle(0x5c7d99);
    g.fillEllipse(640, 560, 760, 260);
    g.fillStyle(0x46617a);
    g.fillRect(560, 300, 160, 130);
    g.fillRect(530, 260, 40, 170);
    g.fillRect(710, 260, 40, 170);
    g.fillTriangle(524, 262, 576, 262, 550, 216);
    g.fillTriangle(704, 262, 756, 262, 730, 216);
    g.fillTriangle(556, 302, 724, 302, 640, 240);
    // 前景草地
    g.fillStyle(0x63aa4e);
    g.fillRect(0, 470, GAME_WIDTH, 250);
    g.fillStyle(0x5c9440);
    g.fillEllipse(200, 720, 700, 240);
    g.fillEllipse(1100, 740, 800, 260);
    // 前景树
    g.fillStyle(0x6e4a2a);
    g.fillRect(96, 500, 20, 80);
    g.fillStyle(0x3f8a58);
    g.fillCircle(106, 470, 64);
    g.fillStyle(0x4fa768);
    g.fillCircle(84, 450, 34);
    g.fillStyle(0x6e4a2a);
    g.fillRect(1170, 520, 18, 70);
    g.fillStyle(0x2f6e46);
    g.fillTriangle(1110, 540, 1250, 540, 1180, 400);
    g.fillStyle(0x3f8a58);
    g.fillTriangle(1124, 480, 1236, 480, 1180, 370);
  });
}

function drawWorldBackground(scene: Phaser.Scene): void {
  tex(scene, 'bg-world', GAME_WIDTH, GAME_HEIGHT, (g) => {
    // 羊皮纸
    g.fillStyle(0xe8d5a8);
    g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    g.fillStyle(0xd9c294, 0.7);
    g.fillRect(0, 0, GAME_WIDTH, 26);
    g.fillRect(0, GAME_HEIGHT - 26, GAME_WIDTH, 26);
    g.fillRect(0, 0, 26, GAME_HEIGHT);
    g.fillRect(GAME_WIDTH - 26, 0, 26, GAME_HEIGHT);
    const rnd = mulberry32(7);
    // 纸面斑驳
    for (let i = 0; i < 60; i++) {
      g.fillStyle(0xcbb283, 0.25);
      g.fillEllipse(rnd() * GAME_WIDTH, rnd() * GAME_HEIGHT, 40 + rnd() * 90, 20 + rnd() * 40);
    }
    // 河流
    g.lineStyle(16, 0x8fb8d8, 0.9);
    g.strokePoints([
      new Phaser.Geom.Point(980, 0), new Phaser.Geom.Point(940, 160),
      new Phaser.Geom.Point(1010, 320), new Phaser.Geom.Point(960, 520),
      new Phaser.Geom.Point(1040, 720)
    ], false, false);
    // 山脉装饰
    for (const [mx, my, s] of [[180, 130, 1], [260, 150, 0.8], [1100, 120, 1.1], [1180, 150, 0.8]] as const) {
      g.fillStyle(0xb09a6e);
      g.fillTriangle(mx - 46 * s, my + 34 * s, mx + 46 * s, my + 34 * s, mx, my - 30 * s);
      g.fillStyle(0xf2e3c2);
      g.fillTriangle(mx - 12 * s, my - 10 * s, mx + 12 * s, my - 10 * s, mx, my - 30 * s);
    }
    // 森林装饰
    const rnd2 = mulberry32(21);
    for (let i = 0; i < 26; i++) {
      const tx = 90 + rnd2() * 500;
      const ty = 420 + rnd2() * 220;
      g.fillStyle(0x6f8f4f);
      g.fillCircle(tx, ty, 12 + rnd2() * 8);
      g.fillStyle(0x55703c);
      g.fillCircle(tx - 4, ty + 4, 6);
    }
    // 虚线路线
    g.lineStyle(4, 0x8a5a33, 0.85);
    const route = [
      new Phaser.Geom.Point(250, 560), new Phaser.Geom.Point(430, 470),
      new Phaser.Geom.Point(620, 500), new Phaser.Geom.Point(800, 380),
      new Phaser.Geom.Point(1020, 420)
    ];
    for (let i = 0; i < route.length - 1; i++) {
      const a = route[i];
      const b = route[i + 1];
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      const dashes = Math.floor(len / 22);
      for (let d = 0; d < dashes; d++) {
        const t0 = d / dashes;
        const t1 = t0 + 0.45 / dashes;
        g.lineBetween(a.x + (b.x - a.x) * t0, a.y + (b.y - a.y) * t0, a.x + (b.x - a.x) * t1, a.y + (b.y - a.y) * t1);
      }
    }
    // 罗盘
    g.lineStyle(3, 0x8a5a33);
    g.strokeCircle(1150, 600, 44);
    g.fillStyle(0x8a5a33);
    g.fillTriangle(1150, 566, 1160, 600, 1140, 600);
    g.fillStyle(0xd9463e);
    g.fillTriangle(1150, 634, 1160, 600, 1140, 600);
  });
}

/** 战斗地图背景：草地 + 道路 + 装饰，全部烘焙进一张贴图 */
export function generateBattleBackground(scene: Phaser.Scene, level: LevelConfig): void {
  const key = `bg-battle-${level.id}`;
  if (scene.textures.exists(key)) return;
  const g = scene.make.graphics({});
  // 草地
  g.fillStyle(0x6fae5c);
  g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  const rnd = mulberry32(99);
  for (let i = 0; i < 90; i++) {
    g.fillStyle(rnd() > 0.5 ? 0x65a455 : 0x79b866, 0.5);
    g.fillEllipse(rnd() * GAME_WIDTH, rnd() * GAME_HEIGHT, 30 + rnd() * 80, 14 + rnd() * 30);
  }
  // 道路（三层描边形成圆润土路）
  for (const path of level.paths) {
    const pts = path.map((p) => new Phaser.Geom.Point(p.x, p.y));
    g.lineStyle(58, 0x9c7a4e, 1);
    g.strokePoints(pts, false, false);
    g.lineStyle(48, 0xc9a36a, 1);
    g.strokePoints(pts, false, false);
    g.lineStyle(38, 0xd7b57e, 1);
    g.strokePoints(pts, false, false);
    for (let i = 1; i < path.length - 1; i++) {
      g.fillStyle(0x9c7a4e);
      g.fillCircle(path[i].x, path[i].y, 29);
      g.fillStyle(0xc9a36a);
      g.fillCircle(path[i].x, path[i].y, 24);
      g.fillStyle(0xd7b57e);
      g.fillCircle(path[i].x, path[i].y, 19);
    }
    // 路面碎石
    const rndP = mulberry32(path.length * 13 + 5);
    for (let i = 0; i < path.length - 1; i++) {
      const a = path[i];
      const b = path[i + 1];
      const n = Math.floor(Math.hypot(b.x - a.x, b.y - a.y) / 46);
      for (let k = 0; k < n; k++) {
        const t = (k + 0.5) / n;
        const px = a.x + (b.x - a.x) * t + (rndP() - 0.5) * 22;
        const py = a.y + (b.y - a.y) * t + (rndP() - 0.5) * 22;
        g.fillStyle(0xb5905e, 0.8);
        g.fillEllipse(px, py, 7, 4);
      }
    }
  }
  // 装饰物散布：避开道路 / 塔位 / 城堡
  const blocked = (p: Vec2): boolean => {
    for (const path of level.paths) {
      for (let i = 0; i < path.length - 1; i++) {
        const a = path[i];
        const b = path[i + 1];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const lenSq = dx * dx + dy * dy;
        const t = lenSq === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq));
        if (Math.hypot(p.x - (a.x + dx * t), p.y - (a.y + dy * t)) < 62) return true;
      }
    }
    for (const s of level.buildSpots) if (Math.hypot(p.x - s.x, p.y - s.y) < 70) return true;
    if (Math.hypot(p.x - level.castle.x, p.y - level.castle.y) < 130) return true;
    return p.y < 70;
  };
  const rndD = mulberry32(2026);
  const decoKeys = ['tree-1', 'tree-2', 'bush', 'rock', 'flower'] as const;
  const placed: { p: Vec2; kind: (typeof decoKeys)[number]; scale: number }[] = [];
  let attempts = 0;
  while (placed.length < 46 && attempts < 600) {
    attempts++;
    const p = { x: 30 + rndD() * (GAME_WIDTH - 60), y: 90 + rndD() * (GAME_HEIGHT - 120) };
    if (blocked(p)) continue;
    if (placed.some((q) => Math.hypot(p.x - q.p.x, p.y - q.p.y) < 52)) continue;
    const kind = decoKeys[Math.floor(rndD() * decoKeys.length)];
    const scale = kind === 'flower' ? 1 : 0.7 + rndD() * 0.4;
    placed.push({ p, kind, scale });
  }
  // 按 y 排序，近处装饰盖住远处，形成层次
  placed.sort((a, b) => a.p.y - b.p.y);
  g.generateTexture(`${key}-base`, GAME_WIDTH, GAME_HEIGHT);
  g.destroy();

  // 用离屏 RenderTexture 把装饰物烘焙进背景
  const rt = scene.make.renderTexture({ width: GAME_WIDTH, height: GAME_HEIGHT }, false);
  rt.draw(`${key}-base`, 0, 0);
  for (const d of placed) {
    const img = scene.make.image({ key: d.kind }, false);
    img.setScale(d.scale);
    rt.draw(img, d.p.x, d.p.y);
    img.destroy();
  }
  rt.saveTexture(key);
  rt.destroy();
  scene.textures.remove(`${key}-base`);
}

/** Boot 阶段生成全部通用贴图 */
export function generateAllTextures(scene: Phaser.Scene): void {
  drawIcons(scene);
  drawTowers(scene);
  drawCharacters(scene);
  drawProjectiles(scene);
  drawScenery(scene);
  drawMenuBackground(scene);
  drawWorldBackground(scene);
}