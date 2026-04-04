/**
 * Bike workout templates by phase/focus.
 */

import type { TrainingTemplate } from '../workout-templates.js';

export const BIKE_TEMPLATES: readonly TrainingTemplate[] = [
  {
    id: 'bike-base-endurance',
    name: 'Bike - Endurance',
    sport: 'bike',
    phases: ['base'],
    focus: 'aerobic_endurance',
    durationRange: [60, 120],
    intervalsTarget: 'POWER',
    render: (_zones, duration) => ({
      totalDurationMinutes: duration,
      sections: [
        {
          name: 'Warmup',
          durationMinutes: 10,
          steps: [{ description: 'Easy spin', durationMinutes: 10, target: 'ramp 40-60%' }],
        },
        {
          name: 'Main Set',
          durationMinutes: duration - 20,
          steps: [
            { description: 'Steady endurance', durationMinutes: duration - 20, target: '55-70%' },
          ],
        },
        {
          name: 'Cooldown',
          durationMinutes: 10,
          steps: [{ description: 'Easy spin', durationMinutes: 10, target: '45%' }],
        },
      ],
    }),
  },
  {
    id: 'bike-base-sweetspot',
    name: 'Bike - Sweet Spot',
    sport: 'bike',
    phases: ['base', 'build'],
    focus: 'threshold_work',
    durationRange: [60, 90],
    intervalsTarget: 'POWER',
    render: (_zones, duration) => ({
      totalDurationMinutes: duration,
      sections: [
        {
          name: 'Warmup',
          durationMinutes: 15,
          steps: [
            { description: 'Progressive warm-up', durationMinutes: 15, target: 'ramp 45-65%' },
          ],
        },
        {
          name: 'Main Set',
          durationMinutes: duration - 25,
          steps: [
            { description: 'Sweet spot effort', durationMinutes: 10, target: '85-90%', repeat: 3 },
            { description: 'Recovery', durationMinutes: 5, target: '50%' },
          ],
        },
        {
          name: 'Cooldown',
          durationMinutes: 10,
          steps: [{ description: 'Easy spin', durationMinutes: 10, target: '45%' }],
        },
      ],
    }),
  },
  {
    id: 'bike-build-threshold',
    name: 'Bike - Threshold Intervals',
    sport: 'bike',
    phases: ['build', 'peak'],
    focus: 'threshold_work',
    durationRange: [50, 75],
    intervalsTarget: 'POWER',
    render: (_zones, duration) => ({
      totalDurationMinutes: duration,
      sections: [
        {
          name: 'Warmup',
          durationMinutes: 10,
          steps: [{ description: 'Ramp warm-up', durationMinutes: 10, target: 'ramp 50-75%' }],
        },
        {
          name: 'Main Set',
          durationMinutes: duration - 20,
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
    }),
  },
  {
    id: 'bike-build-vo2max',
    name: 'Bike - VO2max Intervals',
    sport: 'bike',
    phases: ['build'],
    focus: 'vo2max',
    durationRange: [50, 70],
    intervalsTarget: 'POWER',
    render: (_zones, duration) => ({
      totalDurationMinutes: duration,
      sections: [
        {
          name: 'Warmup',
          durationMinutes: 15,
          steps: [
            { description: 'Progressive warm-up', durationMinutes: 15, target: 'ramp 45-75%' },
          ],
        },
        {
          name: 'Main Set',
          durationMinutes: duration - 25,
          steps: [
            { description: 'VO2max effort', durationMinutes: 3, target: '110-120%', repeat: 5 },
            { description: 'Recovery', durationMinutes: 3, target: '45%' },
          ],
        },
        {
          name: 'Cooldown',
          durationMinutes: 10,
          steps: [{ description: 'Easy spin', durationMinutes: 10, target: '45%' }],
        },
      ],
    }),
  },
  {
    id: 'bike-build-overunders',
    name: 'Bike - Over-Unders',
    sport: 'bike',
    phases: ['build'],
    focus: 'threshold_work',
    durationRange: [55, 75],
    intervalsTarget: 'POWER',
    render: (_zones, duration) => ({
      totalDurationMinutes: duration,
      sections: [
        {
          name: 'Warmup',
          durationMinutes: 15,
          steps: [
            { description: 'Progressive warm-up', durationMinutes: 15, target: 'ramp 45-75%' },
          ],
        },
        {
          name: 'Main Set',
          durationMinutes: duration - 25,
          steps: [
            { description: 'Over FTP', durationMinutes: 2, target: '105-110%', repeat: 4 },
            { description: 'Under FTP', durationMinutes: 3, target: '85-90%' },
          ],
        },
        {
          name: 'Cooldown',
          durationMinutes: 10,
          steps: [{ description: 'Easy spin', durationMinutes: 10, target: '45%' }],
        },
      ],
    }),
  },
  {
    id: 'bike-peak-race',
    name: 'Bike - Race Simulation',
    sport: 'bike',
    phases: ['peak'],
    focus: 'race_specific',
    durationRange: [60, 120],
    intervalsTarget: 'POWER',
    render: (_zones, duration) => ({
      totalDurationMinutes: duration,
      sections: [
        {
          name: 'Warmup',
          durationMinutes: 10,
          steps: [{ description: 'Easy spin', durationMinutes: 10, target: 'ramp 45-65%' }],
        },
        {
          name: 'Main Set',
          durationMinutes: duration - 20,
          steps: [
            { description: 'Race pace', durationMinutes: 15, target: '75-85%', repeat: 3 },
            { description: 'Surge', durationMinutes: 2, target: '100-110%' },
          ],
        },
        {
          name: 'Cooldown',
          durationMinutes: 10,
          steps: [{ description: 'Easy spin', durationMinutes: 10, target: '45%' }],
        },
      ],
    }),
  },
  {
    id: 'bike-peak-brick',
    name: 'Bike - Brick Prep',
    sport: 'bike',
    phases: ['peak'],
    focus: 'race_specific',
    durationRange: [45, 75],
    intervalsTarget: 'POWER',
    render: (_zones, duration) => ({
      totalDurationMinutes: duration,
      sections: [
        {
          name: 'Warmup',
          durationMinutes: 10,
          steps: [{ description: 'Easy spin', durationMinutes: 10, target: 'ramp 45-65%' }],
        },
        {
          name: 'Main Set',
          durationMinutes: duration - 15,
          steps: [
            { description: 'Race effort', durationMinutes: duration - 20, target: '75-85%' },
            { description: 'Final push', durationMinutes: 5, target: '90-95%' },
          ],
        },
      ],
    }),
  },
  {
    id: 'bike-recovery',
    name: 'Bike - Easy Spin',
    sport: 'bike',
    phases: ['recovery', 'taper', 'base'],
    focus: 'recovery',
    durationRange: [30, 60],
    intervalsTarget: 'POWER',
    render: (_zones, duration) => ({
      totalDurationMinutes: duration,
      sections: [
        {
          name: 'Main Set',
          durationMinutes: duration,
          steps: [{ description: 'Easy spin', durationMinutes: duration, target: '45-55%' }],
        },
      ],
    }),
  },
  {
    id: 'bike-taper-openers',
    name: 'Bike - Openers',
    sport: 'bike',
    phases: ['taper'],
    focus: 'race_specific',
    durationRange: [30, 50],
    intervalsTarget: 'POWER',
    render: (_zones, duration) => ({
      totalDurationMinutes: duration,
      sections: [
        {
          name: 'Warmup',
          durationMinutes: 15,
          steps: [{ description: 'Easy spin', durationMinutes: 15, target: 'ramp 45-65%' }],
        },
        {
          name: 'Main Set',
          durationMinutes: duration - 25,
          steps: [
            { description: 'Opener', durationMinutes: 1, target: '100-110%', repeat: 3 },
            { description: 'Recovery', durationMinutes: 2, target: '45%' },
          ],
        },
        {
          name: 'Cooldown',
          durationMinutes: 10,
          steps: [{ description: 'Easy spin', durationMinutes: 10, target: '45%' }],
        },
      ],
    }),
  },
];
