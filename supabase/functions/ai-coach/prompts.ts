// Khepri AI Coach System Prompts
// Defines the personality and context for Claude as an endurance sports coach

/**
 * Athlete context provided to the AI for personalized responses
 */
export interface AthleteContext {
  name?: string;
  ctl?: number; // Chronic Training Load
  atl?: number; // Acute Training Load
  tsb?: number; // Training Stress Balance
  recentCheckin?: {
    sleepQuality?: number;
    sleepHours?: number;
    energyLevel?: number;
    stressLevel?: number;
    overallSoreness?: number;
    availableTimeMinutes?: number;
  };
  goals?: Array<{
    title: string;
    goalType: string;
    targetDate?: string;
    priority?: string;
  }>;
  constraints?: Array<{
    title: string;
    constraintType: string;
    description?: string;
    injuryBodyPart?: string;
    injurySeverity?: 'mild' | 'moderate' | 'severe';
    injuryRestrictions?: string[];
  }>;
  recentActivities?: Array<{
    type: string;
    name?: string;
    date: string;
    durationMinutes?: number;
    tss?: number;
  }>;
}

type CoachConstraint = NonNullable<AthleteContext['constraints']>[number];

/**
 * Format a single constraint for the coach system prompt.
 * Injury constraints include severity, body part, and restrictions.
 */
export function formatCoachConstraint(c: CoachConstraint): string {
  const title = c.title.slice(0, 100);

  if (c.constraintType !== 'injury' || c.injurySeverity == null) {
    return `- ${title} (${c.constraintType})`;
  }

  const bodyPart = c.injuryBodyPart ? ` — affects ${c.injuryBodyPart}` : '';
  const header = `- INJURY (${c.injurySeverity}): ${title}${bodyPart}`;

  if (c.injuryRestrictions != null && c.injuryRestrictions.length > 0) {
    const restrictions = c.injuryRestrictions.map((r) => `no ${r}`).join(', ');
    return `${header}\n  Restrictions: ${restrictions}`;
  }

  return header;
}

const BASE_PROMPT = `You are Khepri, an AI endurance sports coach specializing in triathlon, cycling, running, and swimming. You are named after the Egyptian god of transformation and renewal, symbolizing the athlete's journey of growth.

## Your Personality
- Supportive and encouraging, but honest about what's needed
- Evidence-based in your recommendations, drawing from sports science
- Adaptive to the athlete's current state (tired vs. energized, stressed vs. relaxed)
- Focused on long-term development while respecting short-term constraints
- Concise and actionable in your responses

## Your Expertise
- Periodization and training load management (CTL/ATL/TSB)
- Recovery optimization based on sleep, stress, and soreness
- Workout prescription for endurance sports
- Race preparation and tapering strategies
- Injury prevention and management

## Communication Style
- Be conversational but professional
- Use specific numbers and metrics when relevant
- Acknowledge the athlete's feelings and circumstances
- Provide clear, actionable recommendations
- Ask clarifying questions when needed

## Safety Guidelines
- Never recommend training through pain or injury
- Respect rest days and recovery needs
- Consider cumulative fatigue in recommendations
- Defer to medical professionals for health concerns
- When injury constraints are active, always recommend activities that avoid the injured area
- For severe injuries, only suggest complete rest or activities that don't involve the injury site
- Suggest specific alternatives (e.g., "swim instead of run for knee injuries")`;

/**
 * Get a human-readable description of TSB (Training Stress Balance)
 */
function getTsbDescription(tsb: number): string {
  if (tsb >= 25) return 'very fresh, risk of detraining';
  if (tsb >= 5) return 'fresh, good for key sessions or racing';
  if (tsb >= -10) return 'neutral, balanced training state';
  if (tsb >= -30) return 'fatigued, building fitness';
  return 'very fatigued, needs recovery';
}

function formatCoachLoadMetrics(context: AthleteContext): string[] {
  const parts: string[] = [];
  if (context.name) parts.push(`Athlete: ${context.name}`);

  const loadMetrics: string[] = [];
  if (context.ctl != null) loadMetrics.push(`CTL: ${context.ctl}`);
  if (context.atl != null) loadMetrics.push(`ATL: ${context.atl}`);
  if (context.tsb != null)
    loadMetrics.push(`TSB: ${context.tsb} (${getTsbDescription(context.tsb)})`);
  if (loadMetrics.length > 0) parts.push(`Current training load: ${loadMetrics.join(', ')}`);

  return parts;
}

function formatCoachCheckin(checkin: NonNullable<AthleteContext['recentCheckin']>): string | null {
  const parts: string[] = [];
  if (checkin.sleepHours != null && checkin.sleepQuality != null) {
    parts.push(`Sleep: ${checkin.sleepHours}h (quality ${checkin.sleepQuality}/10)`);
  }
  if (checkin.energyLevel != null) parts.push(`Energy: ${checkin.energyLevel}/10`);
  if (checkin.stressLevel != null) parts.push(`Stress: ${checkin.stressLevel}/10`);
  if (checkin.overallSoreness != null) parts.push(`Soreness: ${checkin.overallSoreness}/10`);
  if (checkin.availableTimeMinutes != null)
    parts.push(`Available time: ${checkin.availableTimeMinutes} min`);
  return parts.length > 0 ? `Today's check-in: ${parts.join(', ')}` : null;
}

function formatCoachGoals(goals: NonNullable<AthleteContext['goals']>): string {
  const goalsList = goals
    .slice(0, 5)
    .map((g) => {
      const parts = [g.title.slice(0, 100)];
      if (g.targetDate) parts.push(`(${g.targetDate})`);
      if (g.priority) parts.push(`[Priority ${g.priority}]`);
      return parts.join(' ');
    })
    .join('; ');
  return `Goals: ${goalsList}`;
}

type CoachActivity = NonNullable<AthleteContext['recentActivities']>[number];

function formatCoachActivity(a: CoachActivity): string {
  const parts = [a.type];
  if (a.name) parts.push(`"${a.name}"`);
  if (a.durationMinutes != null) parts.push(`${a.durationMinutes}min`);
  if (a.tss != null) parts.push(`TSS:${a.tss}`);
  return parts.join(' ');
}

function formatCoachActivities(
  activities: NonNullable<AthleteContext['recentActivities']>
): string {
  return `Recent activities: ${activities.slice(0, 5).map(formatCoachActivity).join('; ')}`;
}

/**
 * Build the system prompt for the AI coach based on athlete context
 */
export function buildSystemPrompt(context?: AthleteContext): string {
  if (!context) return BASE_PROMPT;

  const contextParts: string[] = formatCoachLoadMetrics(context);

  if (context.recentCheckin) {
    const checkin = formatCoachCheckin(context.recentCheckin);
    if (checkin) contextParts.push(checkin);
  }

  if (context.goals && context.goals.length > 0) {
    contextParts.push(formatCoachGoals(context.goals));
  }

  if (context.constraints && context.constraints.length > 0) {
    contextParts.push('Active constraints:');
    for (const c of context.constraints.slice(0, 5)) {
      contextParts.push(formatCoachConstraint(c));
    }
  }

  if (context.recentActivities && context.recentActivities.length > 0) {
    contextParts.push(formatCoachActivities(context.recentActivities));
  }

  if (contextParts.length === 0) return BASE_PROMPT;

  return `${BASE_PROMPT}

## Current Athlete Context
${contextParts.join('\n')}`;
}
