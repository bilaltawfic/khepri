import { buildSystemPrompt, formatConstraint } from '../prompts.ts';
import type { AthleteContext, Constraint } from '../types.ts';

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
});
