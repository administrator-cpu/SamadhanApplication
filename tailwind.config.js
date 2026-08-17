/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class', 
  content: [
    "./app/**/*.{js,jsx,ts,tsx}", 
    "./src/**/*.{js,jsx,ts,tsx}", 
    "./components/**/*.{js,jsx,ts,tsx}" 
  ],
 presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
  // Background & Surface — stark, high-contrast, not clinical
  bg: {
    base: '#fefdfc',      // warm white, not cream — brighter than before
    subtle: '#F5EBE0',    // soft warm tint for section separation
  },
  surface: {
    DEFAULT: '#FFFFFF',   // pure white now — max contrast against bold primary
    sunken: '#FBF3EA',
  },
  border: {
    DEFAULT: '#F0DFCC',
    strong: '#E0C4A0',
  },

  // Text — deep warm charcoal, not brown-black; reads crisper at small sizes
  text: {
    primary: '#241F1A',
    secondary: '#5C5348',
    tertiary: '#948A7C',
    'on-brand': '#FFFFFF',
  },

  // Brand / Primary — Vibrant Sunrise Coral
  // Punchy enough to demand attention, still rooted in orange/red warmth
  primary: {
    50: '#FFEDE5',
    100: '#FFD6C2',
    200: '#FFB08A',
    500: '#FF5A36',   // base — bold coral-orange, high saturation
    600: '#E8431F',   // hover/pressed — deeper, richer
    700: '#B8300F',   // text-on-light emphasis, active nav
    DEFAULT: '#FF5A36',
  },

  // Secondary — Warm Amber (replaces sage; sage read as "muted" which
  // fights the new energetic direction — amber keeps warmth while popping)
  secondary: {
    50: '#FFF6E0',
    400: '#FFB627',
    600: '#D6900A',
    DEFAULT: '#FFB627',
  },

  // Semantic — vivid, clear, but each still carries a hint of warmth
  // (no cold blues; info leans teal-warm instead of slate)
  success: {
    bg: '#E4F8EC',
    text: '#0F9D58',   // vivid emerald
  },
  warning: {
    bg: '#FFF4D6',
    text: '#D68A00',   // bright amber-gold, distinct from primary coral
  },
  error: {
    bg: '#FFE8E4',
    text: '#E0311F',   // clear warm red, distinct from primary at a glance
  },
  info: {
    bg: '#E3F6F3',
    text: '#0E8074',   // warm teal — trustworthy, never icy-blue
  },
},

      fontFamily: {
        // Display / Headings
        heading: ['Fraunces_500Medium', 'Georgia', 'serif'],
        'heading-regular': ['Fraunces_400Regular', 'Georgia', 'serif'],
        // Body / UI
        sans: ['Karla_400Regular', 'sans-serif'],
        'sans-medium': ['Karla_500Medium', 'sans-serif'],
        'sans-semibold': ['Karla_600SemiBold', 'sans-serif'],
        // Data / Mono
        mono: ['IBMPlexMono_500Medium', 'ui-monospace', 'monospace'],
      },

      fontSize: {
        // token: [fontSize, { lineHeight }]
        xs: ['12px', { lineHeight: '16px' }],
        sm: ['14px', { lineHeight: '20px' }],
        base: ['16px', { lineHeight: '24px' }],
        lg: ['18px', { lineHeight: '28px' }],
        xl: ['20px', { lineHeight: '28px' }],
        '2xl': ['24px', { lineHeight: '32px' }],
        '3xl': ['30px', { lineHeight: '38px' }],
        '4xl': ['38px', { lineHeight: '46px' }],
        '5xl': ['48px', { lineHeight: '56px' }],
        'mono-sm': ['13px', { lineHeight: '20px' }],
      },

      borderRadius: {
        sm: '6px',   // chips, badges, small buttons, inputs
        md: '10px',  // buttons, form fields, list rows
        lg: '16px',  // cards, modals, panels
        xl: '24px',  // large hero cards, image containers
        full: '999px', // avatars, status dots, pill badges only
      },

      spacing: {
        // 4px base unit
        1: '4px',
        2: '8px',
        3: '12px',
        4: '16px',
        5: '24px',
        6: '32px',
        8: '48px',
        10: '64px',
        12: '96px',
      },

      // React Native / NativeWind reads shadow color+opacity separately from
      // web box-shadow, so these are approximations for shadowColor/shadowOpacity
      // pairs. Prefer the `shadow-*` helpers below for cross-platform use, but
      // for RN-specific components you may still need inline shadow* props
      // (see boxShadow note below).
      boxShadow: {
        xs: '0 1px 2px rgba(46, 42, 36, 0.04)',
        sm: '0 2px 6px rgba(46, 42, 36, 0.06)',
        md: '0 6px 16px rgba(46, 42, 36, 0.08)',
        lg: '0 12px 28px rgba(46, 42, 36, 0.10)',
        xl: '0 24px 48px rgba(46, 42, 36, 0.14)',
        'focus-ring': '0 0 0 3px rgba(192, 112, 58, 0.30)',
      },

      transitionDuration: {
        standard: '150ms',
        panel: '220ms',
      },

      transitionTimingFunction: {
        'ease-out-standard': 'ease-out',
        'panel-ease': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
};