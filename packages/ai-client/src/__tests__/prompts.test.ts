/**
 * Tests for Prompt Builders
 */

import { describe, expect, it } from '@jest/globals';
import {
  COACHING_SYSTEM_PROMPT,
  DAILY_CHECKIN_PROMPT,
  PLAN_ADJUSTMENT_PROMPT,
  WORKOUT_RECOMMENDATION_PROMPT,
  buildCheckinFollowupPrompt,
  buildDailyCheckinPrompt,
  buildPlanAdjustmentPrompt,
  buildPlanProgressReviewPrompt,
  buildPostRaceReviewPrompt,
  buildWorkoutAlternativesPrompt,
  buildWorkoutRecommendationPrompt,
  getCoachingSystemPrompt,
} from '../prompts/index.js';
import type { CoachingContext } from '../types.js';

// =============================================================================
// TEST DATA FIXTURES
// =============================================================================

const mockAthlete = {
  id: 'athlete-123',
  displayName: 'Test Athlete',
  preferredUnits: 'metric' as const,
  timezone: 'America/New_York',
  intervalsIcuConnected: false,
};

const createContext = (overrides: Partial<CoachingContext> = {}): CoachingContext => ({
  athlete: mockAthlete,
  goals: [],
  constraints: [],
  recentActivities: [],
  wellnessHistory: [],
  ...overrides,
});

// =============================================================================
// COACHING SYSTEM PROMPT TESTS
// =============================================================================

describe('COACHING_SYSTEM_PROMPT', () => {
  it('defines Claude as Khepri', () => {
    expect(COACHING_SYSTEM_PROMPT).toContain('You are Khepri');
    expect(COACHING_SYSTEM_PROMPT).toContain('AI-powered triathlon coach');
  });

  it('includes coaching philosophy', () => {
    expect(COACHING_SYSTEM_PROMPT).toContain('Coaching Philosophy');
    expect(COACHING_SYSTEM_PROMPT).toContain('Progressive Overload');
    expect(COACHING_SYSTEM_PROMPT).toContain('Specificity');
    expect(COACHING_SYSTEM_PROMPT).toContain('Individualization');
  });

  it('includes training zones', () => {
    expect(COACHING_SYSTEM_PROMPT).toContain('Training Zones');
    expect(COACHING_SYSTEM_PROMPT).toContain('Zone 1 (Recovery)');
    expect(COACHING_SYSTEM_PROMPT).toContain('Zone 2 (Endurance)');
    expect(COACHING_SYSTEM_PROMPT).toContain('Zone 5 (VO2max)');
  });

  it('includes safety guidelines', () => {
    expect(COACHING_SYSTEM_PROMPT).toContain('Safety Guidelines');
    expect(COACHING_SYSTEM_PROMPT).toContain('Red Flags');
    expect(COACHING_SYSTEM_PROMPT).toContain('Recommend Rest');
  });

  it('includes communication style guidance', () => {
    expect(COACHING_SYSTEM_PROMPT).toContain('Communication Style');
    expect(COACHING_SYSTEM_PROMPT).toContain('encouraging but honest');
  });
});

describe('getCoachingSystemPrompt', () => {
  it('returns base prompt when no options provided', () => {
    const prompt = getCoachingSystemPrompt();
    expect(prompt).toBe(COACHING_SYSTEM_PROMPT);
  });

  it('returns base prompt when empty options provided', () => {
    const prompt = getCoachingSystemPrompt({});
    expect(prompt).toBe(COACHING_SYSTEM_PROMPT);
  });

  it('adds athlete name when provided', () => {
    const prompt = getCoachingSystemPrompt({ athleteName: 'Sarah' });
    expect(prompt).toContain('Sarah');
    expect(prompt).toContain('Athlete Name');
    expect(prompt).toContain('personalize the coaching experience');
  });

  it('adds direct tone preference when specified', () => {
    const prompt = getCoachingSystemPrompt({ coachingTone: 'direct' });
    expect(prompt).toContain('Tone Preference');
    expect(prompt).toContain('direct, no-nonsense coaching');
    expect(prompt).toContain('Keep explanations brief');
  });

  it('adds technical tone preference when specified', () => {
    const prompt = getCoachingSystemPrompt({ coachingTone: 'technical' });
    expect(prompt).toContain('Tone Preference');
    expect(prompt).toContain('science behind training');
    expect(prompt).toContain('technical details');
    expect(prompt).toContain('physiological concepts');
  });

  it('does not add tone preference for supportive tone', () => {
    const prompt = getCoachingSystemPrompt({ coachingTone: 'supportive' });
    expect(prompt).not.toContain('Tone Preference');
  });

  it('adds both name and tone when both provided', () => {
    const prompt = getCoachingSystemPrompt({
      athleteName: 'Mike',
      coachingTone: 'technical',
    });
    expect(prompt).toContain('Mike');
    expect(prompt).toContain('technical details');
  });
});

