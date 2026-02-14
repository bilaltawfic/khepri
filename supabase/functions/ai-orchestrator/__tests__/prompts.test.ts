import {
  TOOL_DEFINITIONS,
  buildSystemPrompt,
  formatConstraint,
  formatPace,
  formatRaceTime,
  formatSwimPace,
} from '../prompts.ts';
import type { AthleteContext, Constraint } from '../types.ts';

// =============================================================================
// TOOL_DEFINITIONS
// =============================================================================

describe('TOOL_DEFINITIONS', () => {
  it('includes create_event tool', () => {
    const tool = TOOL_DEFINITIONS.find((t) => t.name === 'create_event');
    if (!tool) throw new Error('create_event tool not found');
    expect(tool.input_schema.required).toEqual(['name', 'type', 'start_date']);
    expect(tool.input_schema.properties).toHaveProperty('planned_duration');
    expect(tool.input_schema.properties).toHaveProperty('planned_tss');
  });

  it('includes update_event tool', () => {
    const tool = TOOL_DEFINITIONS.find((t) => t.name === 'update_event');
    if (!tool) throw new Error('update_event tool not found');
    expect(tool.input_schema.required).toEqual(['event_id']);
    expect(tool.input_schema.properties).toHaveProperty('event_id');
  });

  it('has 6 total tools', () => {
    expect(TOOL_DEFINITIONS).toHaveLength(6);
  });

  it('create_event uses CalendarEvent field names', () => {
    const tool = TOOL_DEFINITIONS.find((t) => t.name === 'create_event');
    if (!tool) throw new Error('create_event tool not found');
    const propNames = Object.keys(tool.input_schema.properties);
    // CalendarEvent names (not Intervals.icu API names)
    expect(propNames).toContain('start_date');
    expect(propNames).toContain('planned_duration');
    expect(propNames).toContain('planned_tss');
    expect(propNames).toContain('priority');
    // Should NOT have API-style names
    expect(propNames).not.toContain('start_date_local');
    expect(propNames).not.toContain('moving_time');
    expect(propNames).not.toContain('icu_training_load');
    expect(propNames).not.toContain('event_priority');
  });

  it('update_event uses CalendarEvent field names', () => {
    const tool = TOOL_DEFINITIONS.find((t) => t.name === 'update_event');
    if (!tool) throw new Error('update_event tool not found');
    const propNames = Object.keys(tool.input_schema.properties);
    expect(propNames).toContain('start_date');
    expect(propNames).not.toContain('start_date_local');
  });

  it('create_event type enum uses lowercase values', () => {
    const tool = TOOL_DEFINITIONS.find((t) => t.name === 'create_event');
    if (!tool) throw new Error('create_event tool not found');
    const typeProp = tool.input_schema.properties.type as { enum: string[] };
    expect(typeProp.enum).toEqual(['workout', 'race', 'note', 'rest_day', 'travel']);
  });

  it('all tools have name, description, and input_schema', () => {
    for (const tool of TOOL_DEFINITIONS) {
      expect(tool.name).toBeTruthy();
      expect(tool.description).toBeTruthy();
      expect(tool.input_schema).toBeDefined();
      expect(tool.input_schema.type).toBe('object');
    }
  });
});

// =============================================================================
// formatConstraint
// =============================================================================

