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
