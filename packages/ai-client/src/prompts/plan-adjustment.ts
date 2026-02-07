/**
 * Plan Adjustment Prompt
 *
 * System prompt for adjusting training plans based on changing
 * circumstances, missed workouts, or updated goals.
 */

import { serializeContextForPrompt } from '../context-builder.js';
import type { CoachingContext } from '../types.js';

/**
 * Plan adjustment scenario prompt
 */
export const PLAN_ADJUSTMENT_PROMPT = `## Training Plan Adjustment Scenario

You are reviewing and adjusting the athlete's training plan based on their current situation. Training plans need regular adjustments to remain effective and safe.

### Common Adjustment Scenarios

1. **Missed Workouts**: The athlete missed planned training sessions
2. **Illness or Injury**: New health constraints require plan modification
3. **Life Stress**: Work, family, or other stressors affecting training capacity
4. **Goal Changes**: Updated race dates, new events, or changed priorities
5. **Better/Worse Progress**: Fitness improving faster or slower than expected
6. **Travel**: Upcoming travel affecting training availability
7. **Weather/Conditions**: Seasonal changes or extreme conditions

### Adjustment Principles

**When Workouts Are Missed**
- Don't try to "make up" missed volume by cramming
- Assess why workouts were missed (fatigue? time? motivation?)
- If fatigue-related, consider reducing planned load
- If time-related, restructure remaining week/block
- Key workouts take priority over volume

**When Illness/Injury Occurs**
- Full rest during acute illness
- Gradual return with reduced volume AND intensity
- Rule of thumb: Takes 3x the sick days to fully recover
- Injuries require more conservative approach than illness
- When in doubt, recommend seeing a healthcare provider

**When Adjusting for Events**
- Protect the taper - avoid adding load in final 1-2 weeks
- For A-races, plan backward from event date
- For B/C-races, can train through with minor modifications
- Ensure adequate recovery between events

**When Progress Differs from Expected**
- Faster progress: Slightly increase intensity, not volume
- Slower progress: Check recovery factors first (sleep, stress, nutrition)
- Consider testing (FTP, threshold) to update zones

### Adjustment Response Format

When adjusting a plan, structure your response as:

**Situation Assessment**
Brief summary of why adjustment is needed and key factors to consider.

**Recommended Adjustments**
Specific changes to make, including:
- Immediate changes (this week)
- Short-term changes (next 2-4 weeks)
- Long-term implications (rest of plan)

**Adjusted Week Structure**
If modifying the current or upcoming week, provide the new structure:
- Day-by-day outline
- Key workouts to protect
- Flexible sessions that can move

**Rationale**
Explain why these adjustments are appropriate and how they support the athlete's goals.

**Monitoring Points**
What to watch for to know if further adjustment is needed.

### Safety in Plan Adjustments

Always prioritize:
1. Athlete health and safety
2. Long-term development over short-term gains
3. Arriving at events healthy over perfectly fit
4. Sustainable training over optimal training

### Communication

When delivering plan adjustments:
- Be reassuring - plans changing is normal
- Frame adjustments as part of smart coaching
- Emphasize that flexibility is a strength
- Keep focus on the goal, not the plan itself`;

/**
 * Adjustment request types
 */
export type AdjustmentReason =
  | 'missed-workouts'
  | 'illness'
  | 'injury'
  | 'travel'
  | 'life-stress'
  | 'goal-change'
  | 'progress-review'
  | 'event-change'
  | 'general';

/**
 * Options for plan adjustment request
 */
export interface PlanAdjustmentOptions {
  reason: AdjustmentReason;
  details?: string;
  missedDays?: number;
  newEventDate?: string;
  newConstraints?: string[];
}

/**
 * Build a prompt for plan adjustment
 */
