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

/**
 * Build the system prompt for the AI coach based on athlete context
 */
export function buildSystemPrompt(context?: AthleteContext): string {
  const basePrompt = `You are Khepri, an AI endurance sports coach specializing in triathlon, cycling, running, and swimming. You are named after the Egyptian god of transformation and renewal, symbolizing the athlete's journey of growth.

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

  if (!context) {
    return basePrompt;
  }

  // Build context section
  const contextParts: string[] = [];

  // Athlete name
  if (context.name) {
    contextParts.push(`Athlete: ${context.name}`);
  }

  // Training load metrics
  const loadMetrics: string[] = [];
  if (context.ctl != null) {
    loadMetrics.push(`CTL: ${context.ctl}`);
  }
  if (context.atl != null) {
    loadMetrics.push(`ATL: ${context.atl}`);
  }
  if (context.tsb != null) {
    loadMetrics.push(`TSB: ${context.tsb} (${getTsbDescription(context.tsb)})`);
  }
  if (loadMetrics.length > 0) {
    contextParts.push(`Current training load: ${loadMetrics.join(', ')}`);
  }

  // Recent check-in data
  if (context.recentCheckin) {
    const checkin = context.recentCheckin;
    const checkinParts: string[] = [];

    if (checkin.sleepHours != null && checkin.sleepQuality != null) {
      checkinParts.push(`Sleep: ${checkin.sleepHours}h (quality ${checkin.sleepQuality}/10)`);
    }
    if (checkin.energyLevel != null) {
      checkinParts.push(`Energy: ${checkin.energyLevel}/10`);
    }
    if (checkin.stressLevel != null) {
      checkinParts.push(`Stress: ${checkin.stressLevel}/10`);
    }
    if (checkin.overallSoreness != null) {
      checkinParts.push(`Soreness: ${checkin.overallSoreness}/10`);
    }
    if (checkin.availableTimeMinutes != null) {
      checkinParts.push(`Available time: ${checkin.availableTimeMinutes} min`);
    }

    if (checkinParts.length > 0) {
      contextParts.push(`Today's check-in: ${checkinParts.join(', ')}`);
    }
  }

  // Goals (limit to 5 most important to cap prompt size)
  if (context.goals && context.goals.length > 0) {
    const goalsList = context.goals
      .slice(0, 5)
      .map((g) => {
        const parts = [g.title.slice(0, 100)]; // Truncate long titles
        if (g.targetDate) {
          parts.push(`(${g.targetDate})`);
        }
        if (g.priority) {
          parts.push(`[Priority ${g.priority}]`);
        }
        return parts.join(' ');
      })
      .join('; ');
    contextParts.push(`Goals: ${goalsList}`);
  }

  // Constraints (limit to 5 most important to cap prompt size)
  if (context.constraints && context.constraints.length > 0) {
    contextParts.push('Active constraints:');
    for (const c of context.constraints.slice(0, 5)) {
      contextParts.push(formatCoachConstraint(c));
    }
  }

  // Recent activities
  if (context.recentActivities && context.recentActivities.length > 0) {
    const recentList = context.recentActivities
      .slice(0, 5) // Limit to 5 most recent
      .map((a) => {
        const parts = [a.type];
        if (a.name) {
          parts.push(`"${a.name}"`);
        }
        if (a.durationMinutes != null) {
          parts.push(`${a.durationMinutes}min`);
        }
        if (a.tss != null) {
          parts.push(`TSS:${a.tss}`);
        }
        return parts.join(' ');
      })
      .join('; ');
    contextParts.push(`Recent activities: ${recentList}`);
  }

  // Combine base prompt with context
  if (contextParts.length > 0) {
    return `${basePrompt}

## Current Athlete Context
${contextParts.join('\n')}`;
  }

  return basePrompt;
}

/**
 * Get a human-readable description of TSB (Training Stress Balance)
 */
function getTsbDescription(tsb: number): string {
  if (tsb >= 25) {
    return 'very fresh, risk of detraining';
  }
  if (tsb >= 5) {
    return 'fresh, good for key sessions or racing';
  }
  if (tsb >= -10) {
    return 'neutral, balanced training state';
  }
  if (tsb >= -30) {
    return 'fatigued, building fitness';
  }
  return 'very fatigued, needs recovery';
}
