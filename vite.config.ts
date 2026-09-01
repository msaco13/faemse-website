import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// BASE_PATH lets CI build for a subpath host (e.g. GitHub Pages serves
// from /faemse-website/). Defaults to site root for local dev and custom domains.
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [react()],
  build: {
    // Sourcemaps in production: if anything ever crashes, the error card and
    // console point at real file/line names instead of minified identifiers.
    sourcemap: true,
    rollupOptions: {
      output: {
        // Vendor code changes far less often than site code; splitting it out
        // lets returning visitors keep React and the Supabase client cached
        // across site deploys.
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
  },
});
