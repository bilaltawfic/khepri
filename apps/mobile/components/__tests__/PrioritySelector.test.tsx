import { fireEvent, render } from '@testing-library/react-native';
import { PrioritySelector } from '../PrioritySelector';

describe('PrioritySelector', () => {
  it('renders all three priority options', () => {
    const onChange = jest.fn();
    const { toJSON } = render(<PrioritySelector value="A" onChange={onChange} />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Priority A');
    expect(json).toContain('Priority B');
    expect(json).toContain('Priority C');
  });

  it('calls onChange when a priority is pressed', () => {
    const onChange = jest.fn();
    const { getByLabelText } = render(<PrioritySelector value="A" onChange={onChange} />);

    fireEvent.press(getByLabelText('Priority B'));

    expect(onChange).toHaveBeenCalledWith('B');
  });

  it('calls onChange with C when C is pressed', () => {
    const onChange = jest.fn();
    const { getByLabelText } = render(<PrioritySelector value="A" onChange={onChange} />);

    fireEvent.press(getByLabelText('Priority C'));

    expect(onChange).toHaveBeenCalledWith('C');
  });

  it('highlights the active option with a different background color', () => {
    const onChange = jest.fn();
    const { toJSON, rerender } = render(<PrioritySelector value="A" onChange={onChange} />);
    const jsonA = JSON.stringify(toJSON());

    // Re-render with B selected — the JSON should change
    rerender(<PrioritySelector value="B" onChange={onChange} />);
    const jsonB = JSON.stringify(toJSON());

    expect(jsonA).not.toBe(jsonB);
  });
});
