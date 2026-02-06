import { render } from '@testing-library/react-native';
import ChatScreen from '../chat';

describe('ChatScreen', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(<ChatScreen />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders the info card with instructions', () => {
    const { toJSON } = render(<ChatScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Chat with your AI coach');
  });

  it('renders the placeholder assistant message', () => {
    const { toJSON } = render(<ChatScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain("I'm your Khepri AI coach");
  });

  it('renders suggestion chips', () => {
    const { toJSON } = render(<ChatScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Try asking:');
    expect(json).toContain('What should I focus on this week?');
    expect(json).toContain('Suggest a recovery workout');
  });

  it('renders the text input placeholder', () => {
    const { toJSON } = render(<ChatScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Ask your coach...');
  });

  it('renders the send button', () => {
    const { toJSON } = render(<ChatScreen />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('send');
  });
});
