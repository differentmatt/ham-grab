/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Semantic color names using CSS variables
        'bg': 'var(--color-bg)',
        'card': 'var(--color-card)',
        'input': 'var(--color-input)',
        'surface': 'var(--color-surface)',
        'muted': 'var(--color-text-muted)',
        'border': 'var(--color-border)',
        'primary': {
          DEFAULT: 'var(--color-primary)',
          hover: 'var(--color-primary-hover)',
        },
        'success': {
          DEFAULT: 'var(--color-success)',
          hover: 'var(--color-success-hover)',
        },
        'warning': {
          DEFAULT: 'var(--color-warning)',
          hover: 'var(--color-warning-hover)',
        },
      },
      textColor: {
        DEFAULT: 'var(--color-text)',
        muted: 'var(--color-text-muted)',
        light: 'var(--color-text-light)',
      },
    },
  },
  plugins: [],
};
