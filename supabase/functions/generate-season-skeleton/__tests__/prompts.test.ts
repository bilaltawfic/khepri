import { buildSystemPrompt, buildUserPrompt } from '../prompts.ts';
import type { GenerateRequest } from '../prompts.ts';

describe('buildSystemPrompt', () => {
  it('includes the forced tool-use instruction', () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toContain('calling the generate_skeleton tool exactly once');
  });

  it('does not include an embedded JSON example block', () => {
    const prompt = buildSystemPrompt();
    // The old prompt had a JSON example with "totalWeeks": number — ensure it's gone
    expect(prompt).not.toContain('"totalWeeks": number');
  });

  it('includes periodization principles', () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toContain('Periodization principles');
    expect(prompt).toContain('Base phases build aerobic capacity');
  });

  it('includes contiguity and week-sum constraints', () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toContain('date-contiguous');
    expect(prompt).toContain('sum of all phase weeks must equal totalWeeks');
  });
});

describe('buildUserPrompt', () => {
  const baseRequest: GenerateRequest = {
    races: [],
    goals: [],
    preferences: {
      weeklyHoursMin: 6,
      weeklyHoursMax: 12,
      trainingDays: [1, 2, 3, 4, 5],
      sportPriority: ['run', 'bike', 'swim'],
    },
    currentDate: '2026-04-07',
  };

  it('sorts races by date ASC then name ASC', () => {
    const request: GenerateRequest = {
      ...baseRequest,
      races: [
        {
          name: 'Zurich Marathon',
          date: '2026-09-15',
          discipline: 'run',
          distance: 'marathon',
          priority: 'A',
        },
        {
          name: 'Alpine Sprint',
          date: '2026-06-01',
          discipline: 'tri',
          distance: 'sprint',
          priority: 'B',
        },
        {
          name: 'Alps Tri',
          date: '2026-06-01',
          discipline: 'tri',
          distance: 'olympic',
          priority: 'C',
        },
      ],
    };
    const prompt = buildUserPrompt(request);
    const lines = prompt.split('\n');
    const raceLines = lines.filter((l) => l.startsWith('- ') && l.includes('priority'));
    // Alpine Sprint and Alps Tri both on 2026-06-01, sorted alphabetically
    expect(raceLines[0]).toContain('Alpine Sprint');
    expect(raceLines[1]).toContain('Alps Tri');
    expect(raceLines[2]).toContain('Zurich Marathon');
  });

  it('sorts goals by goalType ASC then title ASC', () => {
    const request: GenerateRequest = {
      ...baseRequest,
      goals: [
        { goalType: 'performance', title: 'Sub-3 marathon' },
        { goalType: 'fitness', title: 'Improve VO2max' },
        { goalType: 'fitness', title: 'Build endurance' },
      ],
    };
    const prompt = buildUserPrompt(request);
    const lines = prompt.split('\n');
    const goalLines = lines.filter((l) => l.startsWith('- ['));
    // fitness before performance, then alphabetical within fitness
    expect(goalLines[0]).toContain('[fitness] Build endurance');
    expect(goalLines[1]).toContain('[fitness] Improve VO2max');
    expect(goalLines[2]).toContain('[performance] Sub-3 marathon');
  });

  it('uses fallback text when no races are provided', () => {
    const prompt = buildUserPrompt(baseRequest);
    expect(prompt).toContain('No races scheduled');
  });

  it('uses fallback text when no goals are provided', () => {
    const prompt = buildUserPrompt(baseRequest);
    expect(prompt).toContain('No specific goals set');
  });

  it('includes sport priority order', () => {
    const prompt = buildUserPrompt(baseRequest);
    expect(prompt).toContain('run > bike > swim');
  });
});
