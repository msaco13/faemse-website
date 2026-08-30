import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// BASE_PATH lets CI build for a subpath host (e.g. GitHub Pages serves
// from /faemse-website/). Defaults to site root for local dev and custom domains.
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [react()],
  // Sourcemaps in production: if anything ever crashes, the error card and
  // console point at real file/line names instead of minified identifiers.
  build: { sourcemap: true },
});
