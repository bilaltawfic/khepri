import type { WorkoutStructure } from '../types/workout.js';
import { workoutStructureToDSL } from '../utils/dsl-serializer.js';

describe('workoutStructureToDSL', () => {
  it('serializes a bike workout with POWER targets', () => {
    const structure: WorkoutStructure = {
      totalDurationMinutes: 68,
      sections: [
        {
          name: 'Warmup',
          durationMinutes: 10,
          steps: [{ description: 'Ramp warm-up', durationMinutes: 10, target: 'ramp 50-75%' }],
        },
        {
          name: 'Main Set',
          durationMinutes: 48,
          steps: [
            { description: 'Threshold effort', durationMinutes: 8, target: '95-105%', repeat: 4 },
            { description: 'Recovery spin', durationMinutes: 4, target: '55%' },
          ],
        },
        {
          name: 'Cooldown',
          durationMinutes: 10,
          steps: [{ description: 'Easy spin', durationMinutes: 10, target: '50%' }],
        },
      ],
    };

    const dsl = workoutStructureToDSL(structure, 'POWER');

    expect(dsl).toBe(
      'Warmup\n- 10m ramp 50-75%\n\nMain Set 4x\n- 8m 95-105%\n- 4m 55%\n\nCooldown\n- 10m 50%'
    );
  });

  it('serializes a run workout with PACE targets', () => {
    const structure: WorkoutStructure = {
      totalDurationMinutes: 40,
      sections: [
        {
          name: 'Warmup',
          durationMinutes: 10,
          steps: [{ description: 'Easy jog', durationMinutes: 10, target: '65% Pace' }],
        },
        {
          name: 'Main Set',
          durationMinutes: 20,
          steps: [
            {
              description: 'Fast intervals',
              durationMeters: 400,
              target: '90-95% Pace',
              repeat: 4,
            },
            { description: 'Recovery jog', durationMeters: 200, target: 'freeride' },
          ],
        },
        {
          name: 'Cooldown',
          durationMinutes: 10,
          steps: [{ description: 'Cool jog', durationMinutes: 10, target: '55% Pace' }],
        },
      ],
    };

    const dsl = workoutStructureToDSL(structure, 'PACE');

    expect(dsl).toBe(
      'Warmup\n- 10m 65% Pace\n\nMain Set 4x\n- 400mtr 90-95% Pace\n- 200mtr freeride\n\nCooldown\n- 10m 55% Pace'
    );
  });

  it('serializes a swim workout with PACE targets', () => {
    const structure: WorkoutStructure = {
      totalDurationMinutes: 45,
      sections: [
        {
          name: 'Warmup',
          durationMinutes: 10,
          steps: [{ description: 'Easy swim', durationMeters: 300, target: '60% Pace' }],
        },
        {
          name: 'Main Set',
          durationMinutes: 25,
          steps: [
            { description: 'Fast 100s', durationMeters: 100, target: '85-90% Pace', repeat: 6 },
            { description: 'Rest', durationMinutes: 0.5, target: 'rest' },
          ],
        },
        {
          name: 'Cooldown',
          durationMinutes: 10,
          steps: [{ description: 'Easy swim', durationMeters: 200, target: '55% Pace' }],
        },
      ],
    };

    const dsl = workoutStructureToDSL(structure, 'PACE');

    expect(dsl).toBe(
      'Warmup\n- 300mtr 60% Pace\n\nMain Set 6x\n- 100mtr 85-90% Pace\n- 30s rest\n\nCooldown\n- 200mtr 55% Pace'
    );
  });

  it('uses km for distances that are multiples of 1000m', () => {
    const structure: WorkoutStructure = {
      totalDurationMinutes: 60,
      sections: [
        {
          name: 'Main Set',
          durationMinutes: 60,
          steps: [{ description: 'Steady', durationMeters: 2000, target: '70% Pace' }],
        },
      ],
    };

    const dsl = workoutStructureToDSL(structure, 'PACE');
    expect(dsl).toContain('2km');
  });

  it('omits empty sections (sections with no serializable steps)', () => {
    const structure: WorkoutStructure = {
      totalDurationMinutes: 10,
      sections: [
        {
          name: 'Empty Section',
          durationMinutes: 0,
          steps: [{ description: '' }],
        },
        {
          name: 'Main Set',
          durationMinutes: 10,
          steps: [{ description: 'Work', durationMinutes: 10, target: '80%' }],
        },
      ],
    };

    const dsl = workoutStructureToDSL(structure, 'POWER');
    expect(dsl).not.toContain('Empty Section');
    expect(dsl).toBe('Main Set\n- 10m 80%');
  });

  it('falls back to zone with target-type suffix when no explicit target', () => {
    const structure: WorkoutStructure = {
      totalDurationMinutes: 10,
      sections: [
        {
          name: 'Test',
          durationMinutes: 10,
          steps: [{ description: 'Zone 2', durationMinutes: 10, zone: 'Z2' }],
        },
      ],
    };

    expect(workoutStructureToDSL(structure, 'PACE')).toBe('Test\n- 10m Z2 Pace');
    expect(workoutStructureToDSL(structure, 'HR')).toBe('Test\n- 10m Z2 HR');
    expect(workoutStructureToDSL(structure, 'POWER')).toBe('Test\n- 10m Z2');
  });

  it('handles repeat = 1 as no repeat', () => {
    const structure: WorkoutStructure = {
      totalDurationMinutes: 10,
      sections: [
        {
          name: 'Main Set',
          durationMinutes: 10,
          steps: [{ description: 'Work', durationMinutes: 10, target: '80%', repeat: 1 }],
        },
      ],
    };

    const dsl = workoutStructureToDSL(structure, 'POWER');
    expect(dsl).toBe('Main Set\n- 10m 80%');
    expect(dsl).not.toContain('x');
  });

  it('serializes minutes and seconds correctly', () => {
    const structure: WorkoutStructure = {
      totalDurationMinutes: 5,
      sections: [
        {
          name: 'Test',
          durationMinutes: 5,
          steps: [
            { description: 'Short', durationMinutes: 1.5, target: '80%' },
            { description: 'Very short', durationMinutes: 0.75, target: '90%' },
          ],
        },
      ],
    };

    const dsl = workoutStructureToDSL(structure, 'POWER');
    expect(dsl).toContain('1m30s 80%');
    expect(dsl).toContain('45s 90%');
  });

  it('uses hour format for durations >= 60 minutes', () => {
    const structure: WorkoutStructure = {
      totalDurationMinutes: 120,
      sections: [
        {
          name: 'Main Set',
          durationMinutes: 120,
          steps: [
            { description: 'Long ride', durationMinutes: 120, target: '55-70%' },
            { description: 'Medium ride', durationMinutes: 90, target: '60%' },
          ],
        },
      ],
    };

    const dsl = workoutStructureToDSL(structure, 'POWER');
    expect(dsl).toContain('2h 55-70%');
    expect(dsl).toContain('1h30m 60%');
  });
});
