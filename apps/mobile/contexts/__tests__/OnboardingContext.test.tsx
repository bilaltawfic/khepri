import { act, render, renderHook } from '@testing-library/react-native';
import { Text } from 'react-native';
import {
  MAX_GOALS,
  type OnboardingGoal,
  OnboardingProvider,
  useOnboarding,
} from '../OnboardingContext';

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

      expect(result.current.data).toEqual({
        goals: [],
      });
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
    it('sets fitness numbers', () => {
      const { result } = renderHook(() => useOnboarding(), { wrapper });

      act(() => {
        result.current.setFitnessNumbers({
          ftp: 250,
          restingHR: 50,
          maxHR: 185,
          weight: 70,
        });
      });

      expect(result.current.data.ftp).toBe(250);
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
  });

  describe('addGoal', () => {
    const mockGoal: OnboardingGoal = {
      goalType: 'race',
      title: 'Complete a marathon',
      targetDate: '2026-06-15',
      priority: 'A',
    };

    it('adds a goal', () => {
      const { result } = renderHook(() => useOnboarding(), { wrapper });

      act(() => {
        result.current.addGoal(mockGoal);
      });

      expect(result.current.data.goals).toHaveLength(1);
      expect(result.current.data.goals[0]).toEqual(mockGoal);
    });

    it('adds multiple goals', () => {
      const { result } = renderHook(() => useOnboarding(), { wrapper });

      const goal2: OnboardingGoal = {
        goalType: 'fitness',
        title: 'Improve FTP',
        priority: 'B',
      };

      act(() => {
        result.current.addGoal(mockGoal);
        result.current.addGoal(goal2);
      });

      expect(result.current.data.goals).toHaveLength(2);
    });

    it('enforces maximum goals limit', () => {
      const { result } = renderHook(() => useOnboarding(), { wrapper });

      // Add max goals
      for (let i = 0; i < MAX_GOALS; i++) {
        act(() => {
          result.current.addGoal({
            ...mockGoal,
            title: `Goal ${i + 1}`,
          });
        });
      }

      expect(result.current.data.goals).toHaveLength(MAX_GOALS);

      // Try to add one more
      act(() => {
        result.current.addGoal({
          ...mockGoal,
          title: 'Extra goal',
        });
      });

      // Should still be at max
      expect(result.current.data.goals).toHaveLength(MAX_GOALS);
      expect(result.current.data.goals.every((g) => g.title !== 'Extra goal')).toBe(true);
    });
  });

  describe('removeGoal', () => {
    const mockGoal: OnboardingGoal = {
      goalType: 'race',
      title: 'Complete a marathon',
      priority: 'A',
    };

    it('removes a goal by index', () => {
      const { result } = renderHook(() => useOnboarding(), { wrapper });

      act(() => {
        result.current.addGoal({ ...mockGoal, title: 'Goal 1' });
        result.current.addGoal({ ...mockGoal, title: 'Goal 2' });
        result.current.addGoal({ ...mockGoal, title: 'Goal 3' });
      });

      act(() => {
        result.current.removeGoal(1);
      });

      expect(result.current.data.goals).toHaveLength(2);
      expect(result.current.data.goals[0].title).toBe('Goal 1');
      expect(result.current.data.goals[1].title).toBe('Goal 3');
    });

    it('handles invalid index gracefully (negative)', () => {
      const { result } = renderHook(() => useOnboarding(), { wrapper });

      act(() => {
        result.current.addGoal(mockGoal);
      });

      act(() => {
        result.current.removeGoal(-1);
      });

      expect(result.current.data.goals).toHaveLength(1);
    });

    it('handles invalid index gracefully (out of bounds)', () => {
      const { result } = renderHook(() => useOnboarding(), { wrapper });

      act(() => {
        result.current.addGoal(mockGoal);
      });

      act(() => {
        result.current.removeGoal(5);
      });

      expect(result.current.data.goals).toHaveLength(1);
    });
  });

  describe('updateGoal', () => {
    const mockGoal: OnboardingGoal = {
      goalType: 'race',
      title: 'Complete a marathon',
      priority: 'A',
    };

    it('updates a goal at index', () => {
      const { result } = renderHook(() => useOnboarding(), { wrapper });

      act(() => {
        result.current.addGoal(mockGoal);
      });

      const updatedGoal: OnboardingGoal = {
        goalType: 'race',
        title: 'Complete a half marathon',
        targetDate: '2026-04-01',
        priority: 'B',
      };

      act(() => {
        result.current.updateGoal(0, updatedGoal);
      });

      expect(result.current.data.goals[0]).toEqual(updatedGoal);
    });

    it('handles invalid index gracefully (negative)', () => {
      const { result } = renderHook(() => useOnboarding(), { wrapper });

      act(() => {
        result.current.addGoal(mockGoal);
      });

      const updatedGoal: OnboardingGoal = {
        ...mockGoal,
        title: 'Updated',
      };

      act(() => {
        result.current.updateGoal(-1, updatedGoal);
      });

      expect(result.current.data.goals[0].title).toBe('Complete a marathon');
    });

    it('handles invalid index gracefully (out of bounds)', () => {
      const { result } = renderHook(() => useOnboarding(), { wrapper });

      act(() => {
        result.current.addGoal(mockGoal);
      });

      const updatedGoal: OnboardingGoal = {
        ...mockGoal,
        title: 'Updated',
      };

      act(() => {
        result.current.updateGoal(5, updatedGoal);
      });

      expect(result.current.data.goals[0].title).toBe('Complete a marathon');
    });
  });

  describe('setPlanDuration', () => {
    it('sets plan duration', () => {
      const { result } = renderHook(() => useOnboarding(), { wrapper });

      act(() => {
        result.current.setPlanDuration(12);
      });

      expect(result.current.data.planDurationWeeks).toBe(12);
    });

    it('allows clearing plan duration', () => {
      const { result } = renderHook(() => useOnboarding(), { wrapper });

      act(() => {
        result.current.setPlanDuration(12);
      });

      act(() => {
        result.current.setPlanDuration(undefined);
      });

      expect(result.current.data.planDurationWeeks).toBeUndefined();
    });

    it('allows zero as a valid value', () => {
      const { result } = renderHook(() => useOnboarding(), { wrapper });

      act(() => {
        result.current.setPlanDuration(0);
      });

      expect(result.current.data.planDurationWeeks).toBe(0);
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
        result.current.addGoal({
          goalType: 'race',
          title: 'Marathon',
          priority: 'A',
        });
        result.current.setPlanDuration(16);
      });

      // Verify data was set
      expect(result.current.data.intervalsAthleteId).toBe('i12345');
      expect(result.current.data.ftp).toBe(250);
      expect(result.current.data.goals).toHaveLength(1);
      expect(result.current.data.planDurationWeeks).toBe(16);

      // Reset
      act(() => {
        result.current.reset();
      });

      // Verify reset
      expect(result.current.data).toEqual({
        goals: [],
      });
    });
  });
});
