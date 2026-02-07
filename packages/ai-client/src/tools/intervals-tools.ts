/**
 * Intervals.icu Tool Definitions
 *
 * Tool definitions for Claude to interact with Intervals.icu data
 * via the MCP server. These tools allow the AI to fetch training
 * data, wellness metrics, and events.
 */

import type { Tool } from '@anthropic-ai/sdk/resources/messages';

/**
 * Tool definition for getting activities from Intervals.icu
 */
export const GET_ACTIVITIES_TOOL: Tool = {
  name: 'get_activities',
  description: `Retrieve a list of activities from Intervals.icu within a date range.
Returns activity summaries including type, duration, distance, training load (TSS), and performance metrics.
Use this to understand the athlete's recent training history.`,
  input_schema: {
    type: 'object' as const,
    properties: {
      oldest: {
        type: 'string',
        description: 'Start date in YYYY-MM-DD format (inclusive)',
      },
      newest: {
        type: 'string',
        description: 'End date in YYYY-MM-DD format (inclusive)',
      },
    },
    required: ['oldest', 'newest'],
  },
};

/**
 * Tool definition for getting activity details
 */
export const GET_ACTIVITY_DETAILS_TOOL: Tool = {
  name: 'get_activity_details',
  description: `Get detailed information about a specific activity from Intervals.icu.
Returns full activity data including intervals, laps, power/HR data, and analysis.
Use this when you need more detail about a specific workout.`,
  input_schema: {
    type: 'object' as const,
    properties: {
      activity_id: {
        type: 'string',
        description: 'The unique identifier for the activity',
      },
    },
    required: ['activity_id'],
  },
};

/**
 * Tool definition for getting activity intervals
 */
export const GET_ACTIVITY_INTERVALS_TOOL: Tool = {
  name: 'get_activity_intervals',
  description: `Get interval/lap data for a specific activity from Intervals.icu.
Returns detailed breakdown of each interval including duration, power, HR, pace.
Use this to analyze workout execution and recovery between intervals.`,
  input_schema: {
    type: 'object' as const,
    properties: {
      activity_id: {
        type: 'string',
        description: 'The unique identifier for the activity',
      },
    },
    required: ['activity_id'],
  },
};

/**
 * Tool definition for getting wellness data
 */
export const GET_WELLNESS_DATA_TOOL: Tool = {
  name: 'get_wellness_data',
  description: `Fetch wellness metrics from Intervals.icu for a date range.
Returns daily wellness data including sleep, HRV, resting HR, weight, fatigue, mood, and soreness.
Use this to understand the athlete's recovery status and trends.`,
  input_schema: {
    type: 'object' as const,
    properties: {
      oldest: {
        type: 'string',
        description: 'Start date in YYYY-MM-DD format (inclusive)',
      },
      newest: {
        type: 'string',
        description: 'End date in YYYY-MM-DD format (inclusive)',
      },
    },
    required: ['oldest', 'newest'],
  },
};

/**
 * Tool definition for getting events (planned workouts, races)
 */
export const GET_EVENTS_TOOL: Tool = {
  name: 'get_events',
  description: `Get upcoming events from Intervals.icu calendar.
Returns planned workouts, races, and other events.
Use this to understand what training is scheduled and when races are coming up.`,
  input_schema: {
    type: 'object' as const,
    properties: {
      oldest: {
        type: 'string',
        description: 'Start date in YYYY-MM-DD format (inclusive)',
      },
      newest: {
        type: 'string',
        description: 'End date in YYYY-MM-DD format (inclusive)',
      },
    },
    required: ['oldest', 'newest'],
  },
};

/**
 * Tool definition for getting event details
 */
export const GET_EVENT_BY_ID_TOOL: Tool = {
  name: 'get_event_by_id',
  description: `Get detailed information about a specific event from Intervals.icu.
Returns full event details including workout structure if it's a planned workout.
Use this when you need more detail about a specific planned workout or race.`,
  input_schema: {
    type: 'object' as const,
    properties: {
      event_id: {
        type: 'string',
        description: 'The unique identifier for the event',
      },
    },
    required: ['event_id'],
  },
};

/**
 * All Intervals.icu tools
 */
export const INTERVALS_TOOLS: Tool[] = [
  GET_ACTIVITIES_TOOL,
  GET_ACTIVITY_DETAILS_TOOL,
  GET_ACTIVITY_INTERVALS_TOOL,
  GET_WELLNESS_DATA_TOOL,
  GET_EVENTS_TOOL,
  GET_EVENT_BY_ID_TOOL,
];

/**
 * Get tools for a specific use case
 */
export function getIntervalsToolsForScenario(
  scenario: 'daily-checkin' | 'plan-review' | 'workout-analysis' | 'full'
): Tool[] {
  switch (scenario) {
    case 'daily-checkin':
      // For daily check-ins, we need recent activities and wellness
      return [GET_ACTIVITIES_TOOL, GET_WELLNESS_DATA_TOOL, GET_EVENTS_TOOL];

    case 'plan-review':
      // For plan reviews, we need activities, events, and wellness trends
      return [GET_ACTIVITIES_TOOL, GET_WELLNESS_DATA_TOOL, GET_EVENTS_TOOL, GET_EVENT_BY_ID_TOOL];

    case 'workout-analysis':
      // For analyzing specific workouts, we need detailed activity data
      return [GET_ACTIVITIES_TOOL, GET_ACTIVITY_DETAILS_TOOL, GET_ACTIVITY_INTERVALS_TOOL];
    default:
      return INTERVALS_TOOLS;
  }
}
