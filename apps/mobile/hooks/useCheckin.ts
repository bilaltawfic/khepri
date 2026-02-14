import { useCallback, useState } from 'react';

import { useAuth } from '@/contexts';
import { supabase } from '@/lib/supabase';
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
import {
  createCheckin,
  getAthleteByAuthUser,
  getTodayCheckin,
  updateCheckin,
  updateCheckinRecommendation,
} from '@khepri/supabase-client';
import type { Json } from '@khepri/supabase-client';

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

  // Prefill
  applyPrefill: (prefill: Partial<CheckinFormData>) => void;

  // Actions
  submitCheckin: () => Promise<void>;
  resetForm: () => void;
  dismissRecommendation: () => void;

  // Validation
  isFormValid: boolean;
  missingFields: string[];
};

export function useCheckin(): UseCheckinReturn {
  const { user } = useAuth();
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

  // Prefill: only apply non-null values to null form fields
  const applyPrefill = useCallback((prefill: Partial<CheckinFormData>) => {
    setFormData((prev) => {
      const updated = { ...prev };
      if (prefill.sleepQuality != null && prev.sleepQuality === null) {
        updated.sleepQuality = prefill.sleepQuality;
      }
      if (prefill.sleepHours != null && prev.sleepHours === null) {
        updated.sleepHours = prefill.sleepHours;
      }
      if (prefill.energyLevel != null && prev.energyLevel === null) {
        updated.energyLevel = prefill.energyLevel;
      }
      if (prefill.stressLevel != null && prev.stressLevel === null) {
        updated.stressLevel = prefill.stressLevel;
      }
      if (prefill.overallSoreness != null && prev.overallSoreness === null) {
        updated.overallSoreness = prefill.overallSoreness;
      }
      return updated;
    });
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
      let checkinId: string | null = null;

      // Persist check-in to Supabase if configured and user is authenticated
      if (supabase && user) {
        const { data: athlete, error: athleteError } = await getAthleteByAuthUser(
          supabase,
          user.id
        );
        if (athleteError) throw new Error(`Failed to load profile: ${athleteError.message}`);
        if (!athlete) throw new Error('Athlete profile not found');

        const today = new Date().toISOString().split('T')[0] ?? '';

        const checkinFields = {
          sleep_quality: formData.sleepQuality,
          sleep_hours: formData.sleepHours,
          energy_level: formData.energyLevel,
          stress_level: formData.stressLevel,
          overall_soreness: formData.overallSoreness,
          soreness_areas: formData.sorenessAreas as unknown as Json,
          available_time_minutes: formData.availableTimeMinutes,
          travel_status: formData.travelStatus,
          notes: formData.notes || null,
        };

        // Check if a check-in already exists for today (upsert logic)
        const { data: existing } = await getTodayCheckin(supabase, athlete.id);

        if (existing) {
          const { data: updated, error: updateError } = await updateCheckin(
            supabase,
            existing.id,
            checkinFields
          );
          if (updateError) throw new Error(`Failed to save check-in: ${updateError.message}`);
          checkinId = updated?.id ?? existing.id;
        } else {
          const { data: created, error: createError } = await createCheckin(supabase, {
            athlete_id: athlete.id,
            checkin_date: today,
            ...checkinFields,
          });
          if (createError) throw new Error(`Failed to save check-in: ${createError.message}`);
          checkinId = created?.id ?? null;
        }
      }

      setSubmissionState('analyzing');

      // Call AI service to get recommendation
      const { data: aiRecommendation, error } = await getCheckinRecommendation(formData);

      if (error) {
        setSubmissionState('error');
        setSubmissionError(error.message);
        return;
      }

      // Store AI recommendation with check-in record
      if (supabase && checkinId != null && aiRecommendation) {
        await updateCheckinRecommendation(supabase, checkinId, aiRecommendation as unknown as Json);
      }

      if (aiRecommendation) {
        setRecommendation(aiRecommendation);
      }

      setSubmissionState('success');
    } catch (error) {
      setSubmissionState('error');
      setSubmissionError(error instanceof Error ? error.message : 'An error occurred');
    }
  }, [formData, isFormValid, missingFields, user]);

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
    applyPrefill,
    submitCheckin,
    resetForm,
    dismissRecommendation,
    isFormValid,
    missingFields,
  };
}
