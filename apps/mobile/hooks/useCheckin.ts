import { useCallback, useState } from 'react';

import {
  type AIRecommendation,
  type AvailableTimeMinutes,
  type BodyArea,
  type CheckinFormData,
  type CheckinSubmissionState,
  type ConstraintType,
  DEFAULT_CHECKIN_FORM,
  type SorenessAreas,
} from '@/types/checkin';

type UseCheckinReturn = {
  // Form data
  formData: CheckinFormData;

  // Submission state
  submissionState: CheckinSubmissionState;
  submissionError: string | null;

  // AI recommendation
  recommendation: AIRecommendation | null;

  // Form setters
  setSleepQuality: (value: number) => void;
  setSleepHours: (value: number) => void;
  setEnergyLevel: (value: number) => void;
  setStressLevel: (value: number) => void;
  setOverallSoreness: (value: number) => void;
  toggleSorenessArea: (area: BodyArea) => void;
  setAvailableTime: (value: AvailableTimeMinutes) => void;
  setConstraints: (constraints: ConstraintType[]) => void;
  setNotes: (notes: string) => void;

  // Actions
  submitCheckin: () => Promise<void>;
  resetForm: () => void;
  dismissRecommendation: () => void;

  // Validation
  isFormValid: boolean;
  missingFields: string[];
};

export function useCheckin(): UseCheckinReturn {
  const [formData, setFormData] = useState<CheckinFormData>(DEFAULT_CHECKIN_FORM);
  const [submissionState, setSubmissionState] = useState<CheckinSubmissionState>('idle');
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [recommendation, setRecommendation] = useState<AIRecommendation | null>(null);

  // Form setters
  const setSleepQuality = useCallback((value: number) => {
    setFormData((prev) => ({ ...prev, sleepQuality: value }));
  }, []);

  const setSleepHours = useCallback((value: number) => {
    setFormData((prev) => ({ ...prev, sleepHours: value }));
  }, []);

  const setEnergyLevel = useCallback((value: number) => {
    setFormData((prev) => ({ ...prev, energyLevel: value }));
  }, []);

  const setStressLevel = useCallback((value: number) => {
    setFormData((prev) => ({ ...prev, stressLevel: value }));
  }, []);

  const setOverallSoreness = useCallback((value: number) => {
    setFormData((prev) => ({ ...prev, overallSoreness: value }));
  }, []);

  const toggleSorenessArea = useCallback((area: BodyArea) => {
    setFormData((prev) => {
      const newAreas: SorenessAreas = { ...prev.sorenessAreas };
      if (area in newAreas) {
        delete newAreas[area];
      } else {
        // Default soreness level for a tapped area is moderate (5)
        newAreas[area] = 5;
      }
      return { ...prev, sorenessAreas: newAreas };
    });
  }, []);

  const setAvailableTime = useCallback((value: AvailableTimeMinutes) => {
    setFormData((prev) => ({ ...prev, availableTimeMinutes: value }));
  }, []);

  const setConstraints = useCallback((constraints: ConstraintType[]) => {
    setFormData((prev) => ({ ...prev, constraints }));
  }, []);

  const setNotes = useCallback((notes: string) => {
    setFormData((prev) => ({ ...prev, notes }));
  }, []);

  // Validation
  const getMissingFields = useCallback((): string[] => {
    const missing: string[] = [];
    if (formData.sleepQuality === null) missing.push('Sleep Quality');
    if (formData.sleepHours === null) missing.push('Hours Slept');
    if (formData.energyLevel === null) missing.push('Energy Level');
    if (formData.stressLevel === null) missing.push('Stress Level');
    if (formData.overallSoreness === null) missing.push('Soreness');
    if (formData.availableTimeMinutes === null) missing.push('Available Time');
    return missing;
  }, [formData]);

  const missingFields = getMissingFields();
  const isFormValid = missingFields.length === 0;

  // Actions
  const submitCheckin = useCallback(async () => {
    if (!isFormValid) {
      setSubmissionError(`Please complete: ${missingFields.join(', ')}`);
      return;
    }

    setSubmissionState('submitting');
    setSubmissionError(null);

    try {
      // Simulate API call - in the future this will submit to Supabase
      // Note: Tests accept the 2s delay; fake timers interfere with RTL cleanup
      await new Promise((resolve) => setTimeout(resolve, 500));

      setSubmissionState('analyzing');

      // Simulate AI analysis - in the future this will call the AI client
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Generate mock recommendation based on form data
      const mockRecommendation = generateMockRecommendation(formData);
      setRecommendation(mockRecommendation);

      setSubmissionState('success');
    } catch (error) {
      setSubmissionState('error');
      setSubmissionError(error instanceof Error ? error.message : 'An error occurred');
    }
  }, [formData, isFormValid, missingFields]);

  const resetForm = useCallback(() => {
    setFormData(DEFAULT_CHECKIN_FORM);
    setSubmissionState('idle');
    setSubmissionError(null);
    setRecommendation(null);
  }, []);

  const dismissRecommendation = useCallback(() => {
    setRecommendation(null);
    setSubmissionState('idle');
  }, []);

  return {
    formData,
    submissionState,
    submissionError,
    recommendation,
    setSleepQuality,
    setSleepHours,
    setEnergyLevel,
    setStressLevel,
    setOverallSoreness,
    toggleSorenessArea,
    setAvailableTime,
    setConstraints,
    setNotes,
    submitCheckin,
    resetForm,
    dismissRecommendation,
    isFormValid,
    missingFields,
  };
}

