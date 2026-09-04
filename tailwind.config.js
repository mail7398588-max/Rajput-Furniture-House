/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#FFF9E6',
          100: '#FFF0BF',
          200: '#FFE699',
          300: '#FFDB73',
          400: '#FFD14D',
          500: '#FFC726',
          600: '#E6A800',
          700: '#B38300',
          800: '#805E00',
          900: '#4D3800',
        },
        warm: {
          50: '#FEFCF8',
          100: '#FDF8EE',
          200: '#FAF0DC',
          300: '#F5E4C3',
          400: '#EDD5A3',
          500: '#E2C27D',
          600: '#C9A55C',
          700: '#A88542',
          800: '#7D6230',
          900: '#52401F',
        },
        sidebar: {
          DEFAULT: '#1A1A2E',
          light: '#252542',
          accent: '#FFC726',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
