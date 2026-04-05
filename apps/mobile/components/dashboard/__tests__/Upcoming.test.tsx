import type { WorkoutRow } from '@khepri/supabase-client';
import { render } from '@testing-library/react-native';
import { Upcoming } from '../Upcoming';

const baseWorkout: WorkoutRow = {
  id: 'w1',
  block_id: 'b1',
  athlete_id: 'a1',
  date: '2026-04-06',
  week_number: 3,
  name: 'Aerobic Endurance',
  sport: 'swim',
  workout_type: 'endurance',
  planned_duration_minutes: 45,
  planned_tss: 40,
  planned_distance_meters: null,
  structure: { sections: [], totalDurationMinutes: 45 },
  description_dsl: '',
  intervals_target: '',
  sync_status: 'pending',
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

describe('Upcoming', () => {
  it('renders nothing when no workouts', () => {
    const { toJSON } = render(<Upcoming workouts={[]} />);
    expect(toJSON()).toBeNull();
  });

  it('renders upcoming title and workout name', () => {
    const { toJSON } = render(<Upcoming workouts={[baseWorkout]} />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('UPCOMING');
    expect(json).toContain('Aerobic Endurance');
  });

  it('renders workout duration', () => {
    const { toJSON } = render(<Upcoming workouts={[baseWorkout]} />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('45m');
  });

  it('renders multiple workouts on different days', () => {
    const w2 = {
      ...baseWorkout,
      id: 'w2',
      date: '2026-04-07',
      name: 'Tempo Intervals',
      sport: 'run',
    };
    const w3 = { ...baseWorkout, id: 'w3', date: '2026-04-08', name: 'Long Ride', sport: 'bike' };
    const { toJSON } = render(<Upcoming workouts={[baseWorkout, w2, w3]} />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Aerobic Endurance');
    expect(json).toContain('Tempo Intervals');
    expect(json).toContain('Long Ride');
  });

  it('renders day labels for workouts', () => {
    // 2026-04-06 is a Monday
    const { toJSON } = render(<Upcoming workouts={[baseWorkout]} />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Mon');
  });
});
