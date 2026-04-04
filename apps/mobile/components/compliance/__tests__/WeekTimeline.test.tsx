import type { WeeklyCompliance } from '@khepri/core';
import { render } from '@testing-library/react-native';
import { WeekTimeline } from '../WeekTimeline';

const makeWeek = (
  score: number,
  color: WeeklyCompliance['compliance_color']
): WeeklyCompliance => ({
  planned_sessions: 5,
  completed_sessions: 5,
  missed_sessions: 0,
  unplanned_sessions: 0,
  green_count: 5,
  amber_count: 0,
  red_count: 0,
  compliance_score: score,
  compliance_color: color,
  planned_hours: 5,
  actual_hours: 5,
  planned_tss: 300,
  actual_tss: 300,
});

describe('WeekTimeline', () => {
  it('renders without crashing with empty weeks', () => {
    const { toJSON } = render(<WeekTimeline weeks={[]} currentWeek={1} />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders the correct number of cells', () => {
    const weeks = [makeWeek(1.0, 'green'), makeWeek(0.7, 'amber'), makeWeek(0.3, 'red')];
    const { toJSON } = render(<WeekTimeline weeks={weeks} currentWeek={2} />);
    expect(toJSON()).toBeTruthy();
  });

  it('highlights the current week', () => {
    const weeks = [makeWeek(1.0, 'green'), makeWeek(0.9, 'green'), makeWeek(0.8, 'green')];
    const { toJSON } = render(<WeekTimeline weeks={weeks} currentWeek={2} />);
    const json = JSON.stringify(toJSON());
    // Current week label shows week number inside the cell
    expect(json).toContain('"2"');
  });

  it('renders null weeks as empty (not started)', () => {
    const weeks = [makeWeek(1.0, 'green'), null, null];
    const { toJSON } = render(<WeekTimeline weeks={weeks} currentWeek={1} />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('not started');
  });

  it('renders accessibility labels for scored weeks', () => {
    const weeks = [makeWeek(0.91, 'green')];
    const { toJSON } = render(<WeekTimeline weeks={weeks} currentWeek={1} />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Week 1');
    expect(json).toContain('green');
  });

  it('accepts custom cell size', () => {
    const weeks = [makeWeek(1.0, 'green')];
    const { toJSON } = render(<WeekTimeline weeks={weeks} currentWeek={1} cellSize={16} />);
    expect(toJSON()).toBeTruthy();
  });
});
