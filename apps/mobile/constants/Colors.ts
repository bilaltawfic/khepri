/**
 * Khepri Color Theme
 *
 * A fitness and health-appropriate color palette inspired by
 * the Egyptian god Khepri (rebirth, renewal, the morning sun).
 *
 * Primary: Teal/green tones representing growth, vitality, and health
 * Secondary: Warm amber/gold tones representing energy and achievement
 * Accents: Supporting colors for different training zones and states
 */

export const Colors = {
  light: {
    // Core colors
    primary: '#1a5f4a', // Deep teal green - main brand color
    primaryLight: '#2d8a6e', // Lighter teal for hover/active states
    primaryDark: '#134436', // Darker teal for emphasis

    secondary: '#d4a843', // Warm gold - achievement, energy
    secondaryLight: '#e6c06e', // Lighter gold
    secondaryDark: '#b08a2e', // Darker gold

    // Backgrounds
    background: '#f8faf9', // Very light green-tinted white
    surface: '#ffffff', // Pure white for cards
    surfaceVariant: '#f0f4f2', // Slightly tinted surface

    // Text
    text: '#1a1c1b', // Near black
    textSecondary: '#4a5452', // Gray for secondary text
    textTertiary: '#7a8280', // Lighter gray for hints
    textInverse: '#ffffff', // White text on dark backgrounds

    // States
    success: '#2e7d32', // Green for positive states
    warning: '#f9a825', // Amber for warnings
    error: '#c62828', // Red for errors
    info: '#1976d2', // Blue for informational

    // Training zones (cycling power/heart rate)
    zoneRecovery: '#a5d6a7', // Zone 1 - Easy/Recovery
    zoneEndurance: '#81c784', // Zone 2 - Endurance
    zoneTempo: '#ffeb3b', // Zone 3 - Tempo
    zoneThreshold: '#ff9800', // Zone 4 - Threshold
    zoneVO2: '#f44336', // Zone 5 - VO2 Max
    zoneAnaerobic: '#9c27b0', // Zone 6 - Anaerobic

    // UI elements
    border: '#dde3e0',
    borderLight: '#eef2f0',
    divider: '#e8ece9',
    icon: '#4a5452',
    iconSecondary: '#7a8280',

    // Tab bar
    tabIconDefault: '#7a8280',
    tabIconSelected: '#1a5f4a',
  },
  dark: {
    // Core colors
    primary: '#4ecca3', // Bright teal green
    primaryLight: '#7ee8c1', // Lighter teal
    primaryDark: '#2d8a6e', // Darker teal

    secondary: '#f0c14b', // Warm gold
    secondaryLight: '#ffe082', // Lighter gold
    secondaryDark: '#d4a843', // Darker gold

    // Backgrounds
    background: '#0d1512', // Very dark green-tinted black
    surface: '#1a2420', // Dark surface for cards
    surfaceVariant: '#243430', // Slightly lighter surface

    // Text
    text: '#e8ece9', // Near white
    textSecondary: '#a8b0ac', // Light gray for secondary text
    textTertiary: '#7a8280', // Darker gray for hints
    textInverse: '#1a1c1b', // Dark text on light backgrounds

    // States
    success: '#66bb6a', // Bright green
    warning: '#ffca28', // Bright amber
    error: '#ef5350', // Bright red
    info: '#42a5f5', // Bright blue

    // Training zones (slightly brighter for dark mode)
    zoneRecovery: '#81c784',
    zoneEndurance: '#66bb6a',
    zoneTempo: '#ffee58',
    zoneThreshold: '#ffa726',
    zoneVO2: '#ef5350',
    zoneAnaerobic: '#ba68c8',

    // UI elements
    border: '#2f3d38',
    borderLight: '#243430',
    divider: '#2f3d38',
    icon: '#a8b0ac',
    iconSecondary: '#7a8280',

    // Tab bar
    tabIconDefault: '#7a8280',
    tabIconSelected: '#4ecca3',
  },
};

export type ColorScheme = typeof Colors.light;
export type ThemeMode = 'light' | 'dark';
