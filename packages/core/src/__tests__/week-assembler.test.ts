import { BIKE_TEMPLATES } from '../templates/bike/index.js';
import { RUN_TEMPLATES } from '../templates/run/index.js';
import { SWIM_TEMPLATES } from '../templates/swim/index.js';
import { clearTemplates, registerTemplates } from '../templates/workout-templates.js';
import { validateDSL } from '../utils/dsl-validator.js';
import { assembleWeek } from '../utils/week-assembler.js';
import type { DayOfWeek, WeekAssemblyInput } from '../utils/week-assembler.js';

beforeAll(() => {
  clearTemplates();
  registerTemplates([...SWIM_TEMPLATES, ...BIKE_TEMPLATES, ...RUN_TEMPLATES]);
});

const baseInput: WeekAssemblyInput = {
  phase: 'build',
  weekNumber: 3,
  targetHours: 8,
  availableDays: [0, 1, 2, 3, 4, 5, 6] as DayOfWeek[],
  sportPriority: ['bike', 'run', 'swim'],
  dayConstraints: [],
  athleteZones: { ftp: 250, thresholdPaceSecKm: 270, cssSec100m: 100 },
  generationTier: 'template',
};

describe('assembleWeek', () => {
  it('produces sessions with total duration in a reasonable range of target hours', () => {
    const result = assembleWeek(baseInput);
    const targetMinutes = baseInput.targetHours * 60;
    // Session allocation is approximate; verify output is in a reasonable range
    expect(result.totalMinutes).toBeGreaterThan(targetMinutes * 0.5);
    expect(result.totalMinutes).toBeLessThan(targetMinutes * 1.5);
  });

  it('ensures at least 1 rest day per week', () => {
    const result = assembleWeek(baseInput);
    expect(result.restDays.length).toBeGreaterThanOrEqual(1);
  });

  it('respects sport priority (higher priority gets more sessions)', () => {
    const result = assembleWeek(baseInput);
    const bikeSessions = result.sessions.filter((s) => s.sport === 'bike').length;
    const swimSessions = result.sessions.filter((s) => s.sport === 'swim').length;
    // Bike (priority 1) should have at least as many sessions as swim (priority 3)
    expect(bikeSessions).toBeGreaterThanOrEqual(swimSessions);
  });

  it('respects day constraints for sport assignment', () => {
    const input: WeekAssemblyInput = {
      ...baseInput,
      dayConstraints: [{ day: 2 as DayOfWeek, sport: 'swim' }],
    };

    const result = assembleWeek(input);
    const wednesdaySession = result.sessions.find((s) => s.day === 2);
    if (wednesdaySession) {
      expect(wednesdaySession.sport).toBe('swim');
    }
  });

  it('respects maxDurationMinutes constraint', () => {
    const input: WeekAssemblyInput = {
      ...baseInput,
      dayConstraints: [{ day: 0 as DayOfWeek, maxDurationMinutes: 30 }],
    };

    const result = assembleWeek(input);
    const mondaySession = result.sessions.find((s) => s.day === 0);
    if (mondaySession) {
      expect(mondaySession.durationMinutes).toBeLessThanOrEqual(30);
    }
  });

  it('does not schedule hard sessions on consecutive days', () => {
    const result = assembleWeek(baseInput);
    for (let i = 1; i < result.sessions.length; i++) {
      const prev = result.sessions[i - 1];
      const curr = result.sessions[i];
      // If consecutive days (accounting for gaps)
      if (curr.day === prev.day + 1) {
        expect(prev.isHard && curr.isHard).toBe(false);
      }
    }
  });

  it('returns empty sessions for empty sport priority', () => {
    const input: WeekAssemblyInput = {
      ...baseInput,
      sportPriority: [],
    };
    const result = assembleWeek(input);
    expect(result.sessions).toHaveLength(0);
  });

  it('handles recovery phase with easy sessions', () => {
    const input: WeekAssemblyInput = {
      ...baseInput,
      phase: 'recovery',
      targetHours: 4,
    };
    const result = assembleWeek(input);
    for (const session of result.sessions) {
      expect(session.focus).toBe('recovery');
    }
  });

  it('produces valid DSL for all template-tier sessions', () => {
    const result = assembleWeek(baseInput);
    for (const session of result.sessions) {
      if (session.dsl != null) {
        const validation = validateDSL(session.dsl);
        expect(validation.valid).toBe(true);
      }
    }
  });

  it('leaves structure/dsl null for claude tier', () => {
    const input: WeekAssemblyInput = {
      ...baseInput,
      generationTier: 'claude',
    };
    const result = assembleWeek(input);
    for (const session of result.sessions) {
      expect(session.structure).toBeNull();
      expect(session.dsl).toBeNull();
      expect(session.template).toBeNull();
    }
  });

  it('handles fewer available days gracefully', () => {
    const input: WeekAssemblyInput = {
      ...baseInput,
      availableDays: [1, 3, 5] as DayOfWeek[],
    };
    const result = assembleWeek(input);
    expect(result.sessions.length).toBeLessThanOrEqual(3);
    for (const session of result.sessions) {
      expect([1, 3, 5]).toContain(session.day);
    }
  });
});

