import type { WeekOverviewInfo } from '@khepri/core';
import { render } from '@testing-library/react-native';
import { WeekOverviewCard } from '../WeekOverviewCard';

const mockInfo: WeekOverviewInfo = {
  currentWeek: 3,
  totalWeeks: 12,
  phaseName: 'Base',
  phaseFocus: 'Aerobic Endurance',
  dailySlots: [
    { day: 'monday', type: 'rest' },
    { day: 'tuesday', type: 'workout', category: 'Run', focus: 'intervals', target_tss: 70 },
    { day: 'wednesday', type: 'workout', category: 'Swim', focus: 'endurance', target_tss: 50 },
    { day: 'thursday', type: 'workout', category: 'Bike', focus: 'tempo', target_tss: 75 },
    { day: 'friday', type: 'rest' },
    { day: 'saturday', type: 'workout', category: 'Run', focus: 'long_run', target_tss: 80 },
    { day: 'sunday', type: 'workout', category: 'Bike', focus: 'long_ride', target_tss: 120 },
  ],
  todayIndex: 2,
};

describe('WeekOverviewCard', () => {
  it('renders the card title', () => {
    const { toJSON } = render(<WeekOverviewCard info={mockInfo} />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('This Week');
  });

  it('renders week number and total', () => {
    const { toJSON } = render(<WeekOverviewCard info={mockInfo} />);
    const json = JSON.stringify(toJSON());
    // React splits template literals into separate text nodes
    expect(json).toContain('Week ');
    expect(json).toContain('"3"');
    expect(json).toContain('" of "');
    expect(json).toContain('"12"');
  });

  it('renders phase name and focus', () => {
    const { toJSON } = render(<WeekOverviewCard info={mockInfo} />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Base');
    expect(json).toContain('Aerobic Endurance');
  });

  it('renders day labels', () => {
    const { toJSON } = render(<WeekOverviewCard info={mockInfo} />);
    const json = JSON.stringify(toJSON());
    // Day labels: M, T, W, T, F, S, S
    expect(json).toContain('Rest');
    expect(json).toContain('Run');
    expect(json).toContain('Swim');
    expect(json).toContain('Bike');
  });

  it('renders without phase focus when empty', () => {
    const infoNoFocus: WeekOverviewInfo = {
      ...mockInfo,
      phaseName: 'Training',
      phaseFocus: '',
    };
    const { toJSON } = render(<WeekOverviewCard info={infoNoFocus} />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('This Week');
    // Should not render the phase info line
    expect(json).not.toContain('Training —');
  });
});
