import { fireEvent, render } from '@testing-library/react-native';
import { SorenessInput } from '../SorenessInput';

describe('SorenessInput', () => {
  const mockOnOverallChange = jest.fn();
  const mockOnAreaToggle = jest.fn();

  beforeEach(() => {
    mockOnOverallChange.mockClear();
    mockOnAreaToggle.mockClear();
  });

  it('renders without crashing', () => {
    const { toJSON } = render(
      <SorenessInput
        overallSoreness={null}
        sorenessAreas={{}}
        onOverallChange={mockOnOverallChange}
        onAreaToggle={mockOnAreaToggle}
      />
    );
    expect(toJSON()).toBeTruthy();
  });

  it('renders overall soreness scale', () => {
    const { getByLabelText } = render(
      <SorenessInput
        overallSoreness={null}
        sorenessAreas={{}}
        onOverallChange={mockOnOverallChange}
        onAreaToggle={mockOnAreaToggle}
      />
    );
    for (let i = 1; i <= 10; i++) {
      expect(getByLabelText(`Soreness level ${i}`)).toBeTruthy();
    }
  });

  it('renders body area toggles', () => {
    const { toJSON } = render(
      <SorenessInput
        overallSoreness={null}
        sorenessAreas={{}}
        onOverallChange={mockOnOverallChange}
        onAreaToggle={mockOnAreaToggle}
      />
    );
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Legs');
    expect(json).toContain('Back');
    expect(json).toContain('Shoulders');
    expect(json).toContain('Arms');
    expect(json).toContain('Core');
    expect(json).toContain('Neck');
  });

  it('calls onOverallChange when soreness level is pressed', () => {
    const { getByLabelText } = render(
      <SorenessInput
        overallSoreness={null}
        sorenessAreas={{}}
        onOverallChange={mockOnOverallChange}
        onAreaToggle={mockOnAreaToggle}
      />
    );
    fireEvent.press(getByLabelText('Soreness level 5'));
    expect(mockOnOverallChange).toHaveBeenCalledWith(5);
  });

  it('calls onAreaToggle when body area is pressed', () => {
    const { getByLabelText } = render(
      <SorenessInput
        overallSoreness={5}
        sorenessAreas={{}}
        onOverallChange={mockOnOverallChange}
        onAreaToggle={mockOnAreaToggle}
      />
    );
    fireEvent.press(getByLabelText('Legs not sore'));
    expect(mockOnAreaToggle).toHaveBeenCalledWith('legs');
  });

  it('displays correct label for selected soreness level', () => {
    const { toJSON } = render(
      <SorenessInput
        overallSoreness={5}
        sorenessAreas={{}}
        onOverallChange={mockOnOverallChange}
        onAreaToggle={mockOnAreaToggle}
      />
    );
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Moderate');
    expect(json).toContain('5/10');
  });

  it('displays "Fresh" for low soreness', () => {
    const { toJSON } = render(
      <SorenessInput
        overallSoreness={2}
        sorenessAreas={{}}
        onOverallChange={mockOnOverallChange}
        onAreaToggle={mockOnAreaToggle}
      />
    );
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Fresh');
  });

  it('displays "Very Sore" for high soreness', () => {
    const { toJSON } = render(
      <SorenessInput
        overallSoreness={9}
        sorenessAreas={{}}
        onOverallChange={mockOnOverallChange}
        onAreaToggle={mockOnAreaToggle}
      />
    );
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Very Sore');
  });

  it('renders selected body areas with correct labels', () => {
    const { getByLabelText } = render(
      <SorenessInput
        overallSoreness={5}
        sorenessAreas={{ legs: 5, back: 5 }}
        onOverallChange={mockOnOverallChange}
        onAreaToggle={mockOnAreaToggle}
      />
    );
    // Selected areas should have "sore" in their label
    expect(getByLabelText('Legs sore')).toBeTruthy();
    expect(getByLabelText('Back sore')).toBeTruthy();
    // Non-selected areas should have "not sore" in their label
    expect(getByLabelText('Shoulders not sore')).toBeTruthy();
  });
});
