/** A single data point with CTL/ATL/TSB values for a given date */
export type FitnessDataPoint = {
  readonly date: string; // YYYY-MM-DD
  readonly ctl: number; // Chronic Training Load (fitness)
  readonly atl: number; // Acute Training Load (fatigue)
  readonly tsb: number; // Training Stress Balance (form)
};

/** Result of form trend analysis over a time window */
export type FormTrend = {
  readonly direction: 'improving' | 'stable' | 'declining';
  readonly tsbChange: number; // TSB delta over the window
  readonly ctlChange: number; // CTL delta over the window
  readonly atlChange: number; // ATL delta over the window
  readonly currentTsb: number;
  readonly averageTsb: number;
};

/** Form status categories based on TSB value */
export const FORM_STATUSES = ['race_ready', 'fresh', 'optimal', 'tired', 'overtrained'] as const;
export type FormStatus = (typeof FORM_STATUSES)[number];

/** An activity record with training stress */
export type ActivityRecord = {
  readonly date: string; // YYYY-MM-DD
  readonly duration: number; // minutes
  readonly tss: number; // Training Stress Score
  readonly type?: string;
};

/** Weekly training load summary */
export type WeeklyLoadSummary = {
  readonly weekStart: string; // YYYY-MM-DD (Monday)
  readonly totalTss: number;
  readonly activityCount: number;
  readonly averageTssPerActivity: number;
  readonly totalDuration: number; // minutes
};

/** Race readiness assessment */
export type RaceReadiness = {
  readonly daysUntilRace: number;
  readonly currentForm: FormStatus;
  readonly projectedTsb: number; // Estimated TSB on race day
  readonly recommendation: string; // Brief actionable advice
  readonly confidence: 'high' | 'medium' | 'low';
};

/** Recovery assessment */
export type RecoveryAssessment = {
  readonly fatigueLevel: 'low' | 'moderate' | 'high' | 'very_high';
  readonly suggestedRecoveryDays: number;
  readonly rampRate: number; // Weekly CTL change (positive = building, negative = detraining)
  readonly isOverreaching: boolean;
};
