/**
 * Tests for Intervals.icu Tool Definitions
 *
 * These tests verify the tool definitions and the scenario-based
 * tool selection function work correctly.
 */

import { describe, expect, it } from '@jest/globals';
import {
  GET_ACTIVITIES_TOOL,
  GET_ACTIVITY_DETAILS_TOOL,
  GET_ACTIVITY_INTERVALS_TOOL,
  GET_EVENTS_TOOL,
  GET_EVENT_BY_ID_TOOL,
  GET_WELLNESS_DATA_TOOL,
  INTERVALS_TOOLS,
  getIntervalsToolsForScenario,
} from '../tools/intervals-tools.js';

// =============================================================================
// TOOL DEFINITION TESTS
// =============================================================================

describe('GET_ACTIVITIES_TOOL', () => {
  it('has correct name', () => {
    expect(GET_ACTIVITIES_TOOL.name).toBe('get_activities');
  });

  it('has description explaining its purpose', () => {
    expect(GET_ACTIVITIES_TOOL.description).toContain('activities');
    expect(GET_ACTIVITIES_TOOL.description).toContain('Intervals.icu');
  });

  it('requires oldest and newest date parameters', () => {
    const schema = GET_ACTIVITIES_TOOL.input_schema;
    expect(schema.required).toContain('oldest');
    expect(schema.required).toContain('newest');
  });

  it('defines oldest as string type', () => {
    const schema = GET_ACTIVITIES_TOOL.input_schema;
    expect(schema.properties?.oldest).toEqual({
      type: 'string',
      description: expect.stringContaining('YYYY-MM-DD'),
    });
  });

  it('defines newest as string type', () => {
    const schema = GET_ACTIVITIES_TOOL.input_schema;
    expect(schema.properties?.newest).toEqual({
      type: 'string',
      description: expect.stringContaining('YYYY-MM-DD'),
    });
  });
});

describe('GET_ACTIVITY_DETAILS_TOOL', () => {
  it('has correct name', () => {
    expect(GET_ACTIVITY_DETAILS_TOOL.name).toBe('get_activity_details');
  });

  it('has description explaining its purpose', () => {
    expect(GET_ACTIVITY_DETAILS_TOOL.description).toContain('detailed');
    expect(GET_ACTIVITY_DETAILS_TOOL.description).toContain('activity');
  });

  it('requires activity_id parameter', () => {
    const schema = GET_ACTIVITY_DETAILS_TOOL.input_schema;
    expect(schema.required).toContain('activity_id');
  });
});

describe('GET_ACTIVITY_INTERVALS_TOOL', () => {
  it('has correct name', () => {
    expect(GET_ACTIVITY_INTERVALS_TOOL.name).toBe('get_activity_intervals');
  });

  it('has description explaining its purpose', () => {
    expect(GET_ACTIVITY_INTERVALS_TOOL.description).toContain('interval');
    expect(GET_ACTIVITY_INTERVALS_TOOL.description).toContain('lap');
  });

  it('requires activity_id parameter', () => {
    const schema = GET_ACTIVITY_INTERVALS_TOOL.input_schema;
    expect(schema.required).toContain('activity_id');
  });
});

describe('GET_WELLNESS_DATA_TOOL', () => {
  it('has correct name', () => {
    expect(GET_WELLNESS_DATA_TOOL.name).toBe('get_wellness_data');
  });

  it('has description explaining its purpose', () => {
    expect(GET_WELLNESS_DATA_TOOL.description).toContain('wellness');
    expect(GET_WELLNESS_DATA_TOOL.description).toContain('HRV');
    expect(GET_WELLNESS_DATA_TOOL.description).toContain('sleep');
  });

  it('requires oldest and newest date parameters', () => {
    const schema = GET_WELLNESS_DATA_TOOL.input_schema;
    expect(schema.required).toContain('oldest');
    expect(schema.required).toContain('newest');
  });
});

describe('GET_EVENTS_TOOL', () => {
  it('has correct name', () => {
    expect(GET_EVENTS_TOOL.name).toBe('get_events');
  });

  it('has description explaining its purpose', () => {
    expect(GET_EVENTS_TOOL.description).toContain('events');
    expect(GET_EVENTS_TOOL.description).toContain('races');
  });

  it('requires oldest and newest date parameters', () => {
    const schema = GET_EVENTS_TOOL.input_schema;
    expect(schema.required).toContain('oldest');
    expect(schema.required).toContain('newest');
  });
});

describe('GET_EVENT_BY_ID_TOOL', () => {
  it('has correct name', () => {
    expect(GET_EVENT_BY_ID_TOOL.name).toBe('get_event_by_id');
  });

  it('has description explaining its purpose', () => {
    expect(GET_EVENT_BY_ID_TOOL.description).toContain('event');
    expect(GET_EVENT_BY_ID_TOOL.description).toContain('detailed');
  });

  it('requires event_id parameter', () => {
    const schema = GET_EVENT_BY_ID_TOOL.input_schema;
    expect(schema.required).toContain('event_id');
  });
});