export function buildPlanAdjustmentPrompt(
  context: CoachingContext,
  options: PlanAdjustmentOptions
): string {
  const contextString = serializeContextForPrompt(context);

  const reasonDescriptions: Record<AdjustmentReason, string> = {
    'missed-workouts':
      'The athlete has missed some planned workouts and needs help restructuring their training.',
    illness:
      'The athlete is recovering from illness and needs plan adjustments for a safe return to training.',
    injury: 'The athlete has an injury that requires modifying their training plan.',
    travel:
      'The athlete has upcoming travel that will affect their training availability and equipment access.',
    'life-stress':
      'The athlete is experiencing increased life stress and needs their training load adjusted.',
    'goal-change':
      "The athlete's goals or target events have changed and the plan needs realignment.",
    'progress-review':
      "It's time to review progress and adjust the plan based on fitness development.",
    'event-change': 'An event date has changed, requiring plan restructuring.',
    general: 'The athlete is requesting a general plan review and adjustment.',
  };

  let adjustmentContext = `\n\n## Adjustment Request\n\n**Reason**: ${reasonDescriptions[options.reason]}`;

  if (options.details) {
    adjustmentContext += `\n\n**Additional Details**: ${options.details}`;
  }

  if (options.missedDays !== undefined) {
    adjustmentContext += `\n\n**Missed Training Days**: ${options.missedDays} days`;
  }

  if (options.newEventDate) {
    adjustmentContext += `\n\n**New Event Date**: ${options.newEventDate}`;
  }

  if (options.newConstraints?.length) {
    adjustmentContext += `\n\n**New Constraints**: ${options.newConstraints.join(', ')}`;
  }

  return `${PLAN_ADJUSTMENT_PROMPT}

---

# Athlete Context

${contextString}${adjustmentContext}

---

Please analyze the situation and provide specific plan adjustment recommendations.`;
}

/**
 * Build a prompt for reviewing plan progress
 */
export function buildPlanProgressReviewPrompt(
  context: CoachingContext,
  weeksSinceStart: number
): string {
  const contextString = serializeContextForPrompt(context);

  return `${PLAN_ADJUSTMENT_PROMPT}

---

# Athlete Context

${contextString}

---

## Progress Review Request

The athlete has been following their training plan for ${weeksSinceStart} weeks. Please:

1. Review their progress based on the training data and wellness trends
2. Assess whether they are on track for their goals
3. Identify any areas of concern or opportunity
4. Recommend any adjustments needed for the remaining plan
5. Provide encouragement and perspective on their journey

Focus on both the objective data (activities, fitness metrics) and subjective factors (wellness, consistency).`;
}

/**
 * Build a prompt for handling a race result
 */
export function buildPostRaceReviewPrompt(
  context: CoachingContext,
  raceResult: {
    eventName: string;
    finishTime?: string;
    placement?: string;
    notes?: string;
    athleteFeedback?: string;
  }
): string {
  const contextString = serializeContextForPrompt(context);

  let raceDetails = `## Race Result\n\n**Event**: ${raceResult.eventName}`;

  if (raceResult.finishTime) {
    raceDetails += `\n**Finish Time**: ${raceResult.finishTime}`;
  }
  if (raceResult.placement) {
    raceDetails += `\n**Placement**: ${raceResult.placement}`;
  }
  if (raceResult.notes) {
    raceDetails += `\n**Notes**: ${raceResult.notes}`;
  }
  if (raceResult.athleteFeedback) {
    raceDetails += `\n**Athlete's Feedback**: ${raceResult.athleteFeedback}`;
  }

  return `${PLAN_ADJUSTMENT_PROMPT}

---

# Athlete Context

${contextString}

---

${raceDetails}

---

## Post-Race Analysis Request

Please provide:

1. **Race Analysis**: Review the result in context of the athlete's training and goals
2. **Recovery Recommendations**: Suggest appropriate recovery timeline and activities
3. **Lessons Learned**: Identify what went well and what could be improved
4. **Next Steps**: Recommend adjustments for upcoming training and future goals
5. **Celebration**: Acknowledge the effort regardless of result - completing a race is an achievement

Be supportive while providing honest, constructive feedback.`;
}
