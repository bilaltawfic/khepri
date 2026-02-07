import { render } from '@testing-library/react-native';
import ConstraintFormScreen from '../constraint-form';

// Mock expo-router
jest.mock('expo-router', () => ({
  router: {
    back: jest.fn(),
    push: jest.fn(),
  },
  useLocalSearchParams: () => ({ type: 'injury' }),
}));

describe('ConstraintFormScreen', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(<ConstraintFormScreen />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders the constraint type header', () => {
    const { toJSON } = render(<ConstraintFormScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Injury');
    expect(json).toContain('Log an injury so Khepri can adjust your training');
  });

  it('renders Basic Information section', () => {
    const { toJSON } = render(<ConstraintFormScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Basic Information');
    expect(json).toContain('Title');
    expect(json).toContain('Description');
    expect(json).toContain('Start Date');
    expect(json).toContain('End Date');
  });

  it('renders Injury Details section for injury type', () => {
    const { toJSON } = render(<ConstraintFormScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Injury Details');
    expect(json).toContain('Affected Body Part');
    expect(json).toContain('Severity');
    expect(json).toContain('Training Restrictions');
  });

  it('renders Add Constraint button', () => {
    const { toJSON } = render(<ConstraintFormScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Add Constraint');
  });

  it('renders Cancel button', () => {
    const { toJSON } = render(<ConstraintFormScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Cancel');
  });

  it('renders restriction options', () => {
    const { toJSON } = render(<ConstraintFormScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('No running');
    expect(json).toContain('No cycling');
    expect(json).toContain('No swimming');
  });

  it('renders severity field', () => {
    const { toJSON } = render(<ConstraintFormScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Severity');
  });

  it('renders body part selection', () => {
    const { toJSON } = render(<ConstraintFormScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Affected Body Part');
  });
});
