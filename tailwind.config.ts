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
        navy: 'rgb(var(--brand-navy-rgb) / <alpha-value>)',
        ink: 'rgb(var(--brand-navy-rgb) / <alpha-value>)',
        steel: '#536270',
        mist: '#F4F6F8',
        line: '#D9E2EC',
        graphite: '#565B61',
        graphiteDark: '#353A40',
        signal: 'rgb(var(--brand-primary-rgb) / <alpha-value>)',
        signalHover: 'rgb(var(--brand-primary-hover-rgb) / <alpha-value>)',
        signalSoft: 'rgb(var(--brand-primary-soft-rgb) / <alpha-value>)',
        signalLight: 'rgb(var(--brand-primary-soft-rgb) / <alpha-value>)',
        brandSecondary: 'rgb(var(--brand-secondary-rgb) / <alpha-value>)',
        brandAccent: 'rgb(var(--brand-accent-rgb) / <alpha-value>)',
        brandFocus: 'var(--brand-focus-ring)',
        contactAction: 'var(--contact-action-bg)',
        contactActionHover: 'var(--contact-action-hover)',
        contactActionFocus: 'var(--contact-action-focus)',
        statusAttention: 'var(--status-attention)',
        statusSuccessAccent: 'var(--status-success-accent)',
        statusSuccessSurface: 'var(--status-success-surface)',
      },
      boxShadow: {
        card: '0 10px 28px rgba(16, 32, 51, 0.09)',
      },
    },
  },
  plugins: [],
};

export default config;