describe('assembleWeek — minSessionsPerSport', () => {
  it('respects minimum sessions when enough days available', () => {
    // 7 days, guarantee at least 2 swim, 2 bike, 2 run
    const input: WeekAssemblyInput = {
      ...baseInput,
      availableDays: [0, 1, 2, 3, 4, 5, 6] as DayOfWeek[],
      sportPriority: ['bike', 'run', 'swim'],
      minSessionsPerSport: new Map([
        ['swim', 2],
        ['bike', 2],
        ['run', 2],
      ]),
    };
    const result = assembleWeek(input);
    const swimCount = result.sessions.filter((s) => s.sport === 'swim').length;
    const bikeCount = result.sessions.filter((s) => s.sport === 'bike').length;
    const runCount = result.sessions.filter((s) => s.sport === 'run').length;
    expect(swimCount).toBeGreaterThanOrEqual(2);
    expect(bikeCount).toBeGreaterThanOrEqual(2);
    expect(runCount).toBeGreaterThanOrEqual(2);
    expect(result.warnings).toBeUndefined();
  });

  it('allocates minimums first, then distributes remainder by priority', () => {
    // 7 days, guarantee at least 1 swim (low priority), rest by priority
    const input: WeekAssemblyInput = {
      ...baseInput,
      availableDays: [0, 1, 2, 3, 4, 5, 6] as DayOfWeek[],
      sportPriority: ['bike', 'run', 'swim'],
      minSessionsPerSport: new Map([['swim', 1]]),
    };
    const result = assembleWeek(input);
    const swimCount = result.sessions.filter((s) => s.sport === 'swim').length;
    expect(swimCount).toBeGreaterThanOrEqual(1);
    expect(result.warnings).toBeUndefined();
  });

  it('emits a warning and allocates best-effort when days are scarce', () => {
    // Only 3 days available (max 2 sessions with 1 rest), but requesting 3 min sessions
    const input: WeekAssemblyInput = {
      ...baseInput,
      availableDays: [0, 2, 4] as DayOfWeek[],
      targetHours: 3,
      sportPriority: ['bike', 'run', 'swim'],
      minSessionsPerSport: new Map([
        ['swim', 2],
        ['bike', 2],
        ['run', 2],
      ]),
    };
    const result = assembleWeek(input);
    // Should have warnings about unmet minimums
    expect(result.warnings).toBeDefined();
    expect(result.warnings?.length).toBeGreaterThan(0);
    expect(result.warnings?.some((w) => w.includes('sessions for'))).toBe(true);
  });

  it('preserves existing behavior when minSessionsPerSport is undefined', () => {
    const withMin = assembleWeek(baseInput);
    const withoutMin = assembleWeek({ ...baseInput, minSessionsPerSport: undefined });
    // Both should produce valid results and no warnings
    expect(withMin.warnings).toBeUndefined();
    expect(withoutMin.warnings).toBeUndefined();
    expect(withMin.sessions.length).toBe(withoutMin.sessions.length);
  });

  it('preserves existing behavior when minSessionsPerSport is empty map', () => {
    const input: WeekAssemblyInput = {
      ...baseInput,
      minSessionsPerSport: new Map(),
    };
    const result = assembleWeek(input);
    expect(result.warnings).toBeUndefined();
  });

  it('handles fewer available days than total minimum sessions (best-effort)', () => {
    // 2 days available (max 1 session), need 3 minimums total
    const input: WeekAssemblyInput = {
      ...baseInput,
      availableDays: [0, 1] as DayOfWeek[],
      targetHours: 2,
      sportPriority: ['bike', 'run', 'swim'],
      minSessionsPerSport: new Map([
        ['bike', 1],
        ['run', 1],
        ['swim', 1],
      ]),
    };
    const result = assembleWeek(input);
    // Should have at least 1 session and some warnings
    expect(result.sessions.length).toBeGreaterThanOrEqual(1);
    expect(result.warnings).toBeDefined();
  });

  it('combines minSessionsPerSport with sport-pinned day constraints', () => {
    // Day 3 is pinned to swim; min 1 swim should be satisfied by the pinned day
    const input: WeekAssemblyInput = {
      ...baseInput,
      availableDays: [0, 1, 2, 3, 4, 5, 6] as DayOfWeek[],
      dayConstraints: [{ day: 3 as DayOfWeek, sport: 'swim' }],
      sportPriority: ['bike', 'run', 'swim'],
      minSessionsPerSport: new Map([['swim', 1]]),
    };
    const result = assembleWeek(input);
    const wednesdaySession = result.sessions.find((s) => s.day === 3);
    expect(wednesdaySession?.sport).toBe('swim');
    expect(result.warnings).toBeUndefined();
  });
});