// =============================================================================
// DAILY CHECKIN PROMPT TESTS
// =============================================================================

describe('DAILY_CHECKIN_PROMPT', () => {
  it('describes the daily check-in scenario', () => {
    expect(DAILY_CHECKIN_PROMPT).toContain('Daily Check-in Scenario');
    expect(DAILY_CHECKIN_PROMPT).toContain("athlete's daily wellness check-in");
  });

  it('includes decision framework', () => {
    expect(DAILY_CHECKIN_PROMPT).toContain('Decision Framework');
    expect(DAILY_CHECKIN_PROMPT).toContain('Green Light');
    expect(DAILY_CHECKIN_PROMPT).toContain('Yellow Light');
    expect(DAILY_CHECKIN_PROMPT).toContain('Red Light');
  });

  it('includes response structure', () => {
    expect(DAILY_CHECKIN_PROMPT).toContain('Response Structure');
    expect(DAILY_CHECKIN_PROMPT).toContain('Daily Assessment');
    expect(DAILY_CHECKIN_PROMPT).toContain("Today's Recommendation");
    expect(DAILY_CHECKIN_PROMPT).toContain('Alternatives');
  });
});

describe('buildDailyCheckinPrompt', () => {
  it('includes the daily checkin prompt', () => {
    const context = createContext();
    const prompt = buildDailyCheckinPrompt(context);
    expect(prompt).toContain('Daily Check-in Scenario');
  });

  it('includes athlete context', () => {
    const context = createContext();
    const prompt = buildDailyCheckinPrompt(context);
    expect(prompt).toContain('Athlete Context');
    expect(prompt).toContain('Test Athlete');
  });

  it('ends with instruction to analyze', () => {
    const context = createContext();
    const prompt = buildDailyCheckinPrompt(context);
    expect(prompt).toContain("provide today's workout recommendation");
  });
});

describe('buildCheckinFollowupPrompt', () => {
  it('includes the daily checkin prompt', () => {
    const context = createContext();
    const prompt = buildCheckinFollowupPrompt(
      context,
      'Previous recommendation',
      'Can I do something different?'
    );
    expect(prompt).toContain('Daily Check-in Scenario');
  });

  it('includes previous recommendation', () => {
    const context = createContext();
    const prompt = buildCheckinFollowupPrompt(
      context,
      'I recommended a 45 minute easy run',
      'What if I want to swim instead?'
    );
    expect(prompt).toContain('Previous Recommendation');
    expect(prompt).toContain('45 minute easy run');
  });

  it('includes the follow-up question', () => {
    const context = createContext();
    const prompt = buildCheckinFollowupPrompt(
      context,
      'Previous recommendation',
      'Can I add intervals today?'
    );
    expect(prompt).toContain("Athlete's Follow-up");
    expect(prompt).toContain('add intervals today');
  });

  it('ends with instruction to respond to follow-up', () => {
    const context = createContext();
    const prompt = buildCheckinFollowupPrompt(context, 'Previous recommendation', 'Question');
    expect(prompt).toContain("respond to the athlete's follow-up question");
  });
});

// =============================================================================
// WORKOUT RECOMMENDATION PROMPT TESTS
// =============================================================================

