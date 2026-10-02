/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        finp: {
          teal: '#006874',
          'teal-light': '#97F0FF',
          'teal-dark': '#001F24',
          blue: '#006399',
          'blue-light': '#CFE5FF',
          'blue-dark': '#001D34',
          coral: '#9B4000',
          'coral-light': '#FFDBCF',
          'coral-dark': '#381000',
          surface: '#F4FAFC',
          'surface-variant': '#DBE4E6',
        }
      }
    },
  },
  plugins: [],
}
