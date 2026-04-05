import { fireEvent, render } from '@testing-library/react-native';
import { AdaptationCard } from '../adaptation/AdaptationCard';
import type { AdaptationWorkoutSummary } from '../adaptation/AdaptationCard';

const mockWorkout: AdaptationWorkoutSummary = {
  name: 'Threshold Run',
  sport: 'run',
  durationMinutes: 60,
  date: '2025-04-04',
};

describe('AdaptationCard', () => {
  it('renders coach suggestion label', () => {
    const { toJSON } = render(
      <AdaptationCard
        adaptationId="adapt-1"
        adaptationType="reduce_intensity"
        reason="Your sleep was poor."
        originalWorkout={mockWorkout}
        onAccept={jest.fn()}
        onReject={jest.fn()}
      />
    );
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Coach Suggestion');
  });

  it('renders reason text', () => {
    const { toJSON } = render(
      <AdaptationCard
        adaptationId="adapt-1"
        adaptationType="reduce_intensity"
        reason="Your sleep was poor."
        originalWorkout={mockWorkout}
        onAccept={jest.fn()}
        onReject={jest.fn()}
      />
    );
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Your sleep was poor.');
  });

  it('renders original workout name', () => {
    const { toJSON } = render(
      <AdaptationCard
        adaptationId="adapt-1"
        adaptationType="reduce_intensity"
        reason="Low energy."
        originalWorkout={mockWorkout}
        onAccept={jest.fn()}
        onReject={jest.fn()}
      />
    );
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Threshold Run');
  });

  it('calls onAccept with adaptationId when accept button pressed', () => {
    const onAccept = jest.fn();
    const { getByLabelText } = render(
      <AdaptationCard
        adaptationId="adapt-42"
        adaptationType="add_rest"
        reason="High fatigue."
        originalWorkout={mockWorkout}
        onAccept={onAccept}
        onReject={jest.fn()}
      />
    );
    fireEvent.press(getByLabelText('Accept coach suggestion'));
    expect(onAccept).toHaveBeenCalledWith('adapt-42');
  });

  it('calls onReject with adaptationId when reject button pressed', () => {
    const onReject = jest.fn();
    const { getByLabelText } = render(
      <AdaptationCard
        adaptationId="adapt-42"
        adaptationType="add_rest"
        reason="High fatigue."
        originalWorkout={mockWorkout}
        onAccept={jest.fn()}
        onReject={onReject}
      />
    );
    fireEvent.press(getByLabelText('Keep original workout'));
    expect(onReject).toHaveBeenCalledWith('adapt-42');
  });

  it('shows "Accept Swap" label for swap_days type', () => {
    const { toJSON } = render(
      <AdaptationCard
        adaptationId="adapt-1"
        adaptationType="swap_days"
        reason="Move heavy session."
        originalWorkout={mockWorkout}
        onAccept={jest.fn()}
        onReject={jest.fn()}
      />
    );
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Accept Swap');
  });

  it('renders in loading state without crashing', () => {
    const { toJSON } = render(
      <AdaptationCard
        adaptationId="adapt-1"
        adaptationType="reduce_intensity"
        reason="Loading..."
        originalWorkout={mockWorkout}
        onAccept={jest.fn()}
        onReject={jest.fn()}
        isLoading
      />
    );
    expect(toJSON()).toBeTruthy();
  });

  it('renders "Schedule Conflict" header for swap_not_viable', () => {
    const { toJSON } = render(
      <AdaptationCard
        adaptationId="adapt-1"
        adaptationType="swap_not_viable"
        reason="No suitable swap target."
        originalWorkout={mockWorkout}
        onAccept={jest.fn()}
        onReject={jest.fn()}
      />
    );
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Schedule Conflict');
    expect(json).toContain('Got it');
    expect(json).not.toContain('Keep Original');
  });

  it('renders modified workout when provided', () => {
    const modified: AdaptationWorkoutSummary = {
      name: 'Easy Spin',
      sport: 'bike',
      durationMinutes: 45,
      date: '2025-04-04',
    };
    const { toJSON } = render(
      <AdaptationCard
        adaptationId="adapt-1"
        adaptationType="substitute"
        reason="High soreness."
        originalWorkout={mockWorkout}
        modifiedWorkout={modified}
        onAccept={jest.fn()}
        onReject={jest.fn()}
      />
    );
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Easy Spin');
  });
});
