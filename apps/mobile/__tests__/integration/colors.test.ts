import { Colors } from '@/constants/Colors';

describe('Colors', () => {
  describe('light theme', () => {
    it('has all required color properties', () => {
      const lightColors = Colors.light;

      // Core colors
      expect(lightColors.primary).toBeDefined();
      expect(lightColors.secondary).toBeDefined();

      // Backgrounds
      expect(lightColors.background).toBeDefined();
      expect(lightColors.surface).toBeDefined();
      expect(lightColors.surfaceVariant).toBeDefined();

      // Text
      expect(lightColors.text).toBeDefined();
      expect(lightColors.textSecondary).toBeDefined();
      expect(lightColors.textTertiary).toBeDefined();

      // States
      expect(lightColors.success).toBeDefined();
      expect(lightColors.warning).toBeDefined();
      expect(lightColors.error).toBeDefined();
      expect(lightColors.info).toBeDefined();

      // Tab bar
      expect(lightColors.tabIconDefault).toBeDefined();
      expect(lightColors.tabIconSelected).toBeDefined();
    });

    it('has training zone colors', () => {
      const lightColors = Colors.light;

      expect(lightColors.zoneRecovery).toBeDefined();
      expect(lightColors.zoneEndurance).toBeDefined();
      expect(lightColors.zoneTempo).toBeDefined();
      expect(lightColors.zoneThreshold).toBeDefined();
      expect(lightColors.zoneVO2).toBeDefined();
      expect(lightColors.zoneAnaerobic).toBeDefined();
    });

    it('uses the Khepri brand color as primary', () => {
      expect(Colors.light.primary).toBe('#1a5f4a');
    });
  });

  describe('dark theme', () => {
    it('has all required color properties', () => {
      const darkColors = Colors.dark;

      // Core colors
      expect(darkColors.primary).toBeDefined();
      expect(darkColors.secondary).toBeDefined();

      // Backgrounds
      expect(darkColors.background).toBeDefined();
      expect(darkColors.surface).toBeDefined();
      expect(darkColors.surfaceVariant).toBeDefined();

      // Text
      expect(darkColors.text).toBeDefined();
      expect(darkColors.textSecondary).toBeDefined();
      expect(darkColors.textTertiary).toBeDefined();

      // States
      expect(darkColors.success).toBeDefined();
      expect(darkColors.warning).toBeDefined();
      expect(darkColors.error).toBeDefined();
      expect(darkColors.info).toBeDefined();

      // Tab bar
      expect(darkColors.tabIconDefault).toBeDefined();
      expect(darkColors.tabIconSelected).toBeDefined();
    });

    it('has training zone colors', () => {
      const darkColors = Colors.dark;

      expect(darkColors.zoneRecovery).toBeDefined();
      expect(darkColors.zoneEndurance).toBeDefined();
      expect(darkColors.zoneTempo).toBeDefined();
      expect(darkColors.zoneThreshold).toBeDefined();
      expect(darkColors.zoneVO2).toBeDefined();
      expect(darkColors.zoneAnaerobic).toBeDefined();
    });

    it('has brighter primary color for dark mode', () => {
      expect(Colors.dark.primary).toBe('#4ecca3');
    });
  });

  describe('theme consistency', () => {
    it('has matching keys between light and dark themes', () => {
      const lightKeys = Object.keys(Colors.light).sort();
      const darkKeys = Object.keys(Colors.dark).sort();

      expect(lightKeys).toEqual(darkKeys);
    });

    it('all color values are valid hex colors', () => {
      const hexColorPattern = /^#[0-9a-fA-F]{6}$/;

      for (const value of Object.values(Colors.light)) {
        expect(value).toMatch(hexColorPattern);
      }

      for (const value of Object.values(Colors.dark)) {
        expect(value).toMatch(hexColorPattern);
      }
    });
  });
});
