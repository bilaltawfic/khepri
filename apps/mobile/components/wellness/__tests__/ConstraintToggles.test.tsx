import { fireEvent, render } from '@testing-library/react-native';
import { ConstraintToggles } from '../ConstraintToggles';

describe('ConstraintToggles', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  it('renders without crashing', () => {
    const { toJSON } = render(<ConstraintToggles selected={[]} onChange={mockOnChange} />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders all constraint options', () => {
    const { toJSON } = render(<ConstraintToggles selected={[]} onChange={mockOnChange} />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Traveling');
    expect(json).toContain('Limited Equipment');
    expect(json).toContain('Feeling Unwell');
    expect(json).toContain('Busy Day');
    expect(json).toContain('Outdoor Only');
    expect(json).toContain('Indoor Only');
  });

  it('toggles constraint on when pressed', () => {
    const { getByLabelText } = render(<ConstraintToggles selected={[]} onChange={mockOnChange} />);
    fireEvent.press(getByLabelText('Traveling not selected'));
    expect(mockOnChange).toHaveBeenCalledWith(['traveling']);
  });

  it('toggles constraint off when already selected', () => {
    const { getByLabelText } = render(
      <ConstraintToggles selected={['traveling']} onChange={mockOnChange} />
    );
    fireEvent.press(getByLabelText('Traveling selected'));
    expect(mockOnChange).toHaveBeenCalledWith([]);
  });

  it('adds to existing selections', () => {
    const { getByLabelText } = render(
      <ConstraintToggles selected={['traveling']} onChange={mockOnChange} />
    );
    fireEvent.press(getByLabelText('Feeling Unwell not selected'));
    expect(mockOnChange).toHaveBeenCalledWith(['traveling', 'feeling_unwell']);
  });

  it('removes from existing selections while keeping others', () => {
    const { getByLabelText } = render(
      <ConstraintToggles
        selected={['traveling', 'feeling_unwell', 'limited_equipment']}
        onChange={mockOnChange}
      />
    );
    fireEvent.press(getByLabelText('Feeling Unwell selected'));
    expect(mockOnChange).toHaveBeenCalledWith(['traveling', 'limited_equipment']);
  });

  it('renders selected constraints with correct label', () => {
    const { getByLabelText } = render(
      <ConstraintToggles selected={['traveling']} onChange={mockOnChange} />
    );
    // Selected constraint should have "selected" in its label
    expect(getByLabelText('Traveling selected')).toBeTruthy();
  });

  it('renders non-selected constraints with correct label', () => {
    const { getByLabelText } = render(
      <ConstraintToggles selected={['traveling']} onChange={mockOnChange} />
    );
    // Non-selected constraint should have "not selected" in its label
    expect(getByLabelText('Limited Equipment not selected')).toBeTruthy();
  });
});