describe('formatConstraint', () => {
  it('renders a non-injury constraint with type and description', () => {
    const constraint: Constraint = {
      id: 'c1',
      type: 'travel',
      description: 'Business trip to London',
      start_date: '2026-03-01',
      end_date: '2026-03-07',
    };

    const result = formatConstraint(constraint);
    expect(result).toBe('- [travel] Business trip to London (2026-03-01 to 2026-03-07)');
  });

  it('renders a constraint without dates', () => {
    const constraint: Constraint = {
      id: 'c2',
      type: 'availability',
      description: 'Limited to 5 hours/week',
    };

    const result = formatConstraint(constraint);
    expect(result).toBe('- [availability] Limited to 5 hours/week');
  });

  it('renders an injury constraint with body part, severity, and restrictions', () => {
    const constraint: Constraint = {
      id: 'c3',
      type: 'injury',
      description: 'Left knee pain',
      start_date: '2026-01-15',
      injury_body_part: 'left_knee',
      injury_severity: 'severe',
      injury_restrictions: ['run', 'high_intensity', 'impact'],
    };

    const result = formatConstraint(constraint);
    expect(result).toContain('- [injury] Left knee pain (2026-01-15 to ongoing)');
    expect(result).toContain('Body part: left_knee | Severity: severe');
    expect(result).toContain('Restrictions: no run, no high_intensity, no impact');
  });

  it('renders an injury constraint with empty restrictions array', () => {
    const constraint: Constraint = {
      id: 'c4',
      type: 'injury',
      description: 'Minor shoulder stiffness',
      injury_severity: 'mild',
      injury_body_part: 'right_shoulder',
      injury_restrictions: [],
    };

    const result = formatConstraint(constraint);
    expect(result).toContain('Body part: right_shoulder | Severity: mild');
    expect(result).toContain('Restrictions: no specific restrictions listed');
  });

  it('renders an injury constraint without body part as unspecified', () => {
    const constraint: Constraint = {
      id: 'c5',
      type: 'injury',
      description: 'General soreness',
      injury_severity: 'moderate',
    };

    const result = formatConstraint(constraint);
    expect(result).toContain('Body part: unspecified | Severity: moderate');
  });

  it('renders injury type without severity as a simple constraint', () => {
    const constraint: Constraint = {
      id: 'c6',
      type: 'injury',
      description: 'Old ankle sprain',
      start_date: '2025-12-01',
      end_date: '2026-01-01',
    };

    const result = formatConstraint(constraint);
    expect(result).toBe('- [injury] Old ankle sprain (2025-12-01 to 2026-01-01)');
    expect(result).not.toContain('Body part');
    expect(result).not.toContain('Severity');
  });
});

// =============================================================================
// buildSystemPrompt
// =============================================================================

