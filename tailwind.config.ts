import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      spacing: {
        13: '3.25rem',
        18: '4.5rem',
      },
      colors: {
        navy: '#0B1F33',
        ink: '#102033',
        steel: '#536270',
        mist: '#F4F6F8',
        line: '#D9E2EC',
        graphite: '#565B61',
        graphiteDark: '#353A40',
        signal: '#B84A00',
        signalLight: '#FFB066',
      },
      boxShadow: {
        card: '0 10px 28px rgba(16, 32, 51, 0.09)',
      },
    },
  },
  plugins: [],
};

export default config;
