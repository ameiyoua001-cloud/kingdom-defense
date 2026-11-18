import { defineConfig } from 'vite';

export default defineConfig({
  // 相对路径打包，方便部署到任意子目录或静态托管
  base: './',
  server: {
    host: true,
    port: 5173
  },
  build: {
    target: 'es2020',
    // Phaser 本体较大，单独提示阈值放宽
    chunkSizeWarningLimit: 2000
  }
});