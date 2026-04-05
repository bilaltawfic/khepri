import type { WeeklyCompliance } from '@khepri/core';
import { render } from '@testing-library/react-native';
import { WeekSummary } from '../WeekSummary';

const mockCompliance: WeeklyCompliance = {
  planned_sessions: 5,
  completed_sessions: 3,
  missed_sessions: 0,
  unplanned_sessions: 0,
  green_count: 2,
  amber_count: 1,
  red_count: 0,
  compliance_score: 0.83,
  compliance_color: 'green',
  planned_hours: 8.5,
  actual_hours: 5.2,
  planned_tss: 400,
  actual_tss: 260,
};

describe('WeekSummary', () => {
  it('renders THIS WEEK title', () => {
    const { toJSON } = render(<WeekSummary compliance={mockCompliance} remainingCount={2} />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('THIS WEEK');
  });

  it('renders completed and remaining counts', () => {
    const { toJSON } = render(<WeekSummary compliance={mockCompliance} remainingCount={2} />);
    const json = JSON.stringify(toJSON());
    // React splits template literals into separate text nodes
    expect(json).toContain('"3"');
    expect(json).toContain('completed');
    expect(json).toContain('"2"');
    expect(json).toContain('remaining');
  });

  it('renders compliance percentage', () => {
    const { toJSON } = render(<WeekSummary compliance={mockCompliance} remainingCount={2} />);
    const json = JSON.stringify(toJSON());
    // React splits "83" and "%" into separate children
    expect(json).toContain('"83"');
    expect(json).toContain('"%"');
  });

  it('renders planned hours', () => {
    const { toJSON } = render(<WeekSummary compliance={mockCompliance} remainingCount={2} />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('8.5h');
    expect(json).toContain('planned');
  });

  it('renders actual hours when available', () => {
    const { toJSON } = render(<WeekSummary compliance={mockCompliance} remainingCount={2} />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('5.2h');
    expect(json).toContain('actual');
  });

  it('handles zero compliance score', () => {
    const empty: WeeklyCompliance = {
      ...mockCompliance,
      completed_sessions: 0,
      compliance_score: 0,
      compliance_color: 'red',
      actual_hours: 0,
    };
    const { toJSON } = render(<WeekSummary compliance={empty} remainingCount={5} />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('"0"');
    expect(json).toContain('"%"');
  });
});
