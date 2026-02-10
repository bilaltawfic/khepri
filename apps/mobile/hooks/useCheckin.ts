import { useCallback, useState } from 'react';

import { getCheckinRecommendation } from '@/services/ai';
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
      // TODO: Submit check-in data to Supabase in a future task
      // For now just simulate submission
      await new Promise((resolve) => setTimeout(resolve, 500));

      setSubmissionState('analyzing');

      // Call AI service to get recommendation
      const { data: aiRecommendation, error } = await getCheckinRecommendation(formData);

      if (error) {
        setSubmissionState('error');
        setSubmissionError(error.message);
        return;
      }

      if (aiRecommendation) {
        setRecommendation(aiRecommendation);
      }

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
