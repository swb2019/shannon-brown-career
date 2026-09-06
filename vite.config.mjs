import { existsSync } from 'node:fs';
import { defineConfig } from 'vite';
export default defineConfig({
  root: existsSync('.openai/hosting.json') ? 'dist' : '.',
  server: { host: '0.0.0.0', allowedHosts: ['terminal.local'] },
});
