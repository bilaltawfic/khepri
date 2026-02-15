/**
 * Types for Daily Check-in functionality
 *
 * Core types (BodyArea, SorenessAreas, TravelStatus, AvailableTimeMinutes,
 * DailyConstraintType) are defined in @khepri/core and re-exported here.
 * UI-specific types and constants remain in this file.
 */

import type {
  AvailableTimeMinutes,
  BodyArea,
  DailyConstraintType,
  SorenessAreas,
  TravelStatus,
} from '@khepri/core';

// Re-export core types
export type {
  AvailableTimeMinutes,
  BodyArea,
  DailyConstraintType,
  SorenessAreas,
  TravelStatus,
} from '@khepri/core';

// Backward-compatible alias
export type ConstraintType = DailyConstraintType;

/**
 * Daily check-in form data
 */
export type CheckinFormData = {
  // Wellness metrics (1-10 scale)
  sleepQuality: number | null;
  sleepHours: number | null;
  energyLevel: number | null;
  stressLevel: number | null;
  overallSoreness: number | null;

  // Specific soreness areas
  sorenessAreas: SorenessAreas;

  // Context for today
  availableTimeMinutes: AvailableTimeMinutes | null;
  constraints: ConstraintType[];
  travelStatus: TravelStatus;
  notes: string;
};

/**
 * Check-in submission state
 */
export type CheckinSubmissionState = 'idle' | 'submitting' | 'analyzing' | 'success' | 'error';

/**
 * AI recommendation placeholder (actual structure TBD)
 */
export type AIRecommendation = {
  summary: string;
  workoutSuggestion: string;
  intensityLevel: 'recovery' | 'easy' | 'moderate' | 'hard';
  duration: number; // minutes
  notes?: string;
};

/**
 * Check-in store state
 */
export type CheckinState = {
  // Form data
  formData: CheckinFormData;

  // Submission state
  submissionState: CheckinSubmissionState;
  submissionError: string | null;

  // AI recommendation
  recommendation: AIRecommendation | null;

  // History
  todayCheckinCompleted: boolean;
  lastCheckinDate: string | null; // ISO date string
};

/**
 * Default check-in form values
 */
export const DEFAULT_CHECKIN_FORM: CheckinFormData = {
  sleepQuality: null,
  sleepHours: null,
  energyLevel: null,
  stressLevel: null,
  overallSoreness: null,
  sorenessAreas: {},
  availableTimeMinutes: null,
  constraints: [],
  travelStatus: 'home',
  notes: '',
};

/**
 * Available time options with labels
 */
export const AVAILABLE_TIME_OPTIONS: {
  value: AvailableTimeMinutes;
  label: string;
}[] = [
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
  { value: 45, label: '45 min' },
  { value: 60, label: '1 hr' },
  { value: 90, label: '1.5 hr' },
  { value: 120, label: '2+ hr' },
];

/**
 * Constraint options with labels and icons
 */
export const CONSTRAINT_OPTIONS: {
  value: ConstraintType;
  label: string;
  icon: string;
}[] = [
  { value: 'traveling', label: 'Traveling', icon: 'airplane' },
  { value: 'limited_equipment', label: 'Limited Equipment', icon: 'barbell-outline' },
  { value: 'feeling_unwell', label: 'Feeling Unwell', icon: 'medical' },
  { value: 'time_constrained', label: 'Busy Day', icon: 'time' },
  { value: 'outdoor_only', label: 'Outdoor Only', icon: 'sunny' },
  { value: 'indoor_only', label: 'Indoor Only', icon: 'home' },
];

/**
 * Body area options with labels
 */
export const BODY_AREA_OPTIONS: {
  value: BodyArea;
  label: string;
}[] = [
  { value: 'legs', label: 'Legs' },
  { value: 'back', label: 'Back' },
  { value: 'shoulders', label: 'Shoulders' },
  { value: 'arms', label: 'Arms' },
  { value: 'core', label: 'Core' },
  { value: 'neck', label: 'Neck' },
];
