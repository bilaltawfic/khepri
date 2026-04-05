import type { RaceBlockRow } from '@khepri/supabase-client';
import { render } from '@testing-library/react-native';
import { SeasonProgress } from '../SeasonProgress';

const mockBlock: RaceBlockRow = {
  id: 'b1',
  season_id: 's1',
  athlete_id: 'a1',
  name: '70.3 #1 Prep',
  goal_id: 'g1',
  start_date: '2026-02-01',
  end_date: '2026-06-07',
  total_weeks: 18,
  status: 'in_progress',
  phases: [],
  locked_at: '2026-02-01T00:00:00Z',
  pushed_to_intervals_at: null,
  weekly_compliance: [],
  overall_compliance: null,
  created_at: '2026-01-15T00:00:00Z',
  updated_at: '2026-04-01T00:00:00Z',
};

const mockNextRace = {
  name: 'Ironman 70.3',
  date: '2026-06-07',
  daysUntil: 63,
};

describe('SeasonProgress', () => {
  it('renders block name', () => {
    const { toJSON } = render(<SeasonProgress block={mockBlock} blockWeek={9} nextRace={null} />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('70.3 #1 Prep');
  });

  it('renders week number', () => {
    const { toJSON } = render(<SeasonProgress block={mockBlock} blockWeek={9} nextRace={null} />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Week ');
    expect(json).toContain('"9"');
    expect(json).toContain('" of "');
    expect(json).toContain('"18"');
  });

  it('renders race info when provided', () => {
    const { toJSON } = render(
      <SeasonProgress block={mockBlock} blockWeek={9} nextRace={mockNextRace} />
    );
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Ironman 70.3');
    // React splits "63" and " days" into separate children
    expect(json).toContain('"63"');
    expect(json).toContain('days');
  });

  it('does not render race info when null', () => {
    const { toJSON } = render(<SeasonProgress block={mockBlock} blockWeek={9} nextRace={null} />);
    const json = JSON.stringify(toJSON());
    expect(json).not.toContain('days');
  });

  it('renders compliance percentage when provided', () => {
    const { toJSON } = render(
      <SeasonProgress
        block={mockBlock}
        blockWeek={9}
        nextRace={null}
        blockComplianceScore={0.91}
        blockComplianceColor="green"
      />
    );
    const json = JSON.stringify(toJSON());
    // React splits "91" and "%" into separate children
    expect(json).toContain('"91"');
    expect(json).toContain('"%"');
  });

  it('does not render compliance when not provided', () => {
    const { toJSON } = render(<SeasonProgress block={mockBlock} blockWeek={9} nextRace={null} />);
    const json = JSON.stringify(toJSON());
    // When no compliance, there should be no percentage sign as a child
    expect(json).not.toContain('"%"');
  });
});
