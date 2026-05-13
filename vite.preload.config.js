import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: path.resolve(__dirname, 'preload.js'),
      formats: ['cjs'],
      fileName: () => 'preload.js',
    },
    outDir: 'dist-electron',
    emptyOutDir: false,
    rollupOptions: {
      external: ['electron'],
    },
  },
});