describe('WORKOUT_RECOMMENDATION_PROMPT', () => {
  it('describes workout recommendation scenario', () => {
    expect(WORKOUT_RECOMMENDATION_PROMPT).toContain('Workout Recommendation');
  });
});

describe('buildWorkoutRecommendationPrompt', () => {
  it('includes the workout recommendation prompt', () => {
    const context = createContext();
    const prompt = buildWorkoutRecommendationPrompt(context);
    expect(prompt).toContain('Workout Recommendation');
  });

  it('includes athlete context', () => {
    const context = createContext();
    const prompt = buildWorkoutRecommendationPrompt(context);
    expect(prompt).toContain('Athlete Context');
  });

  it('accepts options for sport', () => {
    const context = createContext();
    const prompt = buildWorkoutRecommendationPrompt(context, { sport: 'run' });
    expect(prompt).toContain('Sport: run');
  });

  it('accepts options for duration', () => {
    const context = createContext();
    const prompt = buildWorkoutRecommendationPrompt(context, { durationMinutes: 45 });
    expect(prompt).toContain('Duration: 45 minutes');
  });

  it('accepts options for intensity', () => {
    const context = createContext();
    const prompt = buildWorkoutRecommendationPrompt(context, { intensity: 'tempo' });
    expect(prompt).toContain('Intensity: tempo');
  });

  it('accepts options for indoor', () => {
    const context = createContext();
    const prompt = buildWorkoutRecommendationPrompt(context, { indoor: true });
    expect(prompt).toContain('Environment: Indoor');
  });

  it('accepts options for focus', () => {
    const context = createContext();
    const prompt = buildWorkoutRecommendationPrompt(context, { focus: 'threshold' });
    expect(prompt).toContain('Focus: threshold');
  });
});

describe('buildWorkoutAlternativesPrompt', () => {
  it('includes original workout', () => {
    const context = createContext();
    const prompt = buildWorkoutAlternativesPrompt(context, 'Easy 30 minute run', 'easier');
    expect(prompt).toContain('Easy 30 minute run');
  });

  it('includes preference for easier', () => {
    const context = createContext();
    const prompt = buildWorkoutAlternativesPrompt(context, 'Tempo run', 'easier');
    expect(prompt).toContain('easier version');
  });

  it('includes preference for harder', () => {
    const context = createContext();
    const prompt = buildWorkoutAlternativesPrompt(context, 'Easy run', 'harder');
    expect(prompt).toContain('more challenging version');
  });

  it('includes preference for different sport', () => {
    const context = createContext();
    const prompt = buildWorkoutAlternativesPrompt(context, 'Run workout', 'different-sport');
    expect(prompt).toContain('different sport');
  });

  it('includes preference for shorter', () => {
    const context = createContext();
    const prompt = buildWorkoutAlternativesPrompt(context, 'Long run', 'shorter');
    expect(prompt).toContain('less time available');
  });

  it('includes preference for longer', () => {
    const context = createContext();
    const prompt = buildWorkoutAlternativesPrompt(context, 'Quick run', 'longer');
    expect(prompt).toContain('more time available');
  });
});

// =============================================================================
// PLAN ADJUSTMENT PROMPT TESTS
// =============================================================================

describe('PLAN_ADJUSTMENT_PROMPT', () => {
  it('describes plan adjustment scenario', () => {
    expect(PLAN_ADJUSTMENT_PROMPT).toContain('Plan Adjustment');
  });
});

