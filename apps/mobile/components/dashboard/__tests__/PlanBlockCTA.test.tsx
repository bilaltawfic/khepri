import { render } from '@testing-library/react-native';
import { PlanBlockCTA } from '../PlanBlockCTA';

describe('PlanBlockCTA', () => {
  const onPlanBlock = jest.fn();

  it('renders season name', () => {
    const { toJSON } = render(
      <PlanBlockCTA seasonName="2026 Season" nextRace={null} onPlanBlock={onPlanBlock} />
    );
    const json = JSON.stringify(toJSON());
    expect(json).toContain('2026 Season');
    expect(json).toContain('set up');
  });

  it('renders plan block button', () => {
    const { toJSON } = render(
      <PlanBlockCTA seasonName="2026 Season" nextRace={null} onPlanBlock={onPlanBlock} />
    );
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Plan First Block');
  });

  it('renders description text', () => {
    const { toJSON } = render(
      <PlanBlockCTA seasonName="2026 Season" nextRace={null} onPlanBlock={onPlanBlock} />
    );
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Plan your first training block');
  });

  it('renders next race info when provided', () => {
    const nextRace = { name: 'Ironman 70.3', date: '2026-06-07', daysUntil: 63 };
    const { toJSON } = render(
      <PlanBlockCTA seasonName="2026 Season" nextRace={nextRace} onPlanBlock={onPlanBlock} />
    );
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Ironman 70.3');
  });

  it('does not render race info when null', () => {
    const { toJSON } = render(
      <PlanBlockCTA seasonName="2026 Season" nextRace={null} onPlanBlock={onPlanBlock} />
    );
    const json = JSON.stringify(toJSON());
    expect(json).not.toContain('Next race');
  });
});