describe('buildSystemPrompt', () => {
  it('returns base prompt when no context is provided', () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toContain('You are Khepri');
    expect(prompt).toContain('get_activities');
    expect(prompt).not.toContain('Athlete Context');
  });

  it('returns base prompt when context is undefined', () => {
    const prompt = buildSystemPrompt(undefined);
    expect(prompt).toContain('You are Khepri');
  });

  it('always includes injury safety rules section', () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toContain('## Injury Safety Rules');
    expect(prompt).toContain('SEVERE injuries');
    expect(prompt).toContain('MODERATE injuries');
    expect(prompt).toContain('MILD injuries');
    expect(prompt).toContain('pushing through');
    expect(prompt).toContain('physiotherapist');
  });

  it('always includes injury-aware recommendation guidance', () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toContain('## Injury-Aware Recommendations');
    expect(prompt).toContain('review the athlete');
  });

  it('includes athlete context when provided', () => {
    const context: AthleteContext = {
      athlete_id: 'a1',
      display_name: 'Test Athlete',
      ftp_watts: 250,
      weight_kg: 70,
    };

    const prompt = buildSystemPrompt(context);
    expect(prompt).toContain('## Athlete Context');
    expect(prompt).toContain('Athlete: Test Athlete');
    expect(prompt).toContain('FTP: 250W');
    expect(prompt).toContain('Weight: 70kg');
    expect(prompt).toContain('W/kg: 3.57');
  });

  it('renders injury constraint with structured detail', () => {
    const context: AthleteContext = {
      athlete_id: 'a1',
      active_constraints: [
        {
          id: 'c1',
          type: 'injury',
          description: 'Left knee pain',
          start_date: '2026-01-15',
          injury_body_part: 'left_knee',
          injury_severity: 'severe',
          injury_restrictions: ['run', 'high_intensity', 'impact'],
        },
      ],
    };

    const prompt = buildSystemPrompt(context);
    expect(prompt).toContain('### Active Constraints (MUST RESPECT)');
    expect(prompt).toContain('[injury] Left knee pain');
    expect(prompt).toContain('Body part: left_knee | Severity: severe');
    expect(prompt).toContain('no run, no high_intensity, no impact');
  });

  it('renders multiple constraints including injury and non-injury', () => {
    const context: AthleteContext = {
      athlete_id: 'a1',
      active_constraints: [
        {
          id: 'c1',
          type: 'injury',
          description: 'Left knee pain',
          injury_severity: 'severe',
          injury_body_part: 'left_knee',
          injury_restrictions: ['run'],
        },
        {
          id: 'c2',
          type: 'travel',
          description: 'Business trip',
          start_date: '2026-03-01',
          end_date: '2026-03-07',
        },
      ],
    };

    const prompt = buildSystemPrompt(context);
    expect(prompt).toContain('[injury] Left knee pain');
    expect(prompt).toContain('Severity: severe');
    expect(prompt).toContain('[travel] Business trip');
    expect(prompt).toContain('2026-03-01 to 2026-03-07');
  });

  it('renders constraint without injury fields as simple constraint', () => {
    const context: AthleteContext = {
      athlete_id: 'a1',
      active_constraints: [
        {
          id: 'c1',
          type: 'availability',
          description: 'Only mornings available',
        },
      ],
    };

    const prompt = buildSystemPrompt(context);
    expect(prompt).toContain('[availability] Only mornings available');
    expect(prompt).not.toContain('Body part');
    expect(prompt).not.toContain('Severity');
  });

  it('does not include constraint section when no constraints provided', () => {
    const context: AthleteContext = {
      athlete_id: 'a1',
      display_name: 'Test',
    };

    const prompt = buildSystemPrompt(context);
    expect(prompt).not.toContain('Active Constraints');
  });

  it('renders goals section correctly', () => {
    const context: AthleteContext = {
      athlete_id: 'a1',
      active_goals: [
        { id: 'g1', title: 'Complete Ironman', target_date: '2026-09-01', priority: 'A' },
      ],
    };

    const prompt = buildSystemPrompt(context);
    expect(prompt).toContain('### Active Goals');
    expect(prompt).toContain('Complete Ironman (Priority A) - Target: 2026-09-01');
  });

  it('renders checkin section correctly', () => {
    const context: AthleteContext = {
      athlete_id: 'a1',
      recent_checkin: {
        date: '2026-02-13',
        energy_level: 7,
        sleep_quality: 8,
        stress_level: 3,
        muscle_soreness: 4,
      },
    };

    const prompt = buildSystemPrompt(context);
    expect(prompt).toContain("Today's Check-in");
    expect(prompt).toContain('Energy: 7/10');
    expect(prompt).toContain('Sleep: 8/10');
    expect(prompt).toContain('Stress: 3/10');
    expect(prompt).toContain('Soreness: 4/10');
  });

  it('renders fitness thresholds when provided', () => {
    const context: AthleteContext = {
      athlete_id: 'a1',
      running_threshold_pace_sec_per_km: 300,
      css_sec_per_100m: 105,
      max_heart_rate: 185,
      lthr: 170,
    };

    const prompt = buildSystemPrompt(context);
    expect(prompt).toContain('### Fitness Thresholds');
    expect(prompt).toContain('Running Threshold Pace: 5:00/km');
    expect(prompt).toContain('CSS: 1:45/100m');
    expect(prompt).toContain('Max HR: 185 bpm');
    expect(prompt).toContain('LTHR: 170 bpm');
  });

  it('omits fitness thresholds section when no threshold fields provided', () => {
    const context: AthleteContext = {
      athlete_id: 'a1',
      display_name: 'Swimmer Only',
    };

    const prompt = buildSystemPrompt(context);
    expect(prompt).not.toContain('Fitness Thresholds');
  });

  it('renders race goal details when goal_type is race', () => {
    const context: AthleteContext = {
      athlete_id: 'a1',
      active_goals: [
        {
          id: 'g1',
          title: 'Complete Ironman',
          goal_type: 'race',
          target_date: '2026-09-01',
          priority: 'A',
          race_event_name: 'Ironman Barcelona',
          race_distance: '140.6mi',
          race_target_time_seconds: 43200,
        },
      ],
    };

    const prompt = buildSystemPrompt(context);
    expect(prompt).toContain('Complete Ironman (Priority A)');
    expect(prompt).toContain('Event: Ironman Barcelona');
    expect(prompt).toContain('Distance: 140.6mi');
    expect(prompt).toContain('Target: 12:00:00');
  });

  it('does not render race details for non-race goals', () => {
    const context: AthleteContext = {
      athlete_id: 'a1',
      active_goals: [
        {
          id: 'g1',
          title: 'Improve FTP',
          goal_type: 'fitness',
          priority: 'B',
        },
      ],
    };

    const prompt = buildSystemPrompt(context);
    expect(prompt).toContain('Improve FTP (Priority B)');
    expect(prompt).not.toContain('Event:');
    expect(prompt).not.toContain('Distance:');
  });

  it('system prompt mentions calendar write capabilities', () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toContain('create_event');
    expect(prompt).toContain('update_event');
    expect(prompt).toContain('read and write');
  });

  it('system prompt includes calendar write safety guidelines', () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toContain('Calendar Write Safety');
    expect(prompt).toContain('Always confirm with the athlete');
    expect(prompt).toContain('Check existing events');
  });

  it('renders checkin with HR metrics', () => {
    const context: AthleteContext = {
      athlete_id: 'a1',
      recent_checkin: {
        date: '2026-02-14',
        energy_level: 6,
        resting_hr: 52,
        hrv_ms: 65,
      },
    };

    const prompt = buildSystemPrompt(context);
    expect(prompt).toContain('Energy: 6/10');
    expect(prompt).toContain('Resting HR: 52 bpm');
    expect(prompt).toContain('HRV: 65 ms');
  });
});