describe('assembleWeek — workoutLabel', () => {
  it('maps "Long Ride" label to aerobic_endurance focus', () => {
    const input: WeekAssemblyInput = {
      ...baseInput,
      dayConstraints: [{ day: 0 as DayOfWeek, sport: 'bike', workoutLabel: 'Long Ride' }],
    };
    const result = assembleWeek(input);
    const session = result.sessions.find((s) => s.day === 0);
    expect(session?.focus).toBe('aerobic_endurance');
  });

  it('maps "Tempo Run" label to threshold_work focus', () => {
    const input: WeekAssemblyInput = {
      ...baseInput,
      dayConstraints: [{ day: 0 as DayOfWeek, sport: 'run', workoutLabel: 'Tempo Run' }],
    };
    const result = assembleWeek(input);
    const session = result.sessions.find((s) => s.day === 0);
    expect(session?.focus).toBe('threshold_work');
  });

  it('maps "Threshold" label to threshold_work focus', () => {
    const input: WeekAssemblyInput = {
      ...baseInput,
      dayConstraints: [{ day: 0 as DayOfWeek, sport: 'bike', workoutLabel: 'Threshold' }],
    };
    const result = assembleWeek(input);
    const session = result.sessions.find((s) => s.day === 0);
    expect(session?.focus).toBe('threshold_work');
  });

  it('maps "Recovery" label to recovery focus', () => {
    const input: WeekAssemblyInput = {
      ...baseInput,
      phase: 'build',
      dayConstraints: [{ day: 0 as DayOfWeek, sport: 'run', workoutLabel: 'Recovery' }],
    };
    const result = assembleWeek(input);
    const session = result.sessions.find((s) => s.day === 0);
    expect(session?.focus).toBe('recovery');
  });

  it('maps "Interval" label to vo2max focus', () => {
    const input: WeekAssemblyInput = {
      ...baseInput,
      dayConstraints: [{ day: 0 as DayOfWeek, sport: 'run', workoutLabel: 'Interval' }],
    };
    const result = assembleWeek(input);
    const session = result.sessions.find((s) => s.day === 0);
    expect(session?.focus).toBe('vo2max');
  });

  it('maps "Sprint" label to race_specific focus', () => {
    const input: WeekAssemblyInput = {
      ...baseInput,
      dayConstraints: [{ day: 0 as DayOfWeek, sport: 'bike', workoutLabel: 'Sprint' }],
    };
    const result = assembleWeek(input);
    const session = result.sessions.find((s) => s.day === 0);
    expect(session?.focus).toBe('race_specific');
  });

  it('handles label matching case-insensitively', () => {
    const input: WeekAssemblyInput = {
      ...baseInput,
      dayConstraints: [{ day: 0 as DayOfWeek, sport: 'bike', workoutLabel: 'LONG RIDE' }],
    };
    const result = assembleWeek(input);
    const session = result.sessions.find((s) => s.day === 0);
    expect(session?.focus).toBe('aerobic_endurance');
  });

  it('falls back to default focus selection for unknown label', () => {
    const inputWithLabel: WeekAssemblyInput = {
      ...baseInput,
      phase: 'build',
      dayConstraints: [{ day: 0 as DayOfWeek, sport: 'bike', workoutLabel: 'Unknown Label XYZ' }],
    };
    const inputWithout: WeekAssemblyInput = {
      ...baseInput,
      phase: 'build',
      dayConstraints: [{ day: 0 as DayOfWeek, sport: 'bike' }],
    };
    const withLabel = assembleWeek(inputWithLabel);
    const withoutLabel = assembleWeek(inputWithout);
    const sessionWithLabel = withLabel.sessions.find((s) => s.day === 0);
    const sessionWithout = withoutLabel.sessions.find((s) => s.day === 0);
    // Both should produce same focus since label is unknown
    expect(sessionWithLabel?.focus).toBe(sessionWithout?.focus);
  });

  it('behaves as before when workoutLabel is absent', () => {
    const result = assembleWeek(baseInput);
    // All sessions should have valid TrainingFocus values
    const validFoci = [
      'aerobic_endurance',
      'threshold_work',
      'vo2max',
      'race_specific',
      'recovery',
      'strength',
    ];
    for (const session of result.sessions) {
      expect(validFoci).toContain(session.focus);
    }
  });
});
