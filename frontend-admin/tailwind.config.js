/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        glass: {
          DEFAULT: 'rgba(255, 255, 255, 0.03)',
          border: 'rgba(255, 255, 255, 0.08)',
          accent: 'rgba(0, 178, 255, 0.15)',
          borderAccent: 'rgba(0, 178, 255, 0.3)',
        },
        neon: {
          cyan: '#00b2ff',
          cyanDark: '#0088cc',
          yellow: '#ffca3a',
          green: '#2ecc93',
          blue: '#5d9cec',
        },
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        'glass-lg': '0 20px 40px 0 rgba(0, 0, 0, 0.45)',
        'neon-cyan': '0 0 20px rgba(0, 178, 255, 0.3)',
        'neon-cyan-lg': '0 0 40px rgba(0, 178, 255, 0.4)',
        'neon-yellow': '0 0 15px rgba(255, 202, 58, 0.25)',
      },
      backdropBlur: {
        xs: '2px',
        glass: '12px',
      },
    },
  },
  plugins: [],
}
