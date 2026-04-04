import { act, render, renderHook } from '@testing-library/react-native';
import { Text } from 'react-native';
import { OnboardingProvider, useOnboarding } from '../OnboardingContext';

function wrapper({ children }: { children: React.ReactNode }) {
  return <OnboardingProvider>{children}</OnboardingProvider>;
}

describe('OnboardingContext', () => {
  describe('useOnboarding', () => {
    it('throws when used outside OnboardingProvider', () => {
      // Suppress console.error for the expected error
      const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
      expect(() => renderHook(() => useOnboarding())).toThrow(
        'useOnboarding must be used within an OnboardingProvider'
      );
      spy.mockRestore();
    });

    it('provides initial state within OnboardingProvider', () => {
      const { result } = renderHook(() => useOnboarding(), { wrapper });

      expect(result.current.data).toEqual({});
    });
  });

  describe('OnboardingProvider', () => {
    it('renders children', () => {
      const { toJSON } = render(
        <OnboardingProvider>
          <Text>Child content</Text>
        </OnboardingProvider>
      );
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Child content');
    });
  });

  describe('setIntervalsCredentials', () => {
    it('sets intervals credentials', () => {
      const { result } = renderHook(() => useOnboarding(), { wrapper });

      act(() => {
        result.current.setIntervalsCredentials({
          athleteId: 'i12345',
          apiKey: 'api-key-secret',
        });
      });

      expect(result.current.data.intervalsAthleteId).toBe('i12345');
      expect(result.current.data.intervalsApiKey).toBe('api-key-secret');
    });

    it('updates existing credentials', () => {
      const { result } = renderHook(() => useOnboarding(), { wrapper });

      act(() => {
        result.current.setIntervalsCredentials({
          athleteId: 'old-id',
          apiKey: 'old-key',
        });
      });

      act(() => {
        result.current.setIntervalsCredentials({
          athleteId: 'new-id',
          apiKey: 'new-key',
        });
      });

      expect(result.current.data.intervalsAthleteId).toBe('new-id');
      expect(result.current.data.intervalsApiKey).toBe('new-key');
    });
  });

  describe('clearIntervalsCredentials', () => {
    it('clears intervals credentials', () => {
      const { result } = renderHook(() => useOnboarding(), { wrapper });

      act(() => {
        result.current.setIntervalsCredentials({
          athleteId: 'i12345',
          apiKey: 'api-key-secret',
        });
      });

      act(() => {
        result.current.clearIntervalsCredentials();
      });

      expect(result.current.data.intervalsAthleteId).toBeUndefined();
      expect(result.current.data.intervalsApiKey).toBeUndefined();
    });
  });

  describe('setFitnessNumbers', () => {
    it('sets all 6 fitness numbers plus weight', () => {
      const { result } = renderHook(() => useOnboarding(), { wrapper });

      act(() => {
        result.current.setFitnessNumbers({
          ftp: 250,
          lthr: 165,
          runThresholdPace: 330,
          css: 105,
          restingHR: 50,
          maxHR: 185,
          weight: 70,
        });
      });

      expect(result.current.data.ftp).toBe(250);
      expect(result.current.data.lthr).toBe(165);
      expect(result.current.data.runThresholdPace).toBe(330);
      expect(result.current.data.css).toBe(105);
      expect(result.current.data.restingHR).toBe(50);
      expect(result.current.data.maxHR).toBe(185);
      expect(result.current.data.weight).toBe(70);
    });

    it('allows partial updates', () => {
      const { result } = renderHook(() => useOnboarding(), { wrapper });

      act(() => {
        result.current.setFitnessNumbers({ ftp: 250 });
      });

      act(() => {
        result.current.setFitnessNumbers({ restingHR: 50 });
      });

      expect(result.current.data.ftp).toBe(250);
      expect(result.current.data.restingHR).toBe(50);
    });

    it('allows zero as a valid value', () => {
      const { result } = renderHook(() => useOnboarding(), { wrapper });

      act(() => {
        result.current.setFitnessNumbers({ ftp: 250 });
      });

      // Setting to 0 should update, not be ignored
      act(() => {
        result.current.setFitnessNumbers({ ftp: 0 });
      });

      expect(result.current.data.ftp).toBe(0);
    });

    it('does not clear existing values when setting others', () => {
      const { result } = renderHook(() => useOnboarding(), { wrapper });

      act(() => {
        result.current.setFitnessNumbers({ ftp: 250, restingHR: 50 });
      });

      act(() => {
        result.current.setFitnessNumbers({ maxHR: 185 });
      });

      expect(result.current.data.ftp).toBe(250);
      expect(result.current.data.restingHR).toBe(50);
      expect(result.current.data.maxHR).toBe(185);
    });

    it('clears a value when null is passed', () => {
      const { result } = renderHook(() => useOnboarding(), { wrapper });

      act(() => {
        result.current.setFitnessNumbers({ ftp: 250, restingHR: 50 });
      });

      expect(result.current.data.ftp).toBe(250);

      act(() => {
        result.current.setFitnessNumbers({ ftp: null });
      });

      expect(result.current.data.ftp).toBeUndefined();
      expect(result.current.data.restingHR).toBe(50);
    });
  });

  describe('reset', () => {
    it('resets all data to initial state', () => {
      const { result } = renderHook(() => useOnboarding(), { wrapper });

      // Set various data
      act(() => {
        result.current.setIntervalsCredentials({
          athleteId: 'i12345',
          apiKey: 'secret',
        });
        result.current.setFitnessNumbers({
          ftp: 250,
          restingHR: 50,
        });
      });

      // Verify data was set
      expect(result.current.data.intervalsAthleteId).toBe('i12345');
      expect(result.current.data.ftp).toBe(250);

      // Reset
      act(() => {
        result.current.reset();
      });

      // Verify reset
      expect(result.current.data).toEqual({});
    });
  });
});
