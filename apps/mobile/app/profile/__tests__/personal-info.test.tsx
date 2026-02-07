import { render } from '@testing-library/react-native';
import PersonalInfoScreen from '../personal-info';

// Mock expo-router
jest.mock('expo-router', () => ({
  router: {
    back: jest.fn(),
    push: jest.fn(),
  },
}));

describe('PersonalInfoScreen', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(<PersonalInfoScreen />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders the description', () => {
    const { toJSON } = render(<PersonalInfoScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Update your personal information');
  });

  it('renders Basic Information section', () => {
    const { toJSON } = render(<PersonalInfoScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Basic Information');
    expect(json).toContain('Display Name');
    expect(json).toContain('Date of Birth');
  });

  it('renders Physical Stats section', () => {
    const { toJSON } = render(<PersonalInfoScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Physical Stats');
    expect(json).toContain('Weight');
    expect(json).toContain('Height');
  });

  it('renders Preferences section', () => {
    const { toJSON } = render(<PersonalInfoScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Preferences');
    expect(json).toContain('Units');
    expect(json).toContain('Timezone');
  });

  it('renders Save and Cancel buttons', () => {
    const { toJSON } = render(<PersonalInfoScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Save Changes');
    expect(json).toContain('Cancel');
  });
});
