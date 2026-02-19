/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1B5E20',
          light: '#2E7D32',
          dark: '#0D3D12',
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
