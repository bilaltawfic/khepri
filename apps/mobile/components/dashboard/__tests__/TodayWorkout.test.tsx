import type { WorkoutRow } from '@khepri/supabase-client';
import { render } from '@testing-library/react-native';
import { TodayWorkout } from '../TodayWorkout';

const mockWorkout: WorkoutRow = {
  id: 'w1',
  block_id: 'b1',
  athlete_id: 'a1',
  date: '2026-04-05',
  week_number: 3,
  name: 'Threshold Intervals',
  sport: 'bike',
  workout_type: 'intervals',
  planned_duration_minutes: 60,
  planned_tss: 75,
  planned_distance_meters: null,
  structure: {
    sections: [
      {
        name: 'Warmup',
        durationMinutes: 10,
        steps: [{ description: 'ramp 50-75% FTP', durationMinutes: 10 }],
      },
      {
        name: 'Main Set',
        durationMinutes: 40,
        steps: [
          { description: '@ 95-105% FTP', durationMinutes: 8, repeat: 4 },
          { description: '@ 55% FTP', durationMinutes: 4 },
        ],
      },
    ],
    totalDurationMinutes: 60,
  },
  description_dsl: '',
  intervals_target: '',
  sync_status: 'synced',
  external_id: 'ext1',
  intervals_event_id: null,
  actual_duration_minutes: null,
  actual_tss: null,
  actual_distance_meters: null,
  actual_avg_power: null,
  actual_avg_pace_sec_per_km: null,
  actual_avg_hr: null,
  completed_at: null,
  intervals_activity_id: null,
  compliance: null,
  created_at: '2026-04-01T00:00:00Z',
  updated_at: '2026-04-01T00:00:00Z',
};

describe('TodayWorkout', () => {
  it('renders rest day message when isRestDay and no workouts', () => {
    const { toJSON } = render(<TodayWorkout workouts={[]} isRestDay={true} />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Rest Day');
    expect(json).toContain('Recovery and adaptation');
  });

  it('renders no workout message when not rest day and no workouts', () => {
    const { toJSON } = render(<TodayWorkout workouts={[]} isRestDay={false} />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('No workout planned for today');
  });

  it('renders workout name and duration', () => {
    const { toJSON } = render(<TodayWorkout workouts={[mockWorkout]} isRestDay={false} />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Threshold Intervals');
    // formatDuration(60) returns "1h"
    expect(json).toContain('1h');
  });

  it('renders sync status badge', () => {
    const { toJSON } = render(<TodayWorkout workouts={[mockWorkout]} isRestDay={false} />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Synced to Intervals.icu');
  });

  it('renders workout structure sections', () => {
    const { toJSON } = render(<TodayWorkout workouts={[mockWorkout]} isRestDay={false} />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Warmup');
    expect(json).toContain('Main Set');
    expect(json).toContain('95-105% FTP');
  });

  it('renders completed workout with actual values', () => {
    const completed = {
      ...mockWorkout,
      completed_at: '2026-04-05T10:00:00Z',
      actual_duration_minutes: 58,
      actual_tss: 72,
      compliance: { score: 'green' as const },
    };
    const { toJSON } = render(<TodayWorkout workouts={[completed]} isRestDay={false} />);
    const json = JSON.stringify(toJSON());
    // React splits template literals into separate text nodes
    expect(json).toContain('58m');
    expect(json).toContain('actual');
    expect(json).toContain('72 TSS');
  });

  it('renders TODAY date label', () => {
    const { toJSON } = render(<TodayWorkout workouts={[]} isRestDay={false} />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('TODAY');
  });

  it('renders multiple workouts', () => {
    const workout2 = { ...mockWorkout, id: 'w2', name: 'Easy Run', sport: 'run' };
    const { toJSON } = render(
      <TodayWorkout workouts={[mockWorkout, workout2]} isRestDay={false} />
    );
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Threshold Intervals');
    expect(json).toContain('Easy Run');
  });
});