// =============================================================================
// formatPace
// =============================================================================

describe('formatPace', () => {
  it('formats 300 sec/km as 5:00/km', () => {
    expect(formatPace(300)).toBe('5:00/km');
  });

  it('formats 270 sec/km as 4:30/km', () => {
    expect(formatPace(270)).toBe('4:30/km');
  });

  it('formats 325 sec/km as 5:25/km', () => {
    expect(formatPace(325)).toBe('5:25/km');
  });

  it('pads single-digit seconds with leading zero', () => {
    expect(formatPace(305)).toBe('5:05/km');
  });

  it('handles fractional seconds that would round to 60', () => {
    expect(formatPace(299.6)).toBe('5:00/km');
  });
});

// =============================================================================
// formatSwimPace
// =============================================================================

describe('formatSwimPace', () => {
  it('formats 105 sec/100m as 1:45/100m', () => {
    expect(formatSwimPace(105)).toBe('1:45/100m');
  });

  it('formats 90 sec/100m as 1:30/100m', () => {
    expect(formatSwimPace(90)).toBe('1:30/100m');
  });

  it('pads single-digit seconds with leading zero', () => {
    expect(formatSwimPace(63)).toBe('1:03/100m');
  });

  it('handles fractional seconds that would round to 60', () => {
    expect(formatSwimPace(119.6)).toBe('2:00/100m');
  });
});

// =============================================================================
// formatRaceTime
// =============================================================================

describe('formatRaceTime', () => {
  it('formats 43200 seconds as 12:00:00', () => {
    expect(formatRaceTime(43200)).toBe('12:00:00');
  });

  it('formats 3661 seconds as 1:01:01', () => {
    expect(formatRaceTime(3661)).toBe('1:01:01');
  });

  it('formats sub-hour as minutes:seconds', () => {
    expect(formatRaceTime(1830)).toBe('30:30');
  });

  it('pads minutes and seconds in hour format', () => {
    expect(formatRaceTime(3605)).toBe('1:00:05');
  });

  it('handles fractional seconds that would round to 60', () => {
    expect(formatRaceTime(3659.6)).toBe('1:01:00');
  });
});
