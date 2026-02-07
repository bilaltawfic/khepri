import { fireEvent, render } from '@testing-library/react-native';
import { TimeAvailableInput } from '../TimeAvailableInput';

describe('TimeAvailableInput', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  it('renders without crashing', () => {
    const { toJSON } = render(<TimeAvailableInput value={null} onChange={mockOnChange} />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders all time options', () => {
    const { getByLabelText } = render(<TimeAvailableInput value={null} onChange={mockOnChange} />);
    expect(getByLabelText('Select 15 min')).toBeTruthy();
    expect(getByLabelText('Select 30 min')).toBeTruthy();
    expect(getByLabelText('Select 45 min')).toBeTruthy();
    expect(getByLabelText('Select 1 hr')).toBeTruthy();
    expect(getByLabelText('Select 1.5 hr')).toBeTruthy();
    expect(getByLabelText('Select 2+ hr')).toBeTruthy();
  });

  it('calls onChange when an option is pressed', () => {
    const { getByLabelText } = render(<TimeAvailableInput value={null} onChange={mockOnChange} />);
    fireEvent.press(getByLabelText('Select 1 hr'));
    expect(mockOnChange).toHaveBeenCalledWith(60);
  });

  it('calls onChange with correct value for 15 min', () => {
    const { getByLabelText } = render(<TimeAvailableInput value={null} onChange={mockOnChange} />);
    fireEvent.press(getByLabelText('Select 15 min'));
    expect(mockOnChange).toHaveBeenCalledWith(15);
  });

  it('calls onChange with correct value for 2+ hr', () => {
    const { getByLabelText } = render(<TimeAvailableInput value={null} onChange={mockOnChange} />);
    fireEvent.press(getByLabelText('Select 2+ hr'));
    expect(mockOnChange).toHaveBeenCalledWith(120);
  });

  it('renders with a value selected', () => {
    const { toJSON } = render(<TimeAvailableInput value={60} onChange={mockOnChange} />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('1 hr');
  });

  it('allows changing the selected value', () => {
    const { getByLabelText } = render(<TimeAvailableInput value={60} onChange={mockOnChange} />);
    // Select a different value (1.5 hr = 90 minutes)
    fireEvent.press(getByLabelText('Select 1.5 hr'));
    expect(mockOnChange).toHaveBeenCalledWith(90);
  });
});
