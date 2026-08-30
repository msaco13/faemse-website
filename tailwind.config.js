/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0A1B33',
        ink2: '#060F20',
        paper: '#F3F6FB',
        brand: {
          blue: '#2F6BFF',
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
