import type { PromptRequest } from '../prompts.ts';
import { buildSystemPrompt, buildUserPrompt } from '../prompts.ts';

const BASE_PROMPT_REQUEST: PromptRequest = {
  block_id: 'block-abc',
  start_date: '2026-01-05',
  end_date: '2026-03-01',
  phases: [
    { name: 'Base 1', weeks: 4, focus: 'base building', weeklyHours: 8 },
    { name: 'Build 1', weeks: 4, focus: 'build threshold', weeklyHours: 10 },
  ],
  preferences: {
    weeklyHoursMin: 6,
    weeklyHoursMax: 12,
    availableDays: [1, 2, 3, 4, 5],
    sportPriority: ['run', 'bike', 'swim'],
  },
  unavailable_dates: [],
  sport_requirements: [
    { sport: 'swim', minWeeklySessions: 2 },
    { sport: 'bike', minWeeklySessions: 2 },
    { sport: 'run', minWeeklySessions: 3 },
  ],
  day_preferences: [
    { dayOfWeek: 5, sport: 'bike', workoutLabel: 'Long Ride' },
    { dayOfWeek: 0, sport: 'run' },
  ],
};

describe('buildSystemPrompt', () => {
  it('returns a non-empty string mentioning the tool name', () => {
    const prompt = buildSystemPrompt();
    expect(prompt.length).toBeGreaterThan(0);
    expect(prompt).toContain('generate_block_workouts');
  });

  it('contains key rules about sport_requirements and day_preferences', () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toContain('min_sessions_per_sport');
    expect(prompt).toContain('day_preferences');
    expect(prompt).toContain('3:1 load/recovery');
  });
});

describe('buildUserPrompt', () => {
  it('includes block_id and date range', () => {
    const prompt = buildUserPrompt(BASE_PROMPT_REQUEST);
    expect(prompt).toContain('block-abc');
    expect(prompt).toContain('2026-01-05');
    expect(prompt).toContain('2026-03-01');
  });

  it('includes phase details', () => {
    const prompt = buildUserPrompt(BASE_PROMPT_REQUEST);
    expect(prompt).toContain('Base 1');
    expect(prompt).toContain('Build 1');
    expect(prompt).toContain('8h/wk');
    expect(prompt).toContain('10h/wk');
  });

  it('includes sport requirements', () => {
    const prompt = buildUserPrompt(BASE_PROMPT_REQUEST);
    expect(prompt).toContain('swim: 2');
    expect(prompt).toContain('run: 3');
  });

  it('includes day preferences with day names', () => {
    const prompt = buildUserPrompt(BASE_PROMPT_REQUEST);
    expect(prompt).toContain('Sat: bike Long Ride');
    expect(prompt).toContain('Mon: run');
  });

  it('shows (none) when sport_requirements and day_preferences are empty', () => {
    const request: PromptRequest = {
      ...BASE_PROMPT_REQUEST,
      sport_requirements: [],
      day_preferences: [],
    };
    const prompt = buildUserPrompt(request);
    expect(prompt).toContain('Sport requirements (min sessions/week):\n- (none)');
    expect(prompt).toContain('Day preferences:\n- (none)');
  });

  it('shows (none) when sport_requirements and day_preferences are null', () => {
    const request: PromptRequest = {
      ...BASE_PROMPT_REQUEST,
      sport_requirements: null,
      day_preferences: null,
    };
    const prompt = buildUserPrompt(request);
    expect(prompt).toContain('- (none)');
  });

  it('includes unavailable dates in both string and object form', () => {
    const request: PromptRequest = {
      ...BASE_PROMPT_REQUEST,
      unavailable_dates: ['2026-01-15', { date: '2026-02-01', reason: 'travel' }],
    };
    const prompt = buildUserPrompt(request);
    expect(prompt).toContain('2026-01-15');
    expect(prompt).toContain('2026-02-01 travel');
  });

  it('includes athlete preferences', () => {
    const prompt = buildUserPrompt(BASE_PROMPT_REQUEST);
    expect(prompt).toContain('Weekly hours: 6-12');
    expect(prompt).toContain('1, 2, 3, 4, 5');
    expect(prompt).toContain('run, bike, swim');
  });

  it('calculates total weeks from phases', () => {
    const prompt = buildUserPrompt(BASE_PROMPT_REQUEST);
    expect(prompt).toContain('(8 weeks)');
  });
});
