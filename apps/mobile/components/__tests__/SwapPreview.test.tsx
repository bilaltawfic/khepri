import { render } from '@testing-library/react-native';
import { SwapPreview } from '../adaptation/SwapPreview';
import type { SwapWorkoutInfo } from '../adaptation/SwapPreview';

const workoutA: SwapWorkoutInfo = {
  name: 'Threshold Run',
  sport: 'run',
  durationMinutes: 60,
  date: '2025-04-04',
};

const workoutB: SwapWorkoutInfo = {
  name: 'Easy Spin',
  sport: 'bike',
  durationMinutes: 45,
  date: '2025-04-07',
};

describe('SwapPreview', () => {
  it('renders both workout names', () => {
    const { toJSON } = render(<SwapPreview workoutA={workoutA} workoutB={workoutB} />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Threshold Run');
    expect(json).toContain('Easy Spin');
  });

  it('renders Today label', () => {
    const { toJSON } = render(<SwapPreview workoutA={workoutA} workoutB={workoutB} />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Today');
  });

  it('renders Target day label', () => {
    const { toJSON } = render(<SwapPreview workoutA={workoutA} workoutB={workoutB} />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Target day');
  });

  it('renders duration for both workouts', () => {
    const { toJSON } = render(<SwapPreview workoutA={workoutA} workoutB={workoutB} />);
    const json = JSON.stringify(toJSON());
    // Durations render as separate text nodes: "60" and " min" (not "60 min")
    expect(json).toContain('"60"');
    expect(json).toContain('"45"');
  });

  it('renders Before and After labels', () => {
    const { toJSON } = render(<SwapPreview workoutA={workoutA} workoutB={workoutB} />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Before');
    expect(json).toContain('After');
  });
});
