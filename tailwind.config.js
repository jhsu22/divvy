/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        body: ['"IM Fell English"', 'Georgia', 'serif'],
        mono: ['"Courier Prime"', 'Courier New', 'monospace'],
      },
      colors: {
        paper: '#f9f7f2',
        ink: '#1a1a18',
      },
    },
  },
  plugins: [],
}
