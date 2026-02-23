/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        brand: ['Lobster', 'cursive'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: {
          DEFAULT: '#bd1826',
          light: '#d42a38',
          dark: '#8f1019',
        },
        secondary: {
          DEFAULT: '#FF8F00',
          light: '#FFB74D',
          dark: '#E65100',
        },
      },
    },
  },
  plugins: [],
}
