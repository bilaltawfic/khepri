import { fireEvent, render, waitFor } from '@testing-library/react-native';

import BlockSetupScreen from '../block-setup';

const mockGenerateWorkouts = jest.fn();
const mockRouterPush = jest.fn();

jest.mock('expo-router', () => ({
  router: {
    push: (...args: unknown[]) => mockRouterPush(...args),
    back: jest.fn(),
    replace: jest.fn(),
  },
}));

jest.mock('@/contexts', () => ({
  useAuth: () => ({ user: { id: 'test-user-123' } }),
}));

jest.mock('@/lib/supabase', () => ({
  supabase: { functions: { invoke: jest.fn() } },
}));

jest.mock('@/hooks/useBlockPlanning', () => ({
  useBlockPlanning: () => ({
    season: { id: 'season-1', name: '2026 Season' },
    step: 'setup',
    error: null,
    isLoading: false,
    generateWorkouts: mockGenerateWorkouts,
  }),
}));

describe('BlockSetupScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGenerateWorkouts.mockResolvedValue(undefined);
  });

  it('renders block setup form', () => {
    const { toJSON } = render(<BlockSetupScreen />);
    const tree = JSON.stringify(toJSON());

    expect(tree).toContain('Plan your next block');
    expect(tree).toContain('Weekly hours for this block');
    expect(tree).toContain('Unavailable days');
    expect(tree).toContain('Focus areas for this block');
  });

  it('renders all focus options', () => {
    const { toJSON } = render(<BlockSetupScreen />);
    const tree = JSON.stringify(toJSON());

    expect(tree).toContain('More threshold work');
    expect(tree).toContain('Swim technique emphasis');
    expect(tree).toContain('Build run volume gradually');
    expect(tree).toContain('Strength maintenance');
    expect(tree).toContain('Race-specific brick sessions');
  });

  it('renders generate button', () => {
    const { getByLabelText } = render(<BlockSetupScreen />);
    expect(getByLabelText('Generate workouts for this block')).toBeTruthy();
  });

  it('calls generateWorkouts on generate button press', async () => {
    const { getByLabelText } = render(<BlockSetupScreen />);

    const generateButton = getByLabelText('Generate workouts for this block');
    fireEvent.press(generateButton);

    await waitFor(() => {
      expect(mockGenerateWorkouts).toHaveBeenCalledWith({
        weeklyHoursMin: 8,
        weeklyHoursMax: 12,
        unavailableDates: [],
        focusAreas: [],
      });
    });
  });
});
