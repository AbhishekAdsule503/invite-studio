import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#FAF5F6',
          100: '#F4E7EB',
          200: '#E7CFD7',
          300: '#D5A7B6',
          400: '#B06982',
          500: '#5C2032', // Secondary Wine (#5C2032)
          600: '#401526', // Primary Burgundy (#401526)
          700: '#33101E', // Dark Burgundy hover
          800: '#250B16', // Deep Burgundy
          900: '#1A060E', // Darkest Burgundy
          accent: '#D8B66E', // Champagne Gold (#D8B66E)
          gold: '#D8B66E',
          wine: '#5C2032',
          burgundy: '#401526',
          hover: '#33101E',
        },
        surface: {
          ivory: '#F8F3EB',  // Warm Ivory (#F8F3EB)
          warm: '#F3ECE2',   // Warm Ivory hover / fill
          muted: '#EBE2D5',  // Muted warm tone
          card: '#FFFDFC',   // Soft White (#FFFDFC)
          border: '#E9DED1', // Border (#E9DED1)
        },
        charcoal: {
          900: '#34232B', // Dark Text (#34232B)
          800: '#44323A',
          700: '#57464E',
          600: '#6E5E65',
          500: '#887A78', // Muted Text (#887A78)
          400: '#A69A98',
        },
        // Direct Semantic Theme Palette
        burgundy: '#401526',
        wine: '#5C2032',
        gold: {
          DEFAULT: '#D8B66E',
          50: '#FDFBF7',
          100: '#FAF4E8',
          200: '#F4E6CB',
          300: '#EBD4A5',
          400: '#E1C283',
          500: '#D8B66E',
          600: '#C29C50',
          700: '#9E7C35',
        },
        ivory: '#F8F3EB',
        softwhite: '#FFFDFC',
        darktext: '#34232B',
        mutedtext: '#887A78',
        warmborder: '#E9DED1',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['var(--font-jakarta)', 'var(--font-inter)', 'system-ui', 'sans-serif'],
        serif: ['var(--font-serif)', 'Playfair Display', 'Cormorant Garamond', 'Georgia', 'serif']
      }
    },
  },
  plugins: [],
};

export default config;

