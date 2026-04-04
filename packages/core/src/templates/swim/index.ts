/**
 * Swim workout templates by phase/focus.
 */

import type { TrainingTemplate } from '../workout-templates.js';

export const SWIM_TEMPLATES: readonly TrainingTemplate[] = [
  {
    id: 'swim-base-technique',
    name: 'Swim - Easy Technique',
    sport: 'swim',
    phases: ['base', 'recovery'],
    focus: 'aerobic_endurance',
    durationRange: [30, 50],
    intervalsTarget: 'PACE',
    render: (_zones, duration) => {
      const mainMeters = Math.round(((duration - 15) / 45) * 800);
      return {
        totalDurationMinutes: duration,
        sections: [
          {
            name: 'Warmup',
            durationMinutes: 8,
            steps: [
              { description: 'Easy swim with drills', durationMeters: 200, target: '55% Pace' },
            ],
          },
          {
            name: 'Main Set',
            durationMinutes: duration - 15,
            steps: [
              {
                description: 'Steady aerobic',
                durationMeters: Math.max(mainMeters, 200),
                target: '60-65% Pace',
                repeat: 4,
              },
              { description: 'Rest', durationMinutes: 0.5, target: 'rest' },
            ],
          },
          {
            name: 'Cooldown',
            durationMinutes: 7,
            steps: [{ description: 'Easy swim', durationMeters: 200, target: '50% Pace' }],
          },
        ],
      };
    },
  },
  {
    id: 'swim-base-endurance',
    name: 'Swim - Aerobic Endurance',
    sport: 'swim',
    phases: ['base'],
    focus: 'aerobic_endurance',
    durationRange: [40, 60],
    intervalsTarget: 'PACE',
    render: (_zones, duration) => ({
      totalDurationMinutes: duration,
      sections: [
        {
          name: 'Warmup',
          durationMinutes: 10,
          steps: [{ description: 'Progressive warm-up', durationMeters: 300, target: '55% Pace' }],
        },
        {
          name: 'Main Set',
          durationMinutes: duration - 18,
          steps: [
            { description: 'Aerobic 200s', durationMeters: 200, target: '65-70% Pace', repeat: 6 },
            { description: 'Rest', durationMinutes: 0.5, target: 'rest' },
          ],
        },
        {
          name: 'Cooldown',
          durationMinutes: 8,
          steps: [{ description: 'Easy swim', durationMeters: 200, target: '50% Pace' }],
        },
      ],
    }),
  },
  {
    id: 'swim-build-threshold',
    name: 'Swim - Threshold Intervals',
    sport: 'swim',
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
          steps: [{ description: 'Easy swim', durationMeters: 300, target: '55% Pace' }],
        },
        {
          name: 'Main Set',
          durationMinutes: duration - 18,
          steps: [
            {
              description: 'Threshold 100s',
              durationMeters: 100,
              target: '85-90% Pace',
              repeat: 8,
            },
            { description: 'Rest', durationMinutes: 0.5, target: 'rest' },
          ],
        },
        {
          name: 'Cooldown',
          durationMinutes: 8,
          steps: [{ description: 'Easy swim', durationMeters: 200, target: '50% Pace' }],
        },
      ],
    }),
  },
  {
    id: 'swim-build-css',
    name: 'Swim - CSS Development',
    sport: 'swim',
    phases: ['build'],
    focus: 'threshold_work',
    durationRange: [45, 65],
    intervalsTarget: 'PACE',
    render: (_zones, duration) => ({
      totalDurationMinutes: duration,
      sections: [
        {
          name: 'Warmup',
          durationMinutes: 10,
          steps: [{ description: 'Mixed warm-up', durationMeters: 400, target: '55% Pace' }],
        },
        {
          name: 'Main Set',
          durationMinutes: duration - 18,
          steps: [
            { description: 'CSS pace 200s', durationMeters: 200, target: '80-85% Pace', repeat: 5 },
            { description: 'Rest', durationMinutes: 0.5, target: 'rest' },
          ],
        },
        {
          name: 'Cooldown',
          durationMinutes: 8,
          steps: [{ description: 'Easy swim', durationMeters: 200, target: '50% Pace' }],
        },
      ],
    }),
  },
  {
    id: 'swim-peak-race',
    name: 'Swim - Race Pace',
    sport: 'swim',
    phases: ['peak'],
    focus: 'race_specific',
    durationRange: [35, 55],
    intervalsTarget: 'PACE',
    render: (_zones, duration) => ({
      totalDurationMinutes: duration,
      sections: [
        {
          name: 'Warmup',
          durationMinutes: 10,
          steps: [{ description: 'Easy swim', durationMeters: 300, target: '55% Pace' }],
        },
        {
          name: 'Main Set',
          durationMinutes: duration - 18,
          steps: [
            {
              description: 'Race pace efforts',
              durationMeters: 100,
              target: '90-95% Pace',
              repeat: 6,
            },
            { description: 'Recovery', durationMinutes: 1, target: 'rest' },
          ],
        },
        {
          name: 'Cooldown',
          durationMinutes: 8,
          steps: [{ description: 'Easy swim', durationMeters: 200, target: '50% Pace' }],
        },
      ],
    }),
  },
  {
    id: 'swim-peak-openwater',
    name: 'Swim - Open Water Simulation',
    sport: 'swim',
    phases: ['peak'],
    focus: 'race_specific',
    durationRange: [40, 60],
    intervalsTarget: 'PACE',
    render: (_zones, duration) => ({
      totalDurationMinutes: duration,
      sections: [
        {
          name: 'Warmup',
          durationMinutes: 8,
          steps: [{ description: 'Easy swim', durationMeters: 200, target: '55% Pace' }],
        },
        {
          name: 'Main Set',
          durationMinutes: duration - 16,
          steps: [
            { description: 'Race start simulation', durationMeters: 200, target: '90% Pace' },
            {
              description: 'Settle into race pace',
              durationMeters: 400,
              target: '80-85% Pace',
              repeat: 3,
            },
            { description: 'Surge', durationMeters: 100, target: '90-95% Pace' },
          ],
        },
        {
          name: 'Cooldown',
          durationMinutes: 8,
          steps: [{ description: 'Easy swim', durationMeters: 200, target: '50% Pace' }],
        },
      ],
    }),
  },
  {
    id: 'swim-recovery',
    name: 'Swim - Easy Recovery',
    sport: 'swim',
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
            { description: 'Easy continuous swim', durationMeters: 400, target: '50-55% Pace' },
            { description: 'Drills and technique', durationMeters: 200, target: 'freeride' },
          ],
        },
      ],
    }),
  },
];
