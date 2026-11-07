tailwind.config = {
  theme: {
    extend: {
      colors: {
        'primary':               '#631b18',
        'primary-container':     '#8F2925',
        'on-primary':            '#ffffff',
        'brand-maroon-dark':     '#7a221f',
        'brand-maroon-hover':    '#7a221f',
        'brand-maroon-subtle':   '#f6e9e8',
        'brand-50':              '#f6e9e8',
        'brand-100':             '#f6e9e8',
        'brand-200':             '#e3c4c2',
        'brand-600':             '#8f2925',
        'brand-700':             '#7a221f',
        'brand-800':             '#631b18',

        'surface-page':          '#f5f5f4',
        'surface-card':          '#FFFFFF',
        'surface-container':     '#efefee',
        'surface-container-low': '#f5f5f4',
        'surface-container-high':'#e7e7e5',
        'surface-container-lowest': '#ffffff',

        'text-primary':          '#1f1f1e',
        'text-secondary':        '#5c5c5a',
        'text-muted':            '#6b6b68',
        'text-disabled':         '#a3a3a0',

        'border-light':          '#e2e2e0',
        'border-medium':         '#8c8c89',

        'status-success':         '#1e6b43',
        'status-success-subtle':  '#e5f1ea',
        'status-success-text':    '#1e6b43',
        'status-warning':         '#875200',
        'status-warning-subtle':  '#fbefd6',
        'status-warning-text':    '#875200',
        'status-danger':          '#b42318',
        'status-danger-subtle':   '#fbe8e6',
        'status-danger-text':     '#b42318',
        'status-info':            '#1f5c99',
        'status-info-subtle':     '#e6eef7',
        'status-info-text':       '#1f5c99',

        'secondary':             '#5c5c5a',
        'secondary-container':   '#ededec',

        'graphite':              '#262626',
        'on-graphite':           '#ffffff',
        'on-graphite-muted':     '#b5b5b3',

        'slate':   { 50: '#f5f5f4', 100: '#efefee', 200: '#e2e2e0', 300: '#b5b5b3', 400: '#8c8c89', 500: '#6b6b68', 600: '#5c5c5a', 700: '#3d3d3b', 800: '#262626', 900: '#1f1f1e', 950: '#141413' },
        'emerald': { 50: '#e5f1ea', 100: '#cfe4d7', 200: '#b4d4c1', 300: '#8fbfa3', 400: '#4f9a72', 500: '#2f7f55', 600: '#237049', 700: '#1e6b43', 800: '#18563a', 900: '#12432d' },
        'red':     { 50: '#fbe8e6', 100: '#f6d3cf', 200: '#eebab4', 300: '#e2958c', 400: '#cf5a4f', 500: '#c13a2e', 600: '#b42318', 700: '#8f1c13', 800: '#72170f', 900: '#5a120c' },
        'amber':   { 50: '#fbefd6', 100: '#f7e3b8', 200: '#efd195', 300: '#e0b45f', 400: '#b07a1e', 500: '#9a6612', 600: '#875200', 700: '#744600', 800: '#5f3a00', 900: '#4a2d00' },
        'orange':  { 50: '#fbefd6', 100: '#f7e3b8', 200: '#efd195', 300: '#e0b45f', 400: '#b07a1e', 500: '#9a6612', 600: '#875200', 700: '#744600', 800: '#5f3a00', 900: '#4a2d00' },
        'blue':    { 50: '#e6eef7', 100: '#d0dfef', 200: '#b3cbe4', 300: '#86aad2', 400: '#4f83bb', 500: '#2f6ca8', 600: '#25639f', 700: '#1f5c99', 800: '#194a7a', 900: '#143b61' },
        'sky':     { 50: '#e6eef7', 100: '#d0dfef', 200: '#b3cbe4', 300: '#86aad2', 400: '#4f83bb', 500: '#2f6ca8', 600: '#25639f', 700: '#1f5c99', 800: '#194a7a', 900: '#143b61' },
        'violet':  { 50: '#ebeef2', 100: '#d8dee6', 200: '#c0cad6', 300: '#98a8ba', 400: '#6c8098', 500: '#52667e', 600: '#46596f', 700: '#3d5166', 800: '#314255', 900: '#263444' }
      },

      fontFamily: {
        sans: ["'Fira Sans'", "'Segoe UI'", 'Arial', 'sans-serif'],
        mono: ["'Fira Mono'", 'Consolas', "'Courier New'", 'monospace']
      },

      fontSize: {
        'label-xs':   ['12px', { lineHeight: '16px', letterSpacing: '0.04em',  fontWeight: '600' }],
        'label-sm':   ['12px', { lineHeight: '18px', letterSpacing: '0.01em',  fontWeight: '500' }],
        'label-md':   ['14px', { lineHeight: '22px', fontWeight: '500' }],
        'body-sm':    ['13px', { lineHeight: '20px', fontWeight: '400' }],
        'body-md':    ['14px', { lineHeight: '22px', fontWeight: '400' }],
        'body-lg':    ['16px', { lineHeight: '26px', fontWeight: '400' }],
        'code-num':   ['13px', { lineHeight: '20px', letterSpacing: '0.02em',  fontWeight: '600' }],
        'title-md':   ['16px', { lineHeight: '24px', fontWeight: '600' }],
        'title-lg':   ['18px', { lineHeight: '26px', letterSpacing: '-0.005em', fontWeight: '600' }],
        'headline-md':['20px', { lineHeight: '28px', letterSpacing: '-0.005em', fontWeight: '600' }],
        'headline-lg':['24px', { lineHeight: '32px', letterSpacing: '-0.01em',  fontWeight: '600' }],
        'display-lg': ['32px', { lineHeight: '40px', letterSpacing: '-0.01em',  fontWeight: '600' }]
      },

      spacing: {
        'space-xs':  '0.25rem',
        'space-sm':  '0.5rem',
        'space-md':  '1rem',
        'space-lg':  '1.5rem',
        'space-xl':  '2rem',
        'space-2xl': '3rem'
      },

      borderRadius: { sm: '2px', DEFAULT: '4px', md: '4px', lg: '6px', xl: '6px', '2xl': '10px' },

      boxShadow: {
        'xs':      '0 1px 2px #1f1f1e14',
        'level-1': '0 1px 2px #1f1f1e14',
        'level-2': '0 2px 4px #1f1f1e0f, 0 6px 16px #1f1f1e14',
        'level-3': '0 8px 16px #1f1f1e14, 0 20px 40px #1f1f1e1f'
      },

      backdropBlur: {
        'xs': '4px'
      }
    }
  }
};
