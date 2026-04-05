import { fireEvent, render } from '@testing-library/react-native';
import { AdaptationCardFromRow } from '../adaptation/AdaptationCardFromRow';
import type { AdaptationRowData } from '../adaptation/AdaptationCardFromRow';

function makeRow(overrides: Partial<AdaptationRowData> = {}): AdaptationRowData {
  return {
    id: 'adapt-1',
    reason: 'Poor sleep detected.',
    affected_workouts: [
      {
        before: {
          name: 'Threshold Run',
          sport: 'run',
          plannedDurationMinutes: 60,
        },
        after: { plannedDurationMinutes: 40 },
      },
    ],
    context: { adaptationType: 'reduce_intensity', confidence: 'high' },
    ...overrides,
  };
}

describe('AdaptationCardFromRow', () => {
  it('renders reason from adaptation row', () => {
    const { toJSON } = render(
      <AdaptationCardFromRow adaptation={makeRow()} onAccept={jest.fn()} onReject={jest.fn()} />
    );
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Poor sleep detected.');
  });

  it('renders original workout name from affected_workouts', () => {
    const { toJSON } = render(
      <AdaptationCardFromRow adaptation={makeRow()} onAccept={jest.fn()} onReject={jest.fn()} />
    );
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Threshold Run');
  });

  it('renders modified workout from after snapshot', () => {
    const { toJSON } = render(
      <AdaptationCardFromRow adaptation={makeRow()} onAccept={jest.fn()} onReject={jest.fn()} />
    );
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Suggested');
    expect(json).toContain('"40"');
  });

  it('returns null when affected_workouts is empty', () => {
    const { toJSON } = render(
      <AdaptationCardFromRow
        adaptation={makeRow({ affected_workouts: [] })}
        onAccept={jest.fn()}
        onReject={jest.fn()}
      />
    );
    expect(toJSON()).toBeNull();
  });

  it('returns null when before is missing', () => {
    const { toJSON } = render(
      <AdaptationCardFromRow
        adaptation={makeRow({ affected_workouts: [{ before: null, after: {} }] })}
        onAccept={jest.fn()}
        onReject={jest.fn()}
      />
    );
    expect(toJSON()).toBeNull();
  });

  it('calls onAccept with adaptation id', () => {
    const onAccept = jest.fn();
    const { getByLabelText } = render(
      <AdaptationCardFromRow
        adaptation={makeRow({ id: 'adapt-42' })}
        onAccept={onAccept}
        onReject={jest.fn()}
      />
    );
    fireEvent.press(getByLabelText('Accept coach suggestion'));
    expect(onAccept).toHaveBeenCalledWith('adapt-42');
  });

  it('calls onReject with adaptation id', () => {
    const onReject = jest.fn();
    const { getByLabelText } = render(
      <AdaptationCardFromRow
        adaptation={makeRow({ id: 'adapt-42' })}
        onAccept={jest.fn()}
        onReject={onReject}
      />
    );
    fireEvent.press(getByLabelText('Keep original workout'));
    expect(onReject).toHaveBeenCalledWith('adapt-42');
  });

  it('shows swap target for swap_days with swapTargetDate', () => {
    const row = makeRow({
      context: {
        adaptationType: 'swap_days',
        swapTargetDate: '2026-04-08',
        confidence: 'medium',
      },
      affected_workouts: [
        {
          before: { name: 'Hard Run', sport: 'run', plannedDurationMinutes: 60 },
          after: {},
        },
      ],
    });
    const { toJSON } = render(
      <AdaptationCardFromRow adaptation={row} onAccept={jest.fn()} onReject={jest.fn()} />
    );
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Accept Swap');
    expect(json).toContain('Workout on 2026-04-08');
  });

  it('renders swap_not_viable as schedule conflict', () => {
    const row = makeRow({
      reason: 'No suitable day for swap — long run on Saturday.',
      context: { adaptationType: 'swap_not_viable', confidence: 'high' },
      affected_workouts: [
        {
          before: { name: 'Intervals', sport: 'run', plannedDurationMinutes: 45 },
          after: {},
        },
      ],
    });
    const { toJSON } = render(
      <AdaptationCardFromRow adaptation={row} onAccept={jest.fn()} onReject={jest.fn()} />
    );
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Schedule Conflict');
    expect(json).toContain('Got it');
    expect(json).toContain('No suitable day for swap');
    expect(json).not.toContain('Accept');
  });

  it('falls back to reduce_intensity for unknown adaptation type', () => {
    const row = makeRow({
      context: { adaptationType: 'unknown_type', confidence: 'low' },
    });
    const { toJSON } = render(
      <AdaptationCardFromRow adaptation={row} onAccept={jest.fn()} onReject={jest.fn()} />
    );
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Reduce intensity');
  });
});
