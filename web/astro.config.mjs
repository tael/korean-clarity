import react from '@astrojs/react';
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://tael.github.io',
  base: '/korean-clarity/',
  trailingSlash: 'always',
  integrations: [react()],
  vite: {
    optimizeDeps: {
      include: ['@korean-clarity/analyzer'],
    },
  },
});
