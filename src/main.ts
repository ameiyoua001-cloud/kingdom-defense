import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from './core/constants';
import { BootScene, MainMenuScene } from './scenes/BootScene';
import { WorldMapScene } from './scenes/WorldMapScene';
import { BattleScene } from './scenes/BattleScene';
import { HUDScene } from './scenes/HUDScene';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game-container',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#14100c',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  render: {
    antialias: true,
    roundPixels: false
  },
  input: {
    activePointers: 3
  },
  scene: [BootScene, MainMenuScene, WorldMapScene, BattleScene, HUDScene]
});

/** 竖屏时显示旋转设备提示（手机横屏体验） */
const overlay = document.getElementById('rotate-overlay');
const portraitQuery = window.matchMedia('(orientation: portrait)');
const isTouchDevice = window.matchMedia('(pointer: coarse)').matches;
function syncOrientation(): void {
  if (!overlay) return;
  overlay.style.display = portraitQuery.matches && isTouchDevice ? 'flex' : 'none';
}
portraitQuery.addEventListener('change', syncOrientation);
syncOrientation();

// 页面隐藏时自动暂停音效上下文，避免后台发声
document.addEventListener('visibilitychange', () => {
  if (document.hidden) game.sound.pauseAll();
  else game.sound.resumeAll();
});