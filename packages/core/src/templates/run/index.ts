/**
 * Run workout templates by phase/focus.
 */

import type { TrainingTemplate } from '../workout-templates.js';

export const RUN_TEMPLATES: readonly TrainingTemplate[] = [
  {
    id: 'run-base-easy',
    name: 'Run - Easy Aerobic',
    sport: 'run',
    phases: ['base'],
    focus: 'aerobic_endurance',
    durationRange: [30, 60],
    intervalsTarget: 'PACE',
    render: (_zones, duration) => ({
      totalDurationMinutes: duration,
      sections: [
        {
          name: 'Warmup',
          durationMinutes: 5,
          steps: [{ description: 'Walk to jog', durationMinutes: 5, target: '55% Pace' }],
        },
        {
          name: 'Main Set',
          durationMinutes: duration - 10,
          steps: [
            {
              description: 'Easy aerobic running',
              durationMinutes: duration - 10,
              target: '60-65% Pace',
            },
          ],
        },
        {
          name: 'Cooldown',
          durationMinutes: 5,
          steps: [{ description: 'Easy jog', durationMinutes: 5, target: '50% Pace' }],
        },
      ],
    }),
  },
  {
    id: 'run-base-long',
    name: 'Run - Long Run',
    sport: 'run',
    phases: ['base', 'build'],
    focus: 'aerobic_endurance',
    durationRange: [60, 150],
    intervalsTarget: 'PACE',
    render: (_zones, duration) => ({
      totalDurationMinutes: duration,
      sections: [
        {
          name: 'Warmup',
          durationMinutes: 10,
          steps: [{ description: 'Easy jog', durationMinutes: 10, target: '55% Pace' }],
        },
        {
          name: 'Main Set',
          durationMinutes: duration - 15,
          steps: [
            {
              description: 'Steady long run',
              durationMinutes: duration - 15,
              target: '60-70% Pace',
            },
          ],
        },
        {
          name: 'Cooldown',
          durationMinutes: 5,
          steps: [{ description: 'Walk cool-down', durationMinutes: 5, target: '45% Pace' }],
        },
      ],
    }),
  },
  {
    id: 'run-base-tempo-intro',
    name: 'Run - Tempo Introduction',
    sport: 'run',
    phases: ['base'],
    focus: 'threshold_work',
    durationRange: [35, 55],
    intervalsTarget: 'PACE',
    render: (_zones, duration) => ({
      totalDurationMinutes: duration,
      sections: [
        {
          name: 'Warmup',
          durationMinutes: 10,
          steps: [{ description: 'Easy jog', durationMinutes: 10, target: '55% Pace' }],
        },
        {
          name: 'Main Set',
          durationMinutes: duration - 20,
          steps: [
            { description: 'Tempo effort', durationMinutes: 8, target: '75-80% Pace', repeat: 2 },
            { description: 'Recovery jog', durationMinutes: 3, target: '55% Pace' },
          ],
        },
        {
          name: 'Cooldown',
          durationMinutes: 10,
          steps: [{ description: 'Easy jog', durationMinutes: 10, target: '50% Pace' }],
        },
      ],
    }),
  },
  {
    id: 'run-build-threshold',
    name: 'Run - Threshold Tempo',
    sport: 'run',
    phases: ['build'],
    focus: 'threshold_work',
    durationRange: [40, 60],
    intervalsTarget: 'PACE',
    render: (_zones, duration) => ({
      totalDurationMinutes: duration,
      sections: [
        {
          name: 'Warmup',
          durationMinutes: 10,
          steps: [
            { description: 'Easy jog with strides', durationMinutes: 10, target: '55% Pace' },
          ],
        },
        {
          name: 'Main Set',
          durationMinutes: duration - 20,
          steps: [
            {
              description: 'Threshold tempo',
              durationMinutes: duration - 20,
              target: '80-85% Pace',
            },
          ],
        },
        {
          name: 'Cooldown',
          durationMinutes: 10,
          steps: [{ description: 'Easy jog', durationMinutes: 10, target: '50% Pace' }],
        },
      ],
    }),
  },
  {
    id: 'run-build-track',
    name: 'Run - Track Intervals',
    sport: 'run',
    phases: ['build'],
    focus: 'vo2max',
    durationRange: [40, 60],
    intervalsTarget: 'PACE',
    render: (_zones, duration) => ({
      totalDurationMinutes: duration,
      sections: [
        {
          name: 'Warmup',
          durationMinutes: 15,
          steps: [{ description: 'Easy jog with drills', durationMinutes: 15, target: '55% Pace' }],
        },
        {
          name: 'Main Set',
          durationMinutes: duration - 25,
          steps: [
            { description: 'Fast 400s', durationMeters: 400, target: '90-95% Pace', repeat: 6 },
            { description: 'Recovery jog', durationMeters: 200, target: 'freeride' },
          ],
        },
        {
          name: 'Cooldown',
          durationMinutes: 10,
          steps: [{ description: 'Easy jog', durationMinutes: 10, target: '50% Pace' }],
        },
      ],
    }),
  },
  {
    id: 'run-build-hills',
    name: 'Run - Hill Repeats',
    sport: 'run',
    phases: ['build'],
    focus: 'strength',
    durationRange: [40, 60],
    intervalsTarget: 'PACE',
    render: (_zones, duration) => ({
      totalDurationMinutes: duration,
      sections: [
        {
          name: 'Warmup',
          durationMinutes: 15,
          steps: [{ description: 'Easy jog', durationMinutes: 15, target: '55% Pace' }],
        },
        {
          name: 'Main Set',
          durationMinutes: duration - 25,
          steps: [
            { description: 'Hill sprint', durationMinutes: 1.5, target: '85-90% Pace', repeat: 6 },
            { description: 'Jog back down', durationMinutes: 2, target: 'freeride' },
          ],
        },
        {
          name: 'Cooldown',
          durationMinutes: 10,
          steps: [{ description: 'Easy jog', durationMinutes: 10, target: '50% Pace' }],
        },
      ],
    }),
  },
  {
    id: 'run-peak-race',
    name: 'Run - Race Pace',
    sport: 'run',
    phases: ['peak'],
    focus: 'race_specific',
    durationRange: [35, 60],
    intervalsTarget: 'PACE',
    render: (_zones, duration) => ({
      totalDurationMinutes: duration,
      sections: [
        {
          name: 'Warmup',
          durationMinutes: 10,
          steps: [
            { description: 'Easy jog with strides', durationMinutes: 10, target: '55% Pace' },
          ],
        },
        {
          name: 'Main Set',
          durationMinutes: duration - 20,
          steps: [
            { description: 'Race pace', durationMinutes: 5, target: '85-90% Pace', repeat: 3 },
            { description: 'Recovery', durationMinutes: 2, target: '55% Pace' },
          ],
        },
        {
          name: 'Cooldown',
          durationMinutes: 10,
          steps: [{ description: 'Easy jog', durationMinutes: 10, target: '50% Pace' }],
        },
      ],
    }),
  },
  {
    id: 'run-peak-long-pace',
    name: 'Run - Long Run with Pace Work',
    sport: 'run',
    phases: ['peak'],
    focus: 'race_specific',
    durationRange: [60, 120],
    intervalsTarget: 'PACE',
    render: (_zones, duration) => ({
      totalDurationMinutes: duration,
      sections: [
        {
          name: 'Warmup',
          durationMinutes: 15,
          steps: [{ description: 'Easy jog', durationMinutes: 15, target: '55% Pace' }],
        },
        {
          name: 'Main Set',
          durationMinutes: duration - 25,
          steps: [
            {
              description: 'Easy running',
              durationMinutes: Math.round((duration - 25) * 0.6),
              target: '60-65% Pace',
            },
            {
              description: 'Progressive to race pace',
              durationMinutes: Math.round((duration - 25) * 0.4),
              target: '75-85% Pace',
            },
          ],
        },
        {
          name: 'Cooldown',
          durationMinutes: 10,
          steps: [{ description: 'Easy walk/jog', durationMinutes: 10, target: '45% Pace' }],
        },
      ],
    }),
  },
  {
    id: 'run-recovery',
    name: 'Run - Easy Shakeout',
    sport: 'run',
    phases: ['recovery', 'taper', 'base'],
    focus: 'recovery',
    durationRange: [20, 35],
    intervalsTarget: 'PACE',
    render: (_zones, duration) => ({
      totalDurationMinutes: duration,
      sections: [
        {
          name: 'Main Set',
          durationMinutes: duration,
          steps: [
            { description: 'Easy shakeout jog', durationMinutes: duration, target: '50-55% Pace' },
          ],
        },
      ],
    }),
  },
  {
    id: 'run-taper-openers',
    name: 'Run - Openers',
    sport: 'run',
    phases: ['taper'],
    focus: 'race_specific',
    durationRange: [25, 40],
    intervalsTarget: 'PACE',
    render: (_zones, duration) => ({
      totalDurationMinutes: duration,
      sections: [
        {
          name: 'Warmup',
          durationMinutes: 10,
          steps: [{ description: 'Easy jog', durationMinutes: 10, target: '55% Pace' }],
        },
        {
          name: 'Main Set',
          durationMinutes: duration - 20,
          steps: [
            { description: 'Opener stride', durationMeters: 200, target: '85-90% Pace', repeat: 4 },
            { description: 'Recovery jog', durationMinutes: 1, target: 'freeride' },
          ],
        },
        {
          name: 'Cooldown',
          durationMinutes: 10,
          steps: [{ description: 'Easy jog', durationMinutes: 10, target: '50% Pace' }],
        },
      ],
    }),
  },
];
