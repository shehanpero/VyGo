/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        /* Cold Luxury Palette — Silver/Chrome/Smoke with single saturated accent */
        surface: {
          50: '#f8fafc',   // slate-50
          100: '#f1f5f9',  // slate-100
          200: '#e2e8f0',  // slate-200
          300: '#cbd5e1',  // slate-300
          400: '#94a3b8',  // slate-400
          500: '#64748b',  // slate-500
          600: '#475569',  // slate-600
          700: '#334155',  // slate-700
          800: '#1e293b',  // slate-800
          900: '#0f172a',  // slate-900
          950: '#020617',  // slate-950 (base)
        },
        chrome: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        },
        /* Single saturated accent — Electric Cyan (replaces teal/nexus) */
        accent: {
          50: '#ecfeff',
          100: '#cffafe',
          200: '#a5f3fc',
          300: '#67e8f9',
          400: '#22d3ee',  // primary accent
          500: '#06b6d4',
          600: '#0891b2',
          700: '#0e7490',
          800: '#155e75',
          900: '#164e63',
        },
        /* Semantic aliases for backward compat */
        primary: {
          50: '#ecfeff',
          100: '#cffafe',
          200: '#a5f3fc',
          300: '#67e8f9',
          400: '#22d3ee',
          500: '#06b6d4',
          600: '#0891b2',
          700: '#0e7490',
          800: '#155e75',
          900: '#164e63',
        },
        expressway: {
          50: '#ecfeff',
          100: '#cffafe',
          200: '#a5f3fc',
          300: '#67e8f9',
          400: '#22d3ee',
          500: '#06b6d4',
          600: '#0891b2',
          700: '#0e7490',
          800: '#155e75',
          900: '#164e63',
        },
        nexus: {
          50: '#ecfeff',
          100: '#ecfeff',
          200: '#cffafe',
          300: '#a5f3fc',
          400: '#22d3ee',
          500: '#06b6d4',
          600: '#0891b2',
          700: '#0e7490',
          800: '#155e75',
          900: '#164e63',
        },
        /* Status colors */
        success: {
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
        },
        warning: {
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
        },
        danger: {
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
        },
      },
      fontFamily: {
        sans: ['Space Grotesk', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Orbitron', 'Space Grotesk', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      spacing: {
        'section-sm': '3rem',   // 48px
        section: '4.5rem',      // 72px
        'section-lg': '6rem',   // 96px
        'section-xl': '9rem',   // 144px
      },
      borderRadius: {
        tile: '0.75rem',   // 12px
        card: '1rem',      // 16px
        panel: '1.5rem',   // 24px
        pill: '9999px',
      },
      boxShadow: {
        'chrome-sm': '0 1px 2px 0 rgba(2, 6, 23, 0.05)',
        'chrome': '0 4px 6px -1px rgba(2, 6, 23, 0.1), 0 2px 4px -2px rgba(2, 6, 23, 0.1)',
        'chrome-lg': '0 10px 15px -3px rgba(2, 6, 23, 0.1), 0 4px 6px -4px rgba(2, 6, 23, 0.1)',
        'chrome-xl': '0 20px 25px -5px rgba(2, 6, 23, 0.1), 0 8px 10px -6px rgba(2, 6, 23, 0.1)',
        'chrome-2xl': '0 25px 50px -12px rgba(2, 6, 23, 0.25)',
        'accent-glow': '0 0 20px -5px rgba(34, 211, 238, 0.4), 0 10px 30px -10px rgba(34, 211, 238, 0.2)',
        'accent-glow-lg': '0 0 40px -10px rgba(34, 211, 238, 0.5), 0 20px 40px -15px rgba(34, 211, 238, 0.3)',
        'inner-chrome': 'inset 0 2px 4px 0 rgba(2, 6, 23, 0.05)',
        'glass': '0 8px 32px -8px rgba(2, 6, 23, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        'glass-lg': '0 24px 64px -16px rgba(2, 6, 23, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
      },
      animation: {
        'fade-in': 'fadeIn 0.6s ease-out forwards',
        'slide-up': 'slideUp 0.6s ease-out forwards',
        'slide-down': 'slideDown 0.4s ease-out forwards',
        'scale-in': 'scaleIn 0.4s ease-out forwards',
        'shimmer': 'shimmer 2s ease-in-out infinite',
        'pulse-soft': 'pulseSoft 3s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'rotate-slow': 'rotateSlow 20s linear infinite',
        'border-flow': 'borderFlow 8s linear infinite',
        'scan': 'scan 3s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        rotateSlow: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        borderFlow: {
          '0%': { backgroundPosition: '0% 50%' },
          '100%': { backgroundPosition: '100% 50%' },
        },
        scan: {
          '0%, 100%': { transform: 'translateX(-100%)', opacity: '0' },
          '20%, 80%': { opacity: '1' },
          '50%': { transform: 'translateX(100%)' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'chrome-gradient': 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #cbd5e1 100%)',
        'accent-gradient': 'linear-gradient(135deg, #22d3ee 0%, #06b6d4 50%, #0891b2 100%)',
        'mesh-gradient': 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(34,211,238,0.15), transparent), radial-gradient(ellipse 60% 40% at 100% 100%, rgba(34,211,238,0.1), transparent)',
      },
      transitionTimingFunction: {
        'premium': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'premium-slow': 'cubic-bezier(0.22, 1, 0.36, 1)',
        'snappy': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      transitionDuration: {
        '0': '0ms',
        '75': '75ms',
        '150': '150ms',
        '200': '200ms',
        '300': '300ms',
        '400': '400ms',
        '500': '500ms',
        '700': '700ms',
        '1000': '1000ms',
      },
    },
  },
  plugins: [],
}