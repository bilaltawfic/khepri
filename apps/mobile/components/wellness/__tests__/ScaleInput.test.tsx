import { fireEvent, render } from '@testing-library/react-native';
import { ScaleInput } from '../ScaleInput';

describe('ScaleInput', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  it('renders without crashing', () => {
    const { toJSON } = render(<ScaleInput value={null} onChange={mockOnChange} />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders numbers 1-10 by default', () => {
    const { getByLabelText } = render(<ScaleInput value={null} onChange={mockOnChange} />);
    for (let i = 1; i <= 10; i++) {
      expect(getByLabelText(`Select ${i}`)).toBeTruthy();
    }
  });

  it('renders with custom min and max', () => {
    const { getByLabelText, queryByLabelText } = render(
      <ScaleInput value={null} onChange={mockOnChange} min={3} max={7} />
    );
    expect(queryByLabelText('Select 1')).toBeNull();
    expect(queryByLabelText('Select 2')).toBeNull();
    expect(getByLabelText('Select 3')).toBeTruthy();
    expect(getByLabelText('Select 7')).toBeTruthy();
    expect(queryByLabelText('Select 8')).toBeNull();
  });

  it('calls onChange when a number is pressed', () => {
    const { getByLabelText } = render(<ScaleInput value={null} onChange={mockOnChange} />);
    fireEvent.press(getByLabelText('Select 5'));
    expect(mockOnChange).toHaveBeenCalledWith(5);
  });

  it('renders with labels when provided', () => {
    const { toJSON } = render(
      <ScaleInput value={null} onChange={mockOnChange} lowLabel="Low" highLabel="High" />
    );
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Low');
    expect(json).toContain('High');
  });

  it('renders with a value selected', () => {
    const { toJSON } = render(<ScaleInput value={5} onChange={mockOnChange} />);
    // The JSON should contain the value
    const json = JSON.stringify(toJSON());
    expect(json).toContain('"5"');
  });

  it('allows changing the selected value', () => {
    const { getByLabelText } = render(<ScaleInput value={5} onChange={mockOnChange} />);
    // Select a different value
    fireEvent.press(getByLabelText('Select 7'));
    expect(mockOnChange).toHaveBeenCalledWith(7);
  });
});
