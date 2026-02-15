import { render } from '@testing-library/react-native';

import type { TrainingReviewData } from '@/hooks';
import TrainingReviewScreen from '../training-review';

// Mock useTrainingReview hook
const mockRefresh = jest.fn();

let mockReviewState: {
  data: TrainingReviewData | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

jest.mock('@/hooks', () => ({
  useTrainingReview: () => mockReviewState,
}));

// Mock @khepri/core
jest.mock('@khepri/core', () => ({
  formatMinutes: (min: number) => {
    if (min < 60) return `${min}min`;
    const h = Math.floor(min / 60);
    const r = min % 60;
    if (r === 0) return `${h}h`;
    return `${h}h ${r}min`;
  },
}));

// Mock expo-router
jest.mock('expo-router', () => ({
  Stack: {
    Screen: () => null,
  },
}));

function createMockData(overrides: Partial<TrainingReviewData> = {}): TrainingReviewData {
  return {
    formStatus: 'fresh',
    formTrend: {
      direction: 'improving',
      tsbChange: 10,
      ctlChange: 3,
      atlChange: -7,
      currentTsb: 8,
      averageTsb: 3.5,
    },
    weeklyLoads: [
      {
        weekStart: '2026-01-06',
        totalTss: 200,
        activityCount: 4,
        averageTssPerActivity: 50,
        totalDuration: 240,
      },
      {
        weekStart: '2026-01-13',
        totalTss: 150,
        activityCount: 3,
        averageTssPerActivity: 50,
        totalDuration: 180,
      },
    ],
    recovery: {
      fatigueLevel: 'moderate',
      suggestedRecoveryDays: 1,
      rampRate: 3,
      isOverreaching: false,
    },
    fitnessData: [
      { date: '2026-01-10', ctl: 50, atl: 55, tsb: -5 },
      { date: '2026-01-16', ctl: 54, atl: 44, tsb: 10 },
    ],
    latestCTL: 54,
    latestATL: 44,
    latestTSB: 8,
    ...overrides,
  };
}

describe('TrainingReviewScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockReviewState = {
      data: null,
      isLoading: false,
      error: null,
      refresh: mockRefresh,
    };
  });

  it('renders without crashing', () => {
    const { toJSON } = render(<TrainingReviewScreen />);
    expect(toJSON()).toBeTruthy();
  });

  describe('loading state', () => {
    it('shows loading indicator when loading', () => {
      mockReviewState.isLoading = true;
      const { toJSON } = render(<TrainingReviewScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Loading training data');
    });
  });

  describe('error state', () => {
    it('shows error message', () => {
      mockReviewState.error = 'Failed to fetch wellness data';
      const { toJSON } = render(<TrainingReviewScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Failed to fetch wellness data');
    });

    it('shows retry button', () => {
      mockReviewState.error = 'Network error';
      const { getByLabelText } = render(<TrainingReviewScreen />);
      expect(getByLabelText('Retry loading training data')).toBeTruthy();
    });
  });

  describe('empty state', () => {
    it('shows connect message when no data', () => {
      const { toJSON } = render(<TrainingReviewScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('No Training Data');
      expect(json).toContain('Connect Intervals.icu');
    });
  });

  describe('with data', () => {
    beforeEach(() => {
      mockReviewState.data = createMockData();
    });

    it('renders Training Review header', () => {
      const { toJSON } = render(<TrainingReviewScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Training Review');
    });

    it('renders current form card with status badge', () => {
      const { toJSON } = render(<TrainingReviewScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Current Form');
      expect(json).toContain('Fresh');
    });

    it('renders fitness summary card with CTL, ATL, TSB', () => {
      const { toJSON } = render(<TrainingReviewScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Fitness Summary');
      expect(json).toContain('CTL');
      expect(json).toContain('ATL');
      expect(json).toContain('TSB');
      expect(json).toContain('54.0');
      expect(json).toContain('44.0');
    });

    it('renders recovery card with fatigue level', () => {
      const { toJSON } = render(<TrainingReviewScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Recovery Assessment');
      expect(json).toContain('Moderate Fatigue');
    });

    it('renders recovery days count', () => {
      const { toJSON } = render(<TrainingReviewScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Recovery Days');
    });

    it('renders ramp rate in recovery card', () => {
      const { toJSON } = render(<TrainingReviewScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Ramp Rate');
      expect(json).toContain('CTL/wk');
    });

    it('renders weekly training loads section', () => {
      const { toJSON } = render(<TrainingReviewScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Weekly Training Loads');
      expect(json).toContain('200 TSS');
      expect(json).toContain('150 TSS');
    });

    it('renders form trend card', () => {
      const { toJSON } = render(<TrainingReviewScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Form Trend');
      expect(json).toContain('Improving');
    });

    it('renders trend direction arrow', () => {
      const { toJSON } = render(<TrainingReviewScreen />);
      const json = JSON.stringify(toJSON());
      // Upward arrow for improving
      expect(json).toContain('\u2191');
    });

    it('renders trend change values', () => {
      const { toJSON } = render(<TrainingReviewScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('CTL Change');
      expect(json).toContain('ATL Change');
      expect(json).toContain('Avg TSB');
    });
  });

  describe('form status variations', () => {
    it('renders race ready status', () => {
      mockReviewState.data = createMockData({ formStatus: 'race_ready' });
      const { toJSON } = render(<TrainingReviewScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Race Ready');
    });

    it('renders optimal status', () => {
      mockReviewState.data = createMockData({ formStatus: 'optimal' });
      const { toJSON } = render(<TrainingReviewScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Optimal');
    });

    it('renders tired status', () => {
      mockReviewState.data = createMockData({ formStatus: 'tired' });
      const { toJSON } = render(<TrainingReviewScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Tired');
    });

    it('renders overtrained status', () => {
      mockReviewState.data = createMockData({ formStatus: 'overtrained' });
      const { toJSON } = render(<TrainingReviewScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Overtrained');
    });
  });

  describe('trend direction variations', () => {
    it('renders stable trend with right arrow', () => {
      mockReviewState.data = createMockData({
        formTrend: {
          direction: 'stable',
          tsbChange: 0,
          ctlChange: 0,
          atlChange: 0,
          currentTsb: 5,
          averageTsb: 5,
        },
      });
      const { toJSON } = render(<TrainingReviewScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('\u2192');
      expect(json).toContain('Stable');
    });

    it('renders declining trend with down arrow', () => {
      mockReviewState.data = createMockData({
        formTrend: {
          direction: 'declining',
          tsbChange: -10,
          ctlChange: -2,
          atlChange: 8,
          currentTsb: -5,
          averageTsb: -2,
        },
      });
      const { toJSON } = render(<TrainingReviewScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('\u2193');
      expect(json).toContain('Declining');
    });
  });

  describe('recovery warning', () => {
    it('shows overreaching warning when isOverreaching is true', () => {
      mockReviewState.data = createMockData({
        recovery: {
          fatigueLevel: 'very_high',
          suggestedRecoveryDays: 3,
          rampRate: 8,
          isOverreaching: true,
        },
      });
      const { toJSON } = render(<TrainingReviewScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Overreaching detected');
      expect(json).toContain('Very High Fatigue');
    });

    it('does not show overreaching warning when isOverreaching is false', () => {
      mockReviewState.data = createMockData();
      const { toJSON } = render(<TrainingReviewScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).not.toContain('Overreaching detected');
    });
  });

  describe('no trend data', () => {
    it('does not render form trend card when trend is null', () => {
      mockReviewState.data = createMockData({ formTrend: null });
      const { toJSON } = render(<TrainingReviewScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).not.toContain('Form Trend');
    });
  });

  describe('no recovery data', () => {
    it('does not render recovery card when recovery is null', () => {
      mockReviewState.data = createMockData({ recovery: null });
      const { toJSON } = render(<TrainingReviewScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).not.toContain('Recovery Assessment');
    });
  });

  describe('empty weekly loads', () => {
    it('does not render weekly loads section when no data', () => {
      mockReviewState.data = createMockData({ weeklyLoads: [] });
      const { toJSON } = render(<TrainingReviewScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).not.toContain('Weekly Training Loads');
    });
  });

  describe('accessibility', () => {
    it('has accessibility labels on form card', () => {
      mockReviewState.data = createMockData();
      const { getByLabelText } = render(<TrainingReviewScreen />);
      expect(getByLabelText(/Current form: Fresh/)).toBeTruthy();
    });

    it('has accessibility label on fitness summary card', () => {
      mockReviewState.data = createMockData();
      const { getByLabelText } = render(<TrainingReviewScreen />);
      expect(getByLabelText(/Fitness: CTL 54/)).toBeTruthy();
    });

    it('has accessibility label on recovery card', () => {
      mockReviewState.data = createMockData();
      const { getByLabelText } = render(<TrainingReviewScreen />);
      expect(getByLabelText(/Recovery: fatigue Moderate/)).toBeTruthy();
    });

    it('has accessibility label on trend arrow', () => {
      mockReviewState.data = createMockData();
      const { getByLabelText } = render(<TrainingReviewScreen />);
      expect(getByLabelText('Form is improving')).toBeTruthy();
    });
  });
});
