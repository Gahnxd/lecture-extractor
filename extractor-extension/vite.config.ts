import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { viteStaticCopy } from 'vite-plugin-static-copy';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    viteStaticCopy({
      targets: [
        {
          src: 'public/manifest.json',
          dest: '.',
        }
      ],
    }),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'build',
    rollupOptions: {
      input: {
        main: './index.html',
        background: resolve(__dirname, 'src/background.ts'),
        content_script: resolve(__dirname, 'src/content_script.ts'),
        injected: resolve(__dirname, 'src/injected.ts'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          // Keep background, content_script, and injected at root level with simple names
          if (['background', 'content_script', 'injected'].includes(chunkInfo.name)) {
            return '[name].js';
          }
          return 'assets/[name]-[hash].js';
        },
      },
    },
  },
});