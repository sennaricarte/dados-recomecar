// @ts-check
import { defineConfig } from 'astro/config';

// Site 100% estático (sem banco, sem servidor): `npm run build` gera ./dist
export default defineConfig({
  output: 'static',
  trailingSlash: 'always',
});
