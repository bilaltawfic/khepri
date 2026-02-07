/**
 * Workout Recommendation Prompt
 *
 * System prompt for generating specific workout recommendations
 * with detailed structure, intervals, and coaching cues.
 */

import { serializeContextForPrompt } from '../context-builder.js';
import type { CoachingContext, WorkoutIntensity, WorkoutSport } from '../types.js';

/**
 * Workout recommendation scenario prompt
 */
export const WORKOUT_RECOMMENDATION_PROMPT = `## Workout Recommendation Scenario

You are creating a detailed, structured workout for the athlete. The workout should be specific, actionable, and appropriate for their current fitness and goals.

### Workout Structure Format

Provide workouts in this structured format:

**Workout Title**: A descriptive name for the workout

**Overview**
- Sport: [swim/bike/run/strength]
- Duration: [total time]
- Intensity: [recovery/easy/moderate/tempo/threshold/vo2max]
- Estimated TSS: [training stress score]
- Focus: [primary training adaptation]

**Warm-up** (X minutes)
- Description of warm-up activities
- Any drills or activation exercises
- Progressive intensity build

**Main Set**
Detailed intervals or continuous work, including:
- Duration or distance of each segment
- Target intensity (HR zone, power, pace, or RPE)
- Recovery between intervals
- Total number of repetitions/sets
- Form cues or focus points

**Cool-down** (X minutes)
- Easy spinning/jogging/swimming
- Static stretching recommendations
- Any recovery protocols

**Coaching Notes**
- Key focus points for execution
- Common mistakes to avoid
- Mental cues or mantras
- Weather/terrain considerations

### Sport-Specific Guidelines

**Swimming**
- Use intervals based on 100m or 50m
- Include stroke technique drills
- Specify send-off times or rest intervals
- Consider pool availability and lane sharing

**Cycling**
- Use power-based zones when FTP is available
- Otherwise use HR zones or RPE
- Consider indoor vs outdoor context
- Include cadence targets when relevant

**Running**
- Use pace-based targets when threshold pace is available
- Otherwise use HR zones or effort descriptions
- Include terrain considerations
- Specify easy vs moderate recovery jogs

**Strength**
- Focus on movements that support triathlon
- Include sets, reps, and rest periods
- Emphasize proper form over weight
- Consider equipment availability

### Intensity Guidelines

Match workout intensity to the athlete's current state and training phase:

| Phase | Primary Focus | Typical Intensity |
|-------|--------------|-------------------|
| Base | Aerobic development | Mostly Z1-Z2, some Z3 |
| Build | Threshold development | Z2-Z4 with structured intervals |
| Peak | Race-specific | Mixed, including Z4-Z5 |
| Taper | Maintaining sharpness | Reduced volume, brief high intensity |
| Recovery | Restoration | Z1 only |

### TSS Estimation Guidelines

Approximate TSS per hour by intensity:
- Recovery (Z1): 30-40 TSS/hour
- Endurance (Z2): 50-60 TSS/hour
- Tempo (Z3): 70-80 TSS/hour
- Threshold (Z4): 90-100 TSS/hour
- VO2max (Z5): 110-130 TSS/hour

Adjust based on actual workout structure and intervals.`;

/**
 * Options for workout recommendation
 */
export interface WorkoutRecommendationOptions {
  sport?: WorkoutSport;
  durationMinutes?: number;
  intensity?: WorkoutIntensity;
  focus?: string;
  indoor?: boolean;
  equipment?: string[];
}

// Format environment option
function formatEnvironment(indoor: boolean | undefined): string | undefined {
  if (indoor === undefined) return undefined;
  return indoor ? 'Indoor' : 'Outdoor';
}

// Format workout options as parameter strings
function formatWorkoutOptions(options: WorkoutRecommendationOptions): string[] {
  const entries: Array<[string, string | undefined]> = [
    ['Sport', options.sport],
    ['Duration', options.durationMinutes ? `${options.durationMinutes} minutes` : undefined],
    ['Intensity', options.intensity],
    ['Focus', options.focus],
    ['Environment', formatEnvironment(options.indoor)],
    ['Available Equipment', options.equipment?.length ? options.equipment.join(', ') : undefined],
  ];
  return entries
    .filter((e): e is [string, string] => e[1] !== undefined)
    .map(([k, v]) => `- ${k}: ${v}`);
}

/**
 * Build a prompt for generating a specific workout
 */
export function buildWorkoutRecommendationPrompt(
  context: CoachingContext,
  options?: WorkoutRecommendationOptions
): string {
  const contextString = serializeContextForPrompt(context);
  const details = options ? formatWorkoutOptions(options) : [];
  const requestDetails =
    details.length > 0 ? `\n\n## Requested Workout Parameters\n${details.join('\n')}` : '';

  return `${WORKOUT_RECOMMENDATION_PROMPT}

---

# Athlete Context

${contextString}${requestDetails}

---

Please create a detailed, structured workout appropriate for this athlete's current state, goals, and constraints.`;
}

/**
 * Build a prompt for generating workout alternatives
 */
export function buildWorkoutAlternativesPrompt(
  context: CoachingContext,
  originalWorkout: string,
  reason: 'easier' | 'harder' | 'different-sport' | 'shorter' | 'longer'
): string {
  const contextString = serializeContextForPrompt(context);

  const reasonExplanation = {
    easier:
      'The athlete would like an easier version of this workout, perhaps due to fatigue or time constraints.',
    harder:
      'The athlete is feeling good and would like a more challenging version of this workout.',
    'different-sport':
      'The athlete would like a similar training stimulus but in a different sport.',
    shorter: 'The athlete has less time available and needs a condensed version of this workout.',
    longer: 'The athlete has more time available and would like to extend this workout.',
  };

  return `${WORKOUT_RECOMMENDATION_PROMPT}

---

# Athlete Context

${contextString}

---

# Original Workout

${originalWorkout}

---

# Alternative Request

${reasonExplanation[reason]}

Please provide an appropriate alternative workout that addresses this request while maintaining training value.`;
}
