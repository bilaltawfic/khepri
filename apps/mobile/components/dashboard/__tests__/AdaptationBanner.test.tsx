import { render } from '@testing-library/react-native';
import { AdaptationBanner } from '../AdaptationBanner';

// Mock the AdaptationCardFromRow component
jest.mock('@/components/adaptation/AdaptationCardFromRow', () => ({
  AdaptationCardFromRow: ({ adaptation }: { adaptation: { id: string; reason: string } }) => {
    const { View, Text } = require('react-native');
    return (
      <View testID={`adaptation-${adaptation.id}`}>
        <Text>{adaptation.reason}</Text>
      </View>
    );
  },
}));

const mockAdaptation = {
  id: 'adapt-1',
  block_id: 'b1',
  athlete_id: 'a1',
  trigger: 'checkin',
  status: 'suggested',
  affected_workouts: [],
  reason: 'High fatigue detected — consider reducing intensity',
  context: null,
  rolled_back_at: null,
  rolled_back_by: null,
  rollback_adaptation_id: null,
  created_at: '2026-04-05T00:00:00Z',
};

describe('AdaptationBanner', () => {
  const onAccept = jest.fn();
  const onReject = jest.fn();

  it('renders nothing when no adaptations', () => {
    const { toJSON } = render(
      <AdaptationBanner adaptations={[]} onAccept={onAccept} onReject={onReject} />
    );
    expect(toJSON()).toBeNull();
  });

  it('renders adaptation card when adaptations exist', () => {
    const { toJSON } = render(
      <AdaptationBanner adaptations={[mockAdaptation]} onAccept={onAccept} onReject={onReject} />
    );
    const json = JSON.stringify(toJSON());
    expect(json).toContain('High fatigue detected');
  });

  it('renders multiple adaptation cards', () => {
    const second = { ...mockAdaptation, id: 'adapt-2', reason: 'Second adaptation' };
    const { toJSON } = render(
      <AdaptationBanner
        adaptations={[mockAdaptation, second]}
        onAccept={onAccept}
        onReject={onReject}
      />
    );
    const json = JSON.stringify(toJSON());
    expect(json).toContain('High fatigue detected');
    expect(json).toContain('Second adaptation');
  });
});
