import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

// Every wording id the site's code can show (`virtual:text-ids`), for the
// Admin tab's launch pad: a saved wording change whose id isn't in here is no
// longer on any page. A quoted dotted name ('home.sponsors.text') counts as an
// id; a template like `${id}.sub` becomes a pattern. Generous on purpose: a
// stray match only means a leftover isn't flagged, never that a live one is.
function textIds(): Plugin {
  const VIRTUAL = 'virtual:text-ids';
  const RESOLVED = `\0${VIRTUAL}`;
  return {
    name: 'faemse-text-ids',
    resolveId: (id) => (id === VIRTUAL ? RESOLVED : null),
    load(id) {
      if (id !== RESOLVED) return null;
      const ids = new Set<string>();
      const patterns = new Set<string>();
      const scan = (src: string) => {
        for (const m of src.matchAll(/['"]([a-z][\w-]*(?:\.[\w-]+)+)['"]/g)) ids.add(m[1]);
        for (const m of src.matchAll(/`([^`]*\$\{[^`]*)`/g)) {
          const parts = m[1].split(/\$\{[^}]*\}/);
          if (!parts.every((p) => /^[\w.-]*$/.test(p)) || !parts.join('').includes('.')) continue;
          patterns.add(`^${parts.map((p) => p.replace(/[.-]/g, '\\$&')).join('[\\w.-]+')}$`);
        }
      };
      const walk = (dir: string) => {
        for (const name of readdirSync(dir)) {
          const path = join(dir, name);
          if (statSync(path).isDirectory()) walk(path);
          else if (/\.tsx?$/.test(name)) {
            this.addWatchFile(path);
            scan(readFileSync(path, 'utf8'));
          }
        }
      };
      walk(fileURLToPath(new URL('./src', import.meta.url)));
      return `export const ids = ${JSON.stringify([...ids].sort())};\nexport const patterns = ${JSON.stringify([...patterns].sort())};\n`;
    },
  };
}

// BASE_PATH lets CI build for a subpath host (e.g. GitHub Pages serves
// from /faemse-website/). Defaults to site root for local dev and custom domains.
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [react(), textIds()],
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
