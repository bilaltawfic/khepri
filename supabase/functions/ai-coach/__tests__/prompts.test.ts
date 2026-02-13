import type { AthleteContext } from '../prompts.ts';
import { buildSystemPrompt, formatCoachConstraint } from '../prompts.ts';

// =============================================================================
// formatCoachConstraint
// =============================================================================

describe('formatCoachConstraint', () => {
  it('renders a non-injury constraint with title and type', () => {
    const result = formatCoachConstraint({
      title: 'Business trip to London',
      constraintType: 'travel',
    });
    expect(result).toBe('- Business trip to London (travel)');
  });

  it('renders an injury constraint with severity and body part', () => {
    const result = formatCoachConstraint({
      title: 'Left knee pain',
      constraintType: 'injury',
      injurySeverity: 'severe',
      injuryBodyPart: 'left_knee',
      injuryRestrictions: ['run', 'high_intensity', 'impact'],
    });

    expect(result).toContain('INJURY (severe): Left knee pain — affects left_knee');
    expect(result).toContain('Restrictions: no run, no high_intensity, no impact');
  });

  it('renders an injury constraint without body part', () => {
    const result = formatCoachConstraint({
      title: 'General soreness',
      constraintType: 'injury',
      injurySeverity: 'moderate',
    });

    expect(result).toBe('- INJURY (moderate): General soreness');
    expect(result).not.toContain('affects');
  });

  it('renders an injury constraint with body part but no restrictions', () => {
    const result = formatCoachConstraint({
      title: 'Tight hamstring',
      constraintType: 'injury',
      injurySeverity: 'mild',
      injuryBodyPart: 'right_hamstring',
    });

    expect(result).toBe('- INJURY (mild): Tight hamstring — affects right_hamstring');
    expect(result).not.toContain('Restrictions');
  });

  it('renders injury type without severity as simple constraint', () => {
    const result = formatCoachConstraint({
      title: 'Old ankle sprain',
      constraintType: 'injury',
    });

    expect(result).toBe('- Old ankle sprain (injury)');
    expect(result).not.toContain('INJURY');
  });

  it('truncates long titles to 100 characters', () => {
    const longTitle = 'A'.repeat(150);
    const result = formatCoachConstraint({
      title: longTitle,
      constraintType: 'availability',
    });

    expect(result).toContain('A'.repeat(100));
    expect(result).not.toContain('A'.repeat(101));
  });
});

// =============================================================================
// buildSystemPrompt
// =============================================================================

describe('buildSystemPrompt', () => {
  it('returns base prompt when no context is provided', () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toContain('You are Khepri');
    expect(prompt).toContain('endurance sports coach');
    expect(prompt).not.toContain('Current Athlete Context');
  });

  it('includes injury-specific safety guidelines', () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toContain('## Safety Guidelines');
    expect(prompt).toContain(
      'When injury constraints are active, always recommend activities that avoid the injured area'
    );
    expect(prompt).toContain('For severe injuries, only suggest complete rest or activities');
    expect(prompt).toContain('swim instead of run for knee injuries');
  });

  it('renders injury constraint with severity and body part in context', () => {
    const context: AthleteContext = {
      constraints: [
        {
          title: 'Left knee pain',
          constraintType: 'injury',
          injurySeverity: 'severe',
          injuryBodyPart: 'left_knee',
          injuryRestrictions: ['run', 'high_intensity', 'impact'],
        },
      ],
    };

    const prompt = buildSystemPrompt(context);
    expect(prompt).toContain('Active constraints:');
    expect(prompt).toContain('INJURY (severe): Left knee pain — affects left_knee');
    expect(prompt).toContain('no run, no high_intensity, no impact');
  });

  it('renders constraint description inline for non-injury constraints', () => {
    const context: AthleteContext = {
      constraints: [
        {
          title: 'Business trip to London',
          constraintType: 'travel',
          description: 'No gym access',
        },
      ],
    };

    const prompt = buildSystemPrompt(context);
    expect(prompt).toContain('- Business trip to London (travel)');
  });

  it('renders non-injury constraint unchanged (no regression)', () => {
    const context: AthleteContext = {
      constraints: [
        {
          title: 'Work deadlines',
          constraintType: 'availability',
        },
      ],
    };

    const prompt = buildSystemPrompt(context);
    expect(prompt).toContain('- Work deadlines (availability)');
    expect(prompt).not.toContain('INJURY');
    expect(prompt).not.toContain('Severity');
  });

  it('renders mixed injury and non-injury constraints', () => {
    const context: AthleteContext = {
      constraints: [
        {
          title: 'Knee pain',
          constraintType: 'injury',
          injurySeverity: 'moderate',
          injuryBodyPart: 'right_knee',
          injuryRestrictions: ['run'],
        },
        {
          title: 'Work trip',
          constraintType: 'travel',
        },
      ],
    };

    const prompt = buildSystemPrompt(context);
    expect(prompt).toContain('INJURY (moderate): Knee pain — affects right_knee');
    expect(prompt).toContain('- Work trip (travel)');
  });

  it('includes full context with constraints, goals, and check-in', () => {
    const context: AthleteContext = {
      name: 'Alice',
      ctl: 65,
      atl: 80,
      tsb: -15,
      constraints: [
        {
          title: 'Ankle strain',
          constraintType: 'injury',
          injurySeverity: 'mild',
          injuryBodyPart: 'left_ankle',
        },
      ],
      goals: [{ title: 'Complete marathon', goalType: 'race', priority: 'A' }],
      recentCheckin: {
        energyLevel: 6,
        sleepQuality: 7,
      },
    };

    const prompt = buildSystemPrompt(context);
    expect(prompt).toContain('Athlete: Alice');
    expect(prompt).toContain('CTL: 65');
    expect(prompt).toContain('INJURY (mild): Ankle strain — affects left_ankle');
    expect(prompt).toContain('Complete marathon');
    expect(prompt).toContain('Energy: 6/10');
  });
});
