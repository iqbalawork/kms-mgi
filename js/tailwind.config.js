tailwind.config = {
  theme: {
    extend: {
      colors: {
        'primary':               '#6a020a',
        'primary-container':     '#8B1E1E',
        'on-primary':            '#ffffff',
        'brand-maroon-dark':     '#7B1113',
        'brand-maroon-hover':    '#A12424',
        'brand-maroon-subtle':   '#FDF2F2',
        'brand-50':              '#FDF2F2',
        'brand-100':             '#FBE4E4',
        'brand-200':             '#F5C7C7',
        'brand-600':             '#8B1E1E',
        'brand-700':             '#7B1113',
        'brand-800':             '#6A020A',

        'surface-page':          '#F8FAFC',
        'surface-card':          '#FFFFFF',
        'surface-container':     '#F1F5F9',
        'surface-container-low': '#F8FAFC',
        'surface-container-high':'#E2E8F0',
        'surface-container-lowest': '#ffffff',

        'text-primary':          '#0F172A',
        'text-secondary':        '#475569',
        'text-muted':            '#64748B',
        'text-disabled':         '#94A3B8',

        'border-light':          '#E2E8F0',
        'border-medium':         '#CBD5E1',

        'status-success':         '#10B981',
        'status-success-subtle':  '#ECFDF5',
        'status-success-text':    '#047857',
        'status-warning':         '#F59E0B',
        'status-warning-subtle':  '#FFFBEB',
        'status-warning-text':    '#B45309',
        'status-danger':          '#EF4444',
        'status-danger-subtle':   '#FEF2F2',
        'status-danger-text':     '#B91C1C',
        'status-info':            '#3B82F6',
        'status-info-subtle':     '#EFF6FF',
        'status-info-text':       '#1D4ED8',

        'secondary':             '#595e6a',
        'secondary-container':   '#dee2f0'
      },

      fontFamily: {
        sans: ["'Plus Jakarta Sans'", 'ui-sans-serif', 'system-ui', 'sans-serif']
      },

      fontSize: {
        'label-xs':   ['11px', { lineHeight: '16px', letterSpacing: '0.04em',  fontWeight: '600' }],
        'label-sm':   ['12px', { lineHeight: '18px', letterSpacing: '0.01em',  fontWeight: '500' }],
        'label-md':   ['14px', { lineHeight: '22px', fontWeight: '500' }],
        'body-sm':    ['13px', { lineHeight: '20px', fontWeight: '400' }],
        'body-md':    ['14px', { lineHeight: '22px', fontWeight: '400' }],
        'body-lg':    ['16px', { lineHeight: '26px', fontWeight: '400' }],
        'code-num':   ['13px', { lineHeight: '20px', letterSpacing: '0.02em',  fontWeight: '600' }],
        'title-md':   ['16px', { lineHeight: '24px', fontWeight: '600' }],
        'title-lg':   ['18px', { lineHeight: '26px', letterSpacing: '-0.005em', fontWeight: '600' }],
        'headline-md':['20px', { lineHeight: '28px', letterSpacing: '-0.01em',  fontWeight: '600' }],
        'headline-lg':['24px', { lineHeight: '32px', letterSpacing: '-0.015em', fontWeight: '700' }],
        'display-lg': ['32px', { lineHeight: '42px', letterSpacing: '-0.02em',  fontWeight: '700' }]
      },

      spacing: {
        'space-xs':  '0.25rem',
        'space-sm':  '0.5rem',
        'space-md':  '1rem',
        'space-lg':  '1.5rem',
        'space-xl':  '2rem',
        'space-2xl': '3rem'
      },

      borderRadius: { DEFAULT: '0.375rem', lg: '0.5rem', xl: '0.75rem', '2xl': '1rem' },

      boxShadow: {
        'xs':      '0 1px 2px 0 rgb(15 23 42 / 0.05)',
        'level-1': '0 1px 3px 0 rgba(15,23,42,.05), 0 1px 2px -1px rgba(15,23,42,.04)',
        'level-2': '0 4px 6px -1px rgba(15,23,42,.07), 0 2px 4px -2px rgba(15,23,42,.05)',
        'level-3': '0 10px 15px -3px rgba(15,23,42,.1), 0 4px 6px -4px rgba(15,23,42,.05)'
      },

      backdropBlur: {
        'xs': '4px'
      }
    }
  }
};