// =============================================================================
// INTERVALS_TOOLS COLLECTION TESTS
// =============================================================================

describe('INTERVALS_TOOLS', () => {
  it('contains all 6 tools', () => {
    expect(INTERVALS_TOOLS).toHaveLength(6);
  });

  it('includes GET_ACTIVITIES_TOOL', () => {
    expect(INTERVALS_TOOLS).toContain(GET_ACTIVITIES_TOOL);
  });

  it('includes GET_ACTIVITY_DETAILS_TOOL', () => {
    expect(INTERVALS_TOOLS).toContain(GET_ACTIVITY_DETAILS_TOOL);
  });

  it('includes GET_ACTIVITY_INTERVALS_TOOL', () => {
    expect(INTERVALS_TOOLS).toContain(GET_ACTIVITY_INTERVALS_TOOL);
  });

  it('includes GET_WELLNESS_DATA_TOOL', () => {
    expect(INTERVALS_TOOLS).toContain(GET_WELLNESS_DATA_TOOL);
  });

  it('includes GET_EVENTS_TOOL', () => {
    expect(INTERVALS_TOOLS).toContain(GET_EVENTS_TOOL);
  });

  it('includes GET_EVENT_BY_ID_TOOL', () => {
    expect(INTERVALS_TOOLS).toContain(GET_EVENT_BY_ID_TOOL);
  });

  it('all tools have unique names', () => {
    const names = INTERVALS_TOOLS.map((tool) => tool.name);
    const uniqueNames = new Set(names);
    expect(uniqueNames.size).toBe(names.length);
  });
});

// =============================================================================
// getIntervalsToolsForScenario TESTS
// =============================================================================

describe('getIntervalsToolsForScenario', () => {
  describe('daily-checkin scenario', () => {
    it('returns 3 tools', () => {
      const tools = getIntervalsToolsForScenario('daily-checkin');
      expect(tools).toHaveLength(3);
    });

    it('includes activities tool', () => {
      const tools = getIntervalsToolsForScenario('daily-checkin');
      expect(tools).toContain(GET_ACTIVITIES_TOOL);
    });

    it('includes wellness tool', () => {
      const tools = getIntervalsToolsForScenario('daily-checkin');
      expect(tools).toContain(GET_WELLNESS_DATA_TOOL);
    });

    it('includes events tool', () => {
      const tools = getIntervalsToolsForScenario('daily-checkin');
      expect(tools).toContain(GET_EVENTS_TOOL);
    });

    it('does not include activity details tool', () => {
      const tools = getIntervalsToolsForScenario('daily-checkin');
      expect(tools).not.toContain(GET_ACTIVITY_DETAILS_TOOL);
    });
  });

  describe('plan-review scenario', () => {
    it('returns 4 tools', () => {
      const tools = getIntervalsToolsForScenario('plan-review');
      expect(tools).toHaveLength(4);
    });

    it('includes activities tool', () => {
      const tools = getIntervalsToolsForScenario('plan-review');
      expect(tools).toContain(GET_ACTIVITIES_TOOL);
    });

    it('includes wellness tool', () => {
      const tools = getIntervalsToolsForScenario('plan-review');
      expect(tools).toContain(GET_WELLNESS_DATA_TOOL);
    });

    it('includes events tool', () => {
      const tools = getIntervalsToolsForScenario('plan-review');
      expect(tools).toContain(GET_EVENTS_TOOL);
    });

    it('includes event by id tool', () => {
      const tools = getIntervalsToolsForScenario('plan-review');
      expect(tools).toContain(GET_EVENT_BY_ID_TOOL);
    });
  });

  describe('workout-analysis scenario', () => {
    it('returns 3 tools', () => {
      const tools = getIntervalsToolsForScenario('workout-analysis');
      expect(tools).toHaveLength(3);
    });

    it('includes activities tool', () => {
      const tools = getIntervalsToolsForScenario('workout-analysis');
      expect(tools).toContain(GET_ACTIVITIES_TOOL);
    });

    it('includes activity details tool', () => {
      const tools = getIntervalsToolsForScenario('workout-analysis');
      expect(tools).toContain(GET_ACTIVITY_DETAILS_TOOL);
    });

    it('includes activity intervals tool', () => {
      const tools = getIntervalsToolsForScenario('workout-analysis');
      expect(tools).toContain(GET_ACTIVITY_INTERVALS_TOOL);
    });

    it('does not include wellness tool', () => {
      const tools = getIntervalsToolsForScenario('workout-analysis');
      expect(tools).not.toContain(GET_WELLNESS_DATA_TOOL);
    });
  });

  describe('full scenario', () => {
    it('returns all 6 tools', () => {
      const tools = getIntervalsToolsForScenario('full');
      expect(tools).toHaveLength(6);
    });

    it('returns INTERVALS_TOOLS array', () => {
      const tools = getIntervalsToolsForScenario('full');
      expect(tools).toBe(INTERVALS_TOOLS);
    });
  });
});
