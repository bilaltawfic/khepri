import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { useEffect } from 'react';

import { SeasonSetupProvider, useSeasonSetup } from '@/contexts';
import type { SeasonSkeletonInput } from '@/contexts';

import OverviewScreen from '../overview';

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  },
}));

jest.mock('@/contexts/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuth: () => ({
    user: { id: 'auth-user-123' },
    session: { access_token: 'test-token' },
  }),
}));

const mockInvoke = jest.fn();
const mockCreateSeason = jest.fn();
const mockGetAthleteByAuthUser = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    functions: { invoke: (...args: unknown[]) => mockInvoke(...args) },
  },
}));

jest.mock('@khepri/supabase-client', () => ({
  createSeason: (...args: unknown[]) => mockCreateSeason(...args),
  getAthleteByAuthUser: (...args: unknown[]) => mockGetAthleteByAuthUser(...args),
}));

const sampleSkeleton: SeasonSkeletonInput = {
  totalWeeks: 20,
  phases: [
    {
      name: 'Base 1',
      startDate: '2026-04-07',
      endDate: '2026-05-31',
      weeks: 8,
      type: 'base',
      targetHoursPerWeek: 8,
      focus: 'Aerobic base building',
    },
    {
      name: 'Build',
      startDate: '2026-06-01',
      endDate: '2026-07-12',
      weeks: 6,
      type: 'build',
      targetHoursPerWeek: 10,
      focus: 'Sport-specific intensity',
    },
    {
      name: 'Taper',
      startDate: '2026-07-13',
      endDate: '2026-07-19',
      weeks: 1,
      type: 'taper',
      targetHoursPerWeek: 5,
      focus: 'Volume reduction',
    },
    {
      name: 'Race Week',
      startDate: '2026-07-20',
      endDate: '2026-07-26',
      weeks: 1,
      type: 'race_week',
      targetHoursPerWeek: 3,
      focus: 'Race execution',
    },
    {
      name: 'Recovery',
      startDate: '2026-07-27',
      endDate: '2026-08-09',
      weeks: 2,
      type: 'recovery',
      targetHoursPerWeek: 4,
      focus: 'Active recovery',
    },
    {
      name: 'Off Season',
      startDate: '2026-08-10',
      endDate: '2026-08-23',
      weeks: 2,
      type: 'off_season',
      targetHoursPerWeek: 3,
      focus: 'Unstructured activity',
    },
  ],
  feasibilityNotes: ['Volume is appropriate for your race targets'],
};

/**
 * Pre-loads skeleton into context so overview doesn't try to generate.
 */
function SkeletonSetter({ skeleton }: { skeleton: SeasonSkeletonInput }) {
  const { setSkeleton } = useSeasonSetup();
  useEffect(() => {
    setSkeleton(skeleton);
  }, [skeleton, setSkeleton]);
  return null;
}

function renderWithSkeleton(skeleton: SeasonSkeletonInput = sampleSkeleton) {
  return render(
    <SeasonSetupProvider>
      <SkeletonSetter skeleton={skeleton} />
      <OverviewScreen />
    </SeasonSetupProvider>
  );
}

describe('OverviewScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows loading state while generating', () => {
    mockInvoke.mockReturnValue(new Promise(() => {})); // Never resolves

    const { toJSON } = render(
      <SeasonSetupProvider>
        <OverviewScreen />
      </SeasonSetupProvider>
    );

    const json = JSON.stringify(toJSON());
    expect(json).toContain('Building your season');
  });

  it('shows error state on generation failure', async () => {
    mockInvoke.mockResolvedValue({
      error: { message: 'API key not configured' },
      data: null,
    });

    const { toJSON } = render(
      <SeasonSetupProvider>
        <OverviewScreen />
      </SeasonSetupProvider>
    );

    await waitFor(() => {
      const json = JSON.stringify(toJSON());
      expect(json).toContain('API key not configured');
    });
  });

  it('renders skeleton with phases when loaded', async () => {
    const { toJSON } = renderWithSkeleton();

    await waitFor(() => {
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Your season plan');
      expect(json).toContain('Base 1');
      expect(json).toContain('Build');
      expect(json).toContain('Taper');
      expect(json).toContain('Race Week');
      expect(json).toContain('Recovery');
      expect(json).toContain('Off Season');
    });
  });

  it('shows feasibility notes', async () => {
    const { toJSON } = renderWithSkeleton();

    await waitFor(() => {
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Volume is appropriate for your race targets');
    });
  });

  it('shows phase details (weeks and hours)', async () => {
    const { toJSON } = renderWithSkeleton();

    await waitFor(() => {
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Aerobic base building');
      expect(json).toContain('Sport-specific intensity');
    });
  });

  it('shows approve and regenerate buttons', async () => {
    const { toJSON } = renderWithSkeleton();

    await waitFor(() => {
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Approve');
      expect(json).toContain('Regenerate');
    });
  });

  it('shows phase type legend', async () => {
    const { toJSON } = renderWithSkeleton();

    await waitFor(() => {
      const json = JSON.stringify(toJSON());
      expect(json).toContain('base');
      expect(json).toContain('build');
      expect(json).toContain('taper');
      expect(json).toContain('recovery');
    });
  });

  it('hides feasibility notes when empty', async () => {
    const skeleton = { ...sampleSkeleton, feasibilityNotes: [] };
    const { toJSON } = renderWithSkeleton(skeleton);

    await waitFor(() => {
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Your season plan');
      expect(json).not.toContain('Notes');
    });
  });

  it('shows approve button and handles press', async () => {
    mockGetAthleteByAuthUser.mockResolvedValue({
      data: { id: 'athlete-123' },
      error: null,
    });
    mockCreateSeason.mockResolvedValue({ data: { id: 'season-1' }, error: null });

    const { getByLabelText } = renderWithSkeleton();

    await waitFor(() => {
      expect(getByLabelText('Approve and create season')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(getByLabelText('Approve and create season'));
    });

    // Approve triggers getAthleteByAuthUser
    await waitFor(() => {
      expect(mockGetAthleteByAuthUser).toHaveBeenCalled();
    });
  });

  it('calls regenerate on button press', async () => {
    mockInvoke.mockResolvedValue({ data: sampleSkeleton, error: null });

    const { getByLabelText } = renderWithSkeleton();

    await waitFor(() => {
      expect(getByLabelText('Regenerate season plan')).toBeTruthy();
    });
  });
});