/**
 * Generate a mock recommendation based on form data
 * This will be replaced with actual AI integration later
 */
function generateMockRecommendation(formData: CheckinFormData): AIRecommendation {
  const {
    sleepQuality,
    energyLevel,
    stressLevel,
    overallSoreness,
    availableTimeMinutes,
    constraints,
  } = formData;

  // Calculate a simple wellness score (0-1)
  const sleepScore = (sleepQuality ?? 5) / 10;
  const energyScore = (energyLevel ?? 5) / 10;
  const stressScore = 1 - (stressLevel ?? 5) / 10; // Invert stress
  const sorenessScore = 1 - (overallSoreness ?? 5) / 10; // Invert soreness

  const wellnessScore = (sleepScore + energyScore + stressScore + sorenessScore) / 4;

  // Determine intensity based on wellness score
  let intensityLevel: AIRecommendation['intensityLevel'];
  let workoutType: string;
  let summary: string;

  if (wellnessScore < 0.35) {
    intensityLevel = 'recovery';
    workoutType = 'Light recovery session';
    summary = "Your body needs rest today. Let's focus on recovery with some light movement.";
  } else if (wellnessScore < 0.5) {
    intensityLevel = 'easy';
    workoutType = 'Easy aerobic session';
    summary =
      "You're a bit fatigued. A gentle session will help maintain fitness without adding stress.";
  } else if (wellnessScore < 0.7) {
    intensityLevel = 'moderate';
    workoutType = 'Steady state workout';
    summary = "You're feeling decent. A moderate effort session will help build fitness.";
  } else {
    intensityLevel = 'hard';
    workoutType = 'Quality training session';
    summary = "You're fresh and ready! Great day for a more challenging workout.";
  }

  // Adjust for constraints
  if (constraints.includes('feeling_unwell')) {
    intensityLevel = 'recovery';
    workoutType = 'Complete rest or very light stretching';
    summary = 'You mentioned not feeling well. Rest is the best medicine today.';
  }

  // Adjust duration based on available time
  const duration = Math.min(availableTimeMinutes ?? 60, getRecommendedDuration(intensityLevel));

  return {
    summary,
    workoutSuggestion: workoutType,
    intensityLevel,
    duration,
    notes:
      constraints.length > 0
        ? `Adjusted for: ${constraints.join(', ').replaceAll('_', ' ')}`
        : undefined,
  };
}

function getRecommendedDuration(intensity: AIRecommendation['intensityLevel']): number {
  switch (intensity) {
    case 'recovery':
      return 30;
    case 'easy':
      return 45;
    case 'moderate':
      return 60;
    case 'hard':
      return 75;
    default:
      return 60;
  }
}
