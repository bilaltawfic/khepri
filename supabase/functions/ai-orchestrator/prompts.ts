// System prompts and tool definitions for the AI Orchestrator
// Tool definitions mirror the MCP gateway tools

import type { AthleteContext, ClaudeToolDefinition, Constraint } from './types.ts';

/**
 * Tool definitions for Claude to use.
 * These mirror the MCP gateway tools exactly.
 */
export const TOOL_DEFINITIONS: readonly ClaudeToolDefinition[] = [
  {
    name: 'get_activities',
    description:
      "Get recent activities from the athlete's Intervals.icu account. Returns activity list with type, duration, distance, and training metrics.",
    input_schema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Maximum number of activities to return (default: 10, max: 50)',
        },
        oldest: {
          type: 'string',
          description: 'Oldest date to include (ISO 8601 format, e.g., 2026-01-01)',
        },
        newest: {
          type: 'string',
          description: 'Newest date to include (ISO 8601 format, e.g., 2026-02-13)',
        },
        activity_type: {
          type: 'string',
          description: 'Filter by activity type (Ride, Run, Swim, etc.)',
        },
      },
    },
  },
  {
    name: 'get_wellness_data',
    description:
      "Get wellness metrics from the athlete's Intervals.icu account. Returns daily wellness data including CTL/ATL/TSB (fitness/fatigue/form), resting HR, HRV, sleep, weight, and subjective metrics.",
    input_schema: {
      type: 'object',
      properties: {
        oldest: {
          type: 'string',
          description:
            'Start date for wellness data (ISO 8601 format, e.g., 2026-02-01). Defaults to 7 days ago.',
        },
        newest: {
          type: 'string',
          description:
            'End date for wellness data (ISO 8601 format, e.g., 2026-02-13). Defaults to today.',
        },
      },
    },
  },
  {
    name: 'get_events',
    description:
      "Get upcoming calendar events from the athlete's Intervals.icu account. Returns planned workouts, races, rest days, and notes.",
    input_schema: {
      type: 'object',
      properties: {
        oldest: {
          type: 'string',
          description:
            'Start date for events (ISO 8601 format, e.g., 2026-02-14). Defaults to today.',
        },
        newest: {
          type: 'string',
          description:
            'End date for events (ISO 8601 format, e.g., 2026-02-28). Defaults to 14 days from today.',
        },
        types: {
          type: 'array',
          items: { type: 'string' },
          description: 'Filter by event types: workout, race, note, rest_day, travel',
        },
        category: {
          type: 'string',
          description: 'Filter by activity category (Ride, Run, Swim, etc.)',
        },
      },
    },
  },
];

/**
 * Format a single constraint for the system prompt.
 * Injury constraints include body part, severity, and restrictions.
 */
export function formatConstraint(constraint: Constraint): string {
  const dates =
    constraint.start_date || constraint.end_date
      ? ` (${constraint.start_date ?? '?'} to ${constraint.end_date ?? 'ongoing'})`
      : '';

  const header = `- [${constraint.type}] ${constraint.description}${dates}`;

  if (constraint.type !== 'injury' || constraint.injury_severity == null) {
    return header;
  }

  const parts = [header];
  parts.push(
    `  Body part: ${constraint.injury_body_part ?? 'unspecified'} | Severity: ${constraint.injury_severity}`
  );

  if (constraint.injury_restrictions != null && constraint.injury_restrictions.length > 0) {
    const restrictionList = constraint.injury_restrictions.map((r) => `no ${r}`).join(', ');
    parts.push(`  Restrictions: ${restrictionList}`);
  } else {
    parts.push('  Restrictions: no specific restrictions listed');
  }

  return parts.join('\n');
}

/**
 * Build the system prompt with athlete context.
 */
export function buildSystemPrompt(context?: AthleteContext): string {
  const basePrompt = `You are Khepri, an AI endurance coaching assistant. You help athletes optimize their training through personalized advice based on their fitness data, goals, and daily readiness.

## Your Capabilities
You have access to tools that let you fetch real training data from the athlete's Intervals.icu account:
- get_activities: Fetch recent workouts (rides, runs, swims, etc.)
- get_wellness_data: Fetch wellness metrics (CTL/ATL/TSB, HRV, sleep quality, readiness)
- get_events: Fetch scheduled events, planned workouts, and races

## Guidelines
1. **Use data to inform advice**: When discussing training load or recovery, fetch relevant data first.
2. **Respect constraints**: Never recommend training that violates athlete's stated constraints (injuries, time limits).
3. **Be specific**: Give concrete recommendations (e.g., "30-minute easy spin at <65% FTP" not "light exercise").
4. **Explain your reasoning**: Help athletes understand why you're making specific recommendations.
5. **Prioritize safety**: If unsure about injury implications, recommend consulting a professional.

## Injury Safety Rules
- ALWAYS check active injury constraints before recommending any workout
- For SEVERE injuries: only recommend activities that completely avoid the injured area
- For MODERATE injuries: recommend low-intensity alternatives; avoid aggravating movements
- For MILD injuries: allow training with modifications; suggest warm-up and monitoring
- Never recommend "pushing through" pain
- Suggest cross-training alternatives that don't stress the injured area
- When in doubt, recommend rest and consulting a physiotherapist

## Injury-Aware Tool Usage
When making workout recommendations with active injuries:
1. FIRST use check_constraint_compatibility to verify the workout is safe
2. If incompatible, suggest modifications or alternatives
3. Always mention the injury context in your recommendation reasoning

## Response Style
- Be conversational but concise
- Use bullet points for multi-part recommendations
- Include relevant metrics when discussing training load`;

  if (!context) return basePrompt;

  const contextParts: string[] = [basePrompt, '\n## Athlete Context'];

  if (context.display_name) {
    contextParts.push(`Athlete: ${context.display_name}`);
  }

  if (context.ftp_watts != null) {
    contextParts.push(`FTP: ${context.ftp_watts}W`);
  }

  if (context.weight_kg != null) {
    contextParts.push(`Weight: ${context.weight_kg}kg`);
  }

  if (context.ftp_watts != null && context.weight_kg != null && context.weight_kg > 0) {
    const wpkg = Math.round((context.ftp_watts / context.weight_kg) * 100) / 100;
    contextParts.push(`W/kg: ${wpkg}`);
  }

  if (context.active_goals != null && context.active_goals.length > 0) {
    contextParts.push('\n### Active Goals');
    for (const goal of context.active_goals) {
      const priority = goal.priority ? ` (Priority ${goal.priority})` : '';
      const date = goal.target_date ? ` - Target: ${goal.target_date}` : '';
      contextParts.push(`- ${goal.title}${priority}${date}`);
    }
  }

  if (context.active_constraints != null && context.active_constraints.length > 0) {
    contextParts.push('\n### Active Constraints (MUST RESPECT)');
    for (const constraint of context.active_constraints) {
      contextParts.push(formatConstraint(constraint));
    }
  }

  if (context.recent_checkin) {
    const c = context.recent_checkin;
    contextParts.push("\n### Today's Check-in");
    if (c.energy_level != null) contextParts.push(`- Energy: ${c.energy_level}/10`);
    if (c.sleep_quality != null) contextParts.push(`- Sleep: ${c.sleep_quality}/10`);
    if (c.stress_level != null) contextParts.push(`- Stress: ${c.stress_level}/10`);
    if (c.muscle_soreness != null) contextParts.push(`- Soreness: ${c.muscle_soreness}/10`);
  }

  return contextParts.join('\n');
}
