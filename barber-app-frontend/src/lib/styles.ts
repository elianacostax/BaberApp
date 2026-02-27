// Sistema de colores y estilos consistentes
export const colors = {
  // Colores primarios
  primary: {
    50: '#f0f9ff',
    100: '#e0f2fe',
    200: '#bae6fd',
    300: '#7dd3fc',
    400: '#38bdf8',
    500: '#0ea5e9',
    600: '#0284c7',
    700: '#0369a1',
    800: '#075985',
    900: '#0c4a6e',
  },
  
  // Colores secundarios
  secondary: {
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
  },
  
  // Colores de estado
  success: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
  },
  
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
  },
  
  error: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
  },
  
  // Colores para categorías de servicios
  service: {
    haircut: '#8b5cf6', // Purple
    beard: '#f59e0b',   // Amber
    styling: '#ec4899', // Pink
    treatment: '#10b981', // Emerald
    other: '#6b7280',   // Gray
  }
};

// Gradientes
export const gradients = {
  primary: 'bg-gradient-to-r from-blue-500 to-purple-600',
  secondary: 'bg-gradient-to-r from-gray-500 to-gray-700',
  success: 'bg-gradient-to-r from-green-500 to-emerald-600',
  warning: 'bg-gradient-to-r from-yellow-500 to-orange-600',
  error: 'bg-gradient-to-r from-red-500 to-pink-600',
  premium: 'bg-gradient-to-r from-purple-500 via-pink-500 to-red-500',
  ocean: 'bg-gradient-to-r from-cyan-500 to-blue-600',
  sunset: 'bg-gradient-to-r from-orange-400 to-pink-500',
  forest: 'bg-gradient-to-r from-green-400 to-blue-500',
};

// Sombras
export const shadows = {
  sm: 'shadow-sm',
  md: 'shadow-md',
  lg: 'shadow-lg',
  xl: 'shadow-xl',
  '2xl': 'shadow-2xl',
  inner: 'shadow-inner',
  none: 'shadow-none',
  glow: 'shadow-lg shadow-blue-500/25',
  glowSuccess: 'shadow-lg shadow-green-500/25',
  glowWarning: 'shadow-lg shadow-yellow-500/25',
  glowError: 'shadow-lg shadow-red-500/25',
};

// Bordes redondeados
export const borderRadius = {
  none: 'rounded-none',
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  xl: 'rounded-xl',
  '2xl': 'rounded-2xl',
  '3xl': 'rounded-3xl',
  full: 'rounded-full',
};

// Espaciado
export const spacing = {
  xs: 'space-y-1',
  sm: 'space-y-2',
  md: 'space-y-4',
  lg: 'space-y-6',
  xl: 'space-y-8',
  '2xl': 'space-y-12',
};

// Animaciones
export const animations = {
  fadeIn: 'animate-fade-in',
  slideIn: 'animate-slide-in',
  bounce: 'animate-bounce',
  pulse: 'animate-pulse',
  spin: 'animate-spin',
  ping: 'animate-ping',
  wiggle: 'animate-wiggle',
  float: 'animate-float',
};

// Estados de hover
export const hoverStates = {
  lift: 'hover:scale-105 hover:shadow-lg transition-all duration-200',
  glow: 'hover:shadow-lg hover:shadow-blue-500/25 transition-all duration-200',
  color: 'hover:bg-blue-50 hover:text-blue-700 transition-colors duration-200',
  border: 'hover:border-blue-500 hover:shadow-md transition-all duration-200',
};

// Estados de focus
export const focusStates = {
  ring: 'focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
  outline: 'focus:outline-none focus:ring-2 focus:ring-blue-500',
  border: 'focus:border-blue-500 focus:ring-1 focus:ring-blue-500',
};

// Estados de disabled
export const disabledStates = {
  opacity: 'disabled:opacity-50 disabled:cursor-not-allowed',
  pointer: 'disabled:pointer-events-none',
};

// Clases de utilidad combinadas con colores originales
export const utilityClasses = {
  // Botones
  buttonPrimary: 'btn-premium px-6 py-3 rounded-lg',
  buttonSecondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80 font-semibold px-6 py-3 rounded-lg transition-colors duration-200',
  buttonSuccess: 'bg-success text-success-foreground hover:bg-success/90 font-semibold px-6 py-3 rounded-lg transition-colors duration-200',
  buttonWarning: 'bg-warning text-warning-foreground hover:bg-warning/90 font-semibold px-6 py-3 rounded-lg transition-colors duration-200',
  buttonError: 'bg-destructive text-destructive-foreground hover:bg-destructive/90 font-semibold px-6 py-3 rounded-lg transition-colors duration-200',
  
  // Cards
  cardPremium: 'card-premium rounded-xl',
  cardGlass: 'card-glass rounded-xl',
  
  // Inputs
  inputPrimary: 'input-premium rounded-lg px-4 py-3 transition-all duration-200',
  
  // Badges
  badgeSuccess: 'bg-success/20 text-success px-3 py-1 rounded-full text-sm font-medium',
  badgeWarning: 'bg-warning/20 text-warning px-3 py-1 rounded-full text-sm font-medium',
  badgeError: 'bg-destructive/20 text-destructive px-3 py-1 rounded-full text-sm font-medium',
  badgeInfo: 'bg-primary/20 text-primary px-3 py-1 rounded-full text-sm font-medium',
  
  // Loading states
  skeleton: 'animate-pulse bg-muted rounded',
  shimmer: 'animate-shimmer bg-gradient-to-r from-muted via-muted/50 to-muted',
};

// Responsive breakpoints
export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
};

// Grid systems
export const grids = {
  auto: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6',
  responsive: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6',
  masonry: 'columns-1 md:columns-2 lg:columns-3 gap-6',
  flex: 'flex flex-wrap gap-4',
};
