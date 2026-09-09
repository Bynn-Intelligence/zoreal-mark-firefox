import { crx } from '@crxjs/vite-plugin';
import { defineConfig } from 'vite';
import manifest from './src/manifest.js';

export default defineConfig({
  // CRXJS's Firefox mode: the background is an event page declared under
  // background.scripts, and web_accessible_resources carry no use_dynamic_url,
  // which Firefox does not know.
  plugins: [crx({ manifest, browser: 'firefox' })],
  build: {
    target: 'es2022',
    sourcemap: false,
    rollupOptions: {
      input: {
        popup: 'src/popup/index.html',
        options: 'src/options/index.html',
      },
    },
  },
  server: {
    port: 5190,
    strictPort: true,
    hmr: { port: 5190 },
  },
});
