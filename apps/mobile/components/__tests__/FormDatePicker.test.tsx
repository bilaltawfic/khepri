import { fireEvent, render } from '@testing-library/react-native';
import { FormDatePicker } from '../FormDatePicker';

describe('FormDatePicker', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(
      <FormDatePicker label="Test Label" value={null} onChange={() => {}} />
    );
    expect(toJSON()).toBeTruthy();
  });

  it('renders the label', () => {
    const { toJSON } = render(
      <FormDatePicker label="Birth Date" value={null} onChange={() => {}} />
    );
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Birth Date');
  });

  it('renders placeholder when no value is selected', () => {
    const { toJSON } = render(
      <FormDatePicker label="Date" value={null} onChange={() => {}} placeholder="Pick a date" />
    );
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Pick a date');
  });

  it('renders formatted date when value is provided', () => {
    const testDate = new Date('2024-06-15');
    const { toJSON } = render(<FormDatePicker label="Date" value={testDate} onChange={() => {}} />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('June');
    expect(json).toContain('15');
    expect(json).toContain('2024');
  });

  it('displays error message when error prop is provided', () => {
    const { toJSON } = render(
      <FormDatePicker label="Date" value={null} onChange={() => {}} error="Date is required" />
    );
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Date is required');
  });

  it('displays help text when helpText prop is provided', () => {
    const { toJSON } = render(
      <FormDatePicker
        label="Date"
        value={null}
        onChange={() => {}}
        helpText="Select your target date"
      />
    );
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Select your target date');
  });

  it('shows clear button when allowClear is true and value exists', () => {
    const testDate = new Date('2024-06-15');
    const { toJSON } = render(
      <FormDatePicker label="Date" value={testDate} onChange={() => {}} allowClear />
    );
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Clear date');
  });

  it('does not show clear button when value is null', () => {
    const { toJSON } = render(
      <FormDatePicker label="Date" value={null} onChange={() => {}} allowClear />
    );
    const json = JSON.stringify(toJSON());
    expect(json).not.toContain('Clear date');
  });

  it('calls onChange with null when clear button is pressed', () => {
    const mockOnChange = jest.fn();
    const testDate = new Date('2024-06-15');
    const { getByLabelText } = render(
      <FormDatePicker label="Date" value={testDate} onChange={mockOnChange} allowClear />
    );

    fireEvent.press(getByLabelText('Clear date'));
    expect(mockOnChange).toHaveBeenCalledWith(null);
  });
});