describe('buildPlanAdjustmentPrompt', () => {
  it('includes the plan adjustment prompt', () => {
    const context = createContext();
    const prompt = buildPlanAdjustmentPrompt(context, { reason: 'general' });
    expect(prompt).toContain('Plan Adjustment');
  });

  it('includes athlete context', () => {
    const context = createContext();
    const prompt = buildPlanAdjustmentPrompt(context, { reason: 'general' });
    expect(prompt).toContain('Athlete Context');
  });

  it('handles injury reason', () => {
    const context = createContext();
    const prompt = buildPlanAdjustmentPrompt(context, {
      reason: 'injury',
      details: 'Knee pain',
    });
    expect(prompt).toContain('injury');
    expect(prompt).toContain('Knee pain');
  });

  it('handles illness reason', () => {
    const context = createContext();
    const prompt = buildPlanAdjustmentPrompt(context, {
      reason: 'illness',
      details: 'Cold symptoms',
    });
    expect(prompt).toContain('illness');
    expect(prompt).toContain('Cold symptoms');
  });

  it('handles travel reason', () => {
    const context = createContext();
    const prompt = buildPlanAdjustmentPrompt(context, {
      reason: 'travel',
      details: 'Business trip next week',
    });
    expect(prompt).toContain('travel');
    expect(prompt).toContain('Business trip');
  });

  it('handles life-stress reason', () => {
    const context = createContext();
    const prompt = buildPlanAdjustmentPrompt(context, {
      reason: 'life-stress',
      details: 'Busy work week',
    });
    expect(prompt).toContain('life stress');
    expect(prompt).toContain('Busy work week');
  });

  it('handles missed-workouts reason', () => {
    const context = createContext();
    const prompt = buildPlanAdjustmentPrompt(context, {
      reason: 'missed-workouts',
      missedDays: 3,
    });
    expect(prompt).toContain('missed');
    expect(prompt).toContain('3 days');
  });

  it('handles goal-change reason', () => {
    const context = createContext();
    const prompt = buildPlanAdjustmentPrompt(context, {
      reason: 'goal-change',
      details: 'Want to focus more on running',
    });
    expect(prompt).toContain('goals');
    expect(prompt).toContain('running');
  });

  it('handles general reason', () => {
    const context = createContext();
    const prompt = buildPlanAdjustmentPrompt(context, {
      reason: 'general',
      details: 'General review requested',
    });
    expect(prompt).toContain('general plan review');
    expect(prompt).toContain('General review requested');
  });

  it('handles event-change reason', () => {
    const context = createContext();
    const prompt = buildPlanAdjustmentPrompt(context, {
      reason: 'event-change',
      newEventDate: '2024-10-15',
    });
    expect(prompt).toContain('event date');
    expect(prompt).toContain('2024-10-15');
  });
});

describe('buildPlanProgressReviewPrompt', () => {
  it('includes athlete context', () => {
    const context = createContext();
    const prompt = buildPlanProgressReviewPrompt(context, 4);
    expect(prompt).toContain('Athlete Context');
  });

  it('includes weeks since start', () => {
    const context = createContext();
    const prompt = buildPlanProgressReviewPrompt(context, 8);
    expect(prompt).toContain('8 weeks');
  });

  it('requests progress review', () => {
    const context = createContext();
    const prompt = buildPlanProgressReviewPrompt(context, 4);
    expect(prompt).toContain('Review their progress');
  });
});

describe('buildPostRaceReviewPrompt', () => {
  it('includes race result', () => {
    const context = createContext();
    const prompt = buildPostRaceReviewPrompt(context, {
      eventName: 'Ironman 70.3',
      finishTime: '5:30:00',
      notes: 'Felt strong on the bike',
    });
    expect(prompt).toContain('Ironman 70.3');
    expect(prompt).toContain('5:30:00');
    expect(prompt).toContain('strong on the bike');
  });

  it('includes athlete context', () => {
    const context = createContext();
    const prompt = buildPostRaceReviewPrompt(context, {
      eventName: 'Marathon',
    });
    expect(prompt).toContain('Athlete Context');
  });

  it('includes placement when provided', () => {
    const context = createContext();
    const prompt = buildPostRaceReviewPrompt(context, {
      eventName: 'Local 5K',
      placement: '1st in age group',
    });
    expect(prompt).toContain('1st in age group');
  });

  it('includes athlete feedback when provided', () => {
    const context = createContext();
    const prompt = buildPostRaceReviewPrompt(context, {
      eventName: 'Half Marathon',
      athleteFeedback: 'Felt great throughout',
    });
    expect(prompt).toContain('Felt great throughout');
  });
});
