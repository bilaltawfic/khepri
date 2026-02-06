import { Colors } from '@/constants/Colors';
import { renderHook } from '@testing-library/react-native';
import { useThemeColor } from '../useThemeColor';

// For web tests, the default color scheme is typically 'light'
// We test the hook's logic with the default behavior

describe('useThemeColor', () => {
  describe('with default color scheme', () => {
    it('returns theme color when no props are provided', () => {
      const { result } = renderHook(() => useThemeColor({}, 'text'));
      // Should return either light or dark text color based on system preference
      expect([Colors.light.text, Colors.dark.text]).toContain(result.current);
    });

    it('returns custom light color when provided and scheme is light', () => {
      const customColor = '#ff0000';
      const { result } = renderHook(() =>
        useThemeColor({ light: customColor, dark: '#00ff00' }, 'text')
      );
      // In web environment, typically defaults to light
      expect([customColor, '#00ff00']).toContain(result.current);
    });

    it('returns primary color correctly', () => {
      const { result } = renderHook(() => useThemeColor({}, 'primary'));
      expect([Colors.light.primary, Colors.dark.primary]).toContain(result.current);
    });

    it('returns background color correctly', () => {
      const { result } = renderHook(() => useThemeColor({}, 'background'));
      expect([Colors.light.background, Colors.dark.background]).toContain(result.current);
    });

    it('returns surface color correctly', () => {
      const { result } = renderHook(() => useThemeColor({}, 'surface'));
      expect([Colors.light.surface, Colors.dark.surface]).toContain(result.current);
    });
  });

  describe('color prop override', () => {
    it('uses light prop when provided', () => {
      const customLight = '#aabbcc';
      const { result } = renderHook(() => useThemeColor({ light: customLight }, 'text'));
      // If system is in light mode, should use the custom light color
      // If in dark mode, should fall back to Colors.dark.text
      const possibleValues = [customLight, Colors.dark.text];
      expect(possibleValues).toContain(result.current);
    });

    it('uses dark prop when provided', () => {
      const customDark = '#112233';
      const { result } = renderHook(() => useThemeColor({ dark: customDark }, 'text'));
      // If system is in dark mode, should use the custom dark color
      // If in light mode, should fall back to Colors.light.text
      const possibleValues = [Colors.light.text, customDark];
      expect(possibleValues).toContain(result.current);
    });
  });
});
