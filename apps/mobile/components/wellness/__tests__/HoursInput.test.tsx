import { fireEvent, render } from '@testing-library/react-native';
import { HoursInput } from '../HoursInput';

describe('HoursInput', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  it('renders without crashing', () => {
    const { toJSON } = render(<HoursInput value={null} onChange={mockOnChange} />);
    expect(toJSON()).toBeTruthy();
  });

  it('displays "--" when value is null', () => {
    const { toJSON } = render(<HoursInput value={null} onChange={mockOnChange} />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('--');
  });

  it('displays the current value', () => {
    const { toJSON } = render(<HoursInput value={7.5} onChange={mockOnChange} />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('7.5');
  });

  it('displays whole numbers without decimal', () => {
    const { toJSON } = render(<HoursInput value={8} onChange={mockOnChange} />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('"8"');
  });

  it('displays "hours" label', () => {
    const { toJSON } = render(<HoursInput value={7} onChange={mockOnChange} />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('hours');
  });

  it('renders increase and decrease buttons', () => {
    const { getByLabelText } = render(<HoursInput value={7} onChange={mockOnChange} />);
    expect(getByLabelText('Increase hours')).toBeTruthy();
    expect(getByLabelText('Decrease hours')).toBeTruthy();
  });

  it('calls onChange with increased value when + is pressed', () => {
    const { getByLabelText } = render(<HoursInput value={7} onChange={mockOnChange} />);
    fireEvent.press(getByLabelText('Increase hours'));
    expect(mockOnChange).toHaveBeenCalledWith(7.5);
  });

  it('calls onChange with decreased value when - is pressed', () => {
    const { getByLabelText } = render(<HoursInput value={7} onChange={mockOnChange} />);
    fireEvent.press(getByLabelText('Decrease hours'));
    expect(mockOnChange).toHaveBeenCalledWith(6.5);
  });

  it('respects min value', () => {
    const { getByLabelText } = render(<HoursInput value={0} onChange={mockOnChange} min={0} />);
    fireEvent.press(getByLabelText('Decrease hours'));
    // Should not call onChange with a value below min, or call with min
    expect(mockOnChange).not.toHaveBeenCalled();
  });

  it('respects max value', () => {
    const { getByLabelText } = render(<HoursInput value={12} onChange={mockOnChange} max={12} />);
    fireEvent.press(getByLabelText('Increase hours'));
    // Should not call onChange with a value above max
    expect(mockOnChange).not.toHaveBeenCalled();
  });

  it('uses custom step value', () => {
    const { getByLabelText } = render(<HoursInput value={7} onChange={mockOnChange} step={1} />);
    fireEvent.press(getByLabelText('Increase hours'));
    expect(mockOnChange).toHaveBeenCalledWith(8);
  });

  it('initializes to min when null and + is pressed', () => {
    const { getByLabelText } = render(<HoursInput value={null} onChange={mockOnChange} min={0} />);
    fireEvent.press(getByLabelText('Increase hours'));
    expect(mockOnChange).toHaveBeenCalledWith(0);
  });

  it('initializes to max when null and - is pressed', () => {
    const { getByLabelText } = render(<HoursInput value={null} onChange={mockOnChange} max={12} />);
    fireEvent.press(getByLabelText('Decrease hours'));
    expect(mockOnChange).toHaveBeenCalledWith(12);
  });
});
