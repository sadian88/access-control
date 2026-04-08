/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Open Sans"', 'system-ui', 'sans-serif'],
      },
      colors: {
        /* Light Blue React (Flatlogic) — desde template/_variables.scss */
        lb: {
          bg: '#1B1E3F',
          gradFrom: '#333867',
          gradTo: '#17193B',
          text: 'rgba(244, 244, 245, 0.9)',
          muted: '#C1C3CF',
          title: 'rgba(165, 167, 184, 0.31)',
          primary: '#2477ff',
          accent: '#e49400',
          widget: 'rgba(0, 0, 0, 0.24)',
          inverse: '#30314e',
        },
        glass: {
          DEFAULT: 'rgba(0, 0, 0, 0.24)',
          border: 'rgba(255, 255, 255, 0.08)',
          accent: 'rgba(36, 119, 255, 0.2)',
          borderAccent: 'rgba(36, 119, 255, 0.35)',
        },
      },
      boxShadow: {
        lb: '0 25px 20px -20px rgba(0, 0, 0, 0.1), 0 0 15px rgba(0, 0, 0, 0.06)',
        glass: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        'glass-lg': '0 20px 40px 0 rgba(0, 0, 0, 0.45)',
      },
      borderRadius: {
        widget: '10px',
      },
    },
  },
  plugins: [],
}
