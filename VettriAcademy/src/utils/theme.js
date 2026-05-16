import { Colors } from './colors';

// ─── Typography ────────────────────────────────────────────────────────────────
export const Typography = {
  heading: { fontSize: 24, fontWeight: 'bold' },
  subheading: { fontSize: 18, fontWeight: '600' },
  body: { fontSize: 14, fontWeight: '400' },
  bodyLarge: { fontSize: 16, fontWeight: '400' },
  caption: { fontSize: 12, fontWeight: '400' },
  small: { fontSize: 10, fontWeight: '400' },
  button: { fontSize: 16, fontWeight: '600' },
  tabLabel: { fontSize: 12, fontWeight: '500' },
};

// ─── Spacing ───────────────────────────────────────────────────────────────────
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

// ─── Border Radius ─────────────────────────────────────────────────────────────
export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
};

// ─── Shadows ───────────────────────────────────────────────────────────────────
export const Shadows = {
  light: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  heavy: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
};

// ─── Theme Objects ─────────────────────────────────────────────────────────────
export const lightTheme = {
  dark: false,
  colors: {
    primary: Colors.primary,
    primaryLight: Colors.primaryLight,
    background: Colors.background.light,
    card: Colors.card.light,
    surface: Colors.surface.light,
    text: Colors.text.light,
    textSecondary: Colors.textSecondary.light,
    border: Colors.gray,
    notification: Colors.primary,
    chatReceived: Colors.chatReceived.light,
    // Navigation theme
    headerBackground: Colors.white,
    tabBar: Colors.white,
    tabBarActive: Colors.primary,
    tabBarInactive: Colors.mediumGray,
    statusBar: 'dark-content',
  },
};

export const darkTheme = {
  dark: true,
  colors: {
    primary: Colors.primary,
    primaryLight: Colors.primaryLight,
    background: Colors.background.dark,
    card: Colors.card.dark,
    surface: Colors.surface.dark,
    text: Colors.text.dark,
    textSecondary: Colors.textSecondary.dark,
    border: Colors.navyLight,
    notification: Colors.primary,
    chatReceived: Colors.chatReceived.dark,
    // Navigation theme
    headerBackground: Colors.navy,
    tabBar: Colors.navy,
    tabBarActive: Colors.primary,
    tabBarInactive: Colors.mediumGray,
    statusBar: 'light-content',
  },
};
