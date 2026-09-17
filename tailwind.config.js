/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0A213B',
        ink2: '#04152A',
        paper: '#F3F6FB',
        brand: {
          // Darkened from #2F6BFF in Sept 2026. The old value measured 4.49:1
          // against white and 4.15:1 against the paper grey, just under the
          // 4.5:1 that WCAG 2.1 AA asks of body text, which put every link
          // and eyebrow on the site a hair under the line. This reads as the
          // same brand blue and clears it on both backgrounds, and white on
          // it (the Q&A filter chip) clears it too.
          blue: '#2560E8',
          bluesoft: '#7FA5EE',
          bluedeep: '#1A3F94',
          red: '#E5404A',
          redhot: '#FF5A62',
          green: '#3ADB8F',
          gold: '#DFAF37',
          goldsoft: '#F5CE5A',
          golddeep: '#B18516',
          goldink: '#8A660D',
        },
        body: '#13223C',
        muted: '#54637E',
        line: '#DFE6F1',
      },
      fontFamily: {
        disp: ['"Barlow Condensed"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        body: ['"Public Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      maxWidth: { wrap: '1180px' },
    },
  },
  plugins: [],
};
