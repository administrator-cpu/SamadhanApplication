/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class', 
  content: [
    "./app/**/*.{js,jsx,ts,tsx}", 
    "./src/**/*.{js,jsx,ts,tsx}", 
    "./components/**/*.{js,jsx,ts,tsx}" 
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        brand: {
          pink: '#FF00FF',   // Top stripe
          yellow: '#FFFF00', // Second stripe
          white: '#FFFFFF',  // Third stripe
          black: '#000000',  // Fourth stripe
          navy: '#0A0A2A',   // Bottom stripe
        }
      }
    },
  },
  plugins: [],
}