import {
  WORKOUT_GENERATION_SYSTEM_PROMPT,
  buildWorkoutGenerationPrompt,
  validateGenerationOutput,
} from '../prompts/workout-generation.js';
import type {
  WorkoutGenerationInput,
  WorkoutGenerationOutput,
} from '../prompts/workout-generation.js';
import type { CoachingContext } from '../types.js';

const mockContext: CoachingContext = {
  athlete: {
    id: 'test-athlete',
    preferredUnits: 'metric',
    timezone: 'UTC',
    intervalsIcuConnected: false,
    ftpWatts: 250,
    runningThresholdPaceSecPerKm: 270,
    cssSecPer100m: 100,
    maxHeartRate: 185,
    lthr: 165,
  },
  goals: [],
  constraints: [],
  recentActivities: [],
  wellnessHistory: [],
};

const bikeInput: WorkoutGenerationInput = {
  sport: 'bike',
  durationMinutes: 60,
  phase: 'build',
  focus: 'threshold_work',
};

const validBikeOutput: WorkoutGenerationOutput = {
  name: 'Bike - Threshold Intervals',
  sport: 'bike',
  workout_type: 'threshold',
  planned_duration_minutes: 60,
  intervals_target: 'POWER',
  structure: {
    totalDurationMinutes: 60,
    sections: [
      {
        name: 'Warmup',
        durationMinutes: 10,
        steps: [{ description: 'Ramp warm-up', durationMinutes: 10, target: 'ramp 50-75%' }],
      },
      {
        name: 'Main Set',
        durationMinutes: 40,
        steps: [
          { description: 'Threshold', durationMinutes: 8, target: '95-105%', repeat: 4 },
          { description: 'Recovery', durationMinutes: 4, target: '55%' },
        ],
      },
      {
        name: 'Cooldown',
        durationMinutes: 10,
        steps: [{ description: 'Easy spin', durationMinutes: 10, target: '50%' }],
      },
    ],
  },
};

describe('WORKOUT_GENERATION_SYSTEM_PROMPT', () => {
  it('includes DSL syntax reference', () => {
    expect(WORKOUT_GENERATION_SYSTEM_PROMPT).toContain('mtr');
    expect(WORKOUT_GENERATION_SYSTEM_PROMPT).toContain('WorkoutStructure');
    expect(WORKOUT_GENERATION_SYSTEM_PROMPT).toContain('freeride');
  });

  it('warns about m vs mtr ambiguity', () => {
    expect(WORKOUT_GENERATION_SYSTEM_PROMPT).toContain('mtr');
    expect(WORKOUT_GENERATION_SYSTEM_PROMPT).toContain('m` means minutes');
  });
});

describe('buildWorkoutGenerationPrompt', () => {
  it('includes athlete context', () => {
    const prompt = buildWorkoutGenerationPrompt(mockContext, bikeInput);
    expect(prompt).toContain('Athlete Context');
    expect(prompt).toContain(WORKOUT_GENERATION_SYSTEM_PROMPT);
  });

  it('includes workout request parameters', () => {
    const prompt = buildWorkoutGenerationPrompt(mockContext, bikeInput);
    expect(prompt).toContain('Sport: bike');
    expect(prompt).toContain('Duration: 60 minutes');
    expect(prompt).toContain('Training Phase: build');
    expect(prompt).toContain('Focus: threshold_work');
  });

  it('includes optional budget parameters when provided', () => {
    const input: WorkoutGenerationInput = {
      ...bikeInput,
      weeklyHourBudget: 10,
      remainingBudgetMinutes: 180,
    };
    const prompt = buildWorkoutGenerationPrompt(mockContext, input);
    expect(prompt).toContain('Weekly Hour Budget: 10h');
    expect(prompt).toContain('Remaining Budget This Week: 180 minutes');
  });

  it('omits budget parameters when not provided', () => {
    const prompt = buildWorkoutGenerationPrompt(mockContext, bikeInput);
    expect(prompt).not.toContain('Weekly Hour Budget');
    expect(prompt).not.toContain('Remaining Budget');
  });
});

describe('validateGenerationOutput', () => {
  it('accepts valid output', () => {
    const errors = validateGenerationOutput(validBikeOutput, bikeInput);
    expect(errors).toHaveLength(0);
  });

  it('rejects duration outside ±10%', () => {
    const output: WorkoutGenerationOutput = {
      ...validBikeOutput,
      planned_duration_minutes: 80,
    };
    const errors = validateGenerationOutput(output, bikeInput);
    expect(errors.some((e) => e.field === 'planned_duration_minutes')).toBe(true);
  });

  it('rejects sport mismatch', () => {
    const output: WorkoutGenerationOutput = {
      ...validBikeOutput,
      sport: 'run',
    };
    const errors = validateGenerationOutput(output, bikeInput);
    expect(errors.some((e) => e.field === 'sport')).toBe(true);
  });

  it('flags unusual target for sport', () => {
    const output: WorkoutGenerationOutput = {
      ...validBikeOutput,
      intervals_target: 'PACE',
    };
    const errors = validateGenerationOutput(output, bikeInput);
    expect(errors.some((e) => e.field === 'intervals_target')).toBe(true);
  });

  it('accepts HR target for any sport', () => {
    const output: WorkoutGenerationOutput = {
      ...validBikeOutput,
      intervals_target: 'HR',
    };
    const errors = validateGenerationOutput(output, bikeInput);
    expect(errors.some((e) => e.field === 'intervals_target')).toBe(false);
  });

  it('flags empty sections', () => {
    const output: WorkoutGenerationOutput = {
      ...validBikeOutput,
      structure: { ...validBikeOutput.structure, sections: [] },
    };
    const errors = validateGenerationOutput(output, bikeInput);
    expect(errors.some((e) => e.field === 'structure.sections')).toBe(true);
  });

  it('flags steps with no duration or distance', () => {
    const output: WorkoutGenerationOutput = {
      ...validBikeOutput,
      structure: {
        ...validBikeOutput.structure,
        sections: [
          {
            name: 'Test',
            durationMinutes: 10,
            steps: [{ description: 'No duration', target: '80%' }],
          },
        ],
      },
    };
    const errors = validateGenerationOutput(output, bikeInput);
    expect(
      errors.some((e) => e.message.includes('neither durationMinutes nor durationMeters'))
    ).toBe(true);
  });
});
