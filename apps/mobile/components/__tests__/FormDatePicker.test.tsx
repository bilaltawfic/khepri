import { fireEvent, render } from '@testing-library/react-native';
import { FormDatePicker } from '../FormDatePicker';

describe('FormDatePicker', () => {
  describe('Basic Rendering', () => {
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

    it('uses default placeholder when not specified', () => {
      const { toJSON } = render(<FormDatePicker label="Date" value={null} onChange={() => {}} />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Select a date');
    });

    it('renders formatted date when value is provided', () => {
      const testDate = new Date('2024-06-15');
      const { toJSON } = render(
        <FormDatePicker label="Date" value={testDate} onChange={() => {}} />
      );
      const json = JSON.stringify(toJSON());
      expect(json).toContain('June');
      expect(json).toContain('15');
      expect(json).toContain('2024');
    });

    it('renders calendar icon', () => {
      const { toJSON } = render(<FormDatePicker label="Date" value={null} onChange={() => {}} />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('calendar-outline');
    });
  });

  describe('Error and Help Text', () => {
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

    it('does not display help text when error is present', () => {
      const { toJSON } = render(
        <FormDatePicker
          label="Date"
          value={null}
          onChange={() => {}}
          error="Date is required"
          helpText="Select your target date"
        />
      );
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Date is required');
      expect(json).not.toContain('Select your target date');
    });
  });

  describe('Clear Button', () => {
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

    it('does not show clear button when allowClear is false', () => {
      const testDate = new Date('2024-06-15');
      const { toJSON } = render(
        <FormDatePicker label="Date" value={testDate} onChange={() => {}} allowClear={false} />
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

  describe('Accessibility', () => {
    it('has correct accessibility role for date button', () => {
      const { toJSON } = render(<FormDatePicker label="Date" value={null} onChange={() => {}} />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('button');
    });

    it('has correct accessibility label for date button with placeholder', () => {
      const { getByLabelText } = render(
        <FormDatePicker label="Date" value={null} onChange={() => {}} placeholder="Pick a date" />
      );
      expect(getByLabelText('Date: Pick a date')).toBeTruthy();
    });

    it('has correct accessibility label for clear button', () => {
      const testDate = new Date('2024-06-15');
      const { getByLabelText } = render(
        <FormDatePicker label="Date" value={testDate} onChange={jest.fn()} allowClear />
      );
      expect(getByLabelText('Clear date')).toBeTruthy();
    });

    it('has correct accessibility label with formatted date', () => {
      const testDate = new Date('2024-06-15');
      const { getByLabelText } = render(
        <FormDatePicker label="Date" value={testDate} onChange={() => {}} />
      );
      expect(getByLabelText(/Date: June/)).toBeTruthy();
    });
  });

  describe('Date Formatting', () => {
    it('formats date correctly for January', () => {
      const testDate = new Date('2024-01-05');
      const { toJSON } = render(
        <FormDatePicker label="Date" value={testDate} onChange={() => {}} />
      );
      const json = JSON.stringify(toJSON());
      expect(json).toContain('January');
      expect(json).toContain('5');
      expect(json).toContain('2024');
    });

    it('formats date correctly for December', () => {
      const testDate = new Date('2024-12-25');
      const { toJSON } = render(
        <FormDatePicker label="Date" value={testDate} onChange={() => {}} />
      );
      const json = JSON.stringify(toJSON());
      expect(json).toContain('December');
      expect(json).toContain('25');
      expect(json).toContain('2024');
    });

    it('formats date correctly for February', () => {
      const testDate = new Date('2024-02-14');
      const { toJSON } = render(
        <FormDatePicker label="Date" value={testDate} onChange={() => {}} />
      );
      const json = JSON.stringify(toJSON());
      expect(json).toContain('February');
      expect(json).toContain('14');
    });

    it('formats date correctly for March', () => {
      const testDate = new Date('2024-03-17');
      const { toJSON } = render(
        <FormDatePicker label="Date" value={testDate} onChange={() => {}} />
      );
      const json = JSON.stringify(toJSON());
      expect(json).toContain('March');
    });

    it('formats date correctly for April', () => {
      const testDate = new Date('2024-04-01');
      const { toJSON } = render(
        <FormDatePicker label="Date" value={testDate} onChange={() => {}} />
      );
      const json = JSON.stringify(toJSON());
      expect(json).toContain('April');
    });

    it('formats date correctly for May', () => {
      const testDate = new Date('2024-05-05');
      const { toJSON } = render(
        <FormDatePicker label="Date" value={testDate} onChange={() => {}} />
      );
      const json = JSON.stringify(toJSON());
      expect(json).toContain('May');
    });

    it('formats date correctly for July', () => {
      const testDate = new Date('2024-07-04');
      const { toJSON } = render(
        <FormDatePicker label="Date" value={testDate} onChange={() => {}} />
      );
      const json = JSON.stringify(toJSON());
      expect(json).toContain('July');
    });

    it('formats date correctly for August', () => {
      const testDate = new Date('2024-08-15');
      const { toJSON } = render(
        <FormDatePicker label="Date" value={testDate} onChange={() => {}} />
      );
      const json = JSON.stringify(toJSON());
      expect(json).toContain('August');
    });

    it('formats date correctly for September', () => {
      const testDate = new Date('2024-09-21');
      const { toJSON } = render(
        <FormDatePicker label="Date" value={testDate} onChange={() => {}} />
      );
      const json = JSON.stringify(toJSON());
      expect(json).toContain('September');
    });

    it('formats date correctly for October', () => {
      const testDate = new Date('2024-10-31');
      const { toJSON } = render(
        <FormDatePicker label="Date" value={testDate} onChange={() => {}} />
      );
      const json = JSON.stringify(toJSON());
      expect(json).toContain('October');
    });

    it('formats date correctly for November', () => {
      const testDate = new Date('2024-11-28');
      const { toJSON } = render(
        <FormDatePicker label="Date" value={testDate} onChange={() => {}} />
      );
      const json = JSON.stringify(toJSON());
      expect(json).toContain('November');
    });
  });

  describe('Minimum and Maximum Date Props', () => {
    it('accepts minimumDate prop', () => {
      const testDate = new Date('2024-06-15');
      const minimumDate = new Date('2024-06-10');
      const { toJSON } = render(
        <FormDatePicker
          label="Date"
          value={testDate}
          onChange={() => {}}
          minimumDate={minimumDate}
        />
      );
      expect(toJSON()).toBeTruthy();
    });

    it('accepts maximumDate prop', () => {
      const testDate = new Date('2024-06-15');
      const maximumDate = new Date('2024-06-20');
      const { toJSON } = render(
        <FormDatePicker
          label="Date"
          value={testDate}
          onChange={() => {}}
          maximumDate={maximumDate}
        />
      );
      expect(toJSON()).toBeTruthy();
    });

    it('accepts both minimum and maximum date props', () => {
      const testDate = new Date('2024-06-15');
      const minimumDate = new Date('2024-06-10');
      const maximumDate = new Date('2024-06-20');
      const { toJSON } = render(
        <FormDatePicker
          label="Date"
          value={testDate}
          onChange={() => {}}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
        />
      );
      expect(toJSON()).toBeTruthy();
    });
  });

  describe('Different Date Values', () => {
    it('handles null value correctly', () => {
      const { toJSON } = render(<FormDatePicker label="Date" value={null} onChange={() => {}} />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Select a date');
    });

    it('handles date in the past', () => {
      const testDate = new Date('2020-01-01');
      const { toJSON } = render(
        <FormDatePicker label="Date" value={testDate} onChange={() => {}} />
      );
      const json = JSON.stringify(toJSON());
      expect(json).toContain('January');
      expect(json).toContain('2020');
    });

    it('handles date in the future', () => {
      const testDate = new Date('2030-12-31');
      const { toJSON } = render(
        <FormDatePicker label="Date" value={testDate} onChange={() => {}} />
      );
      const json = JSON.stringify(toJSON());
      expect(json).toContain('December');
      expect(json).toContain('2030');
    });
  });

  describe('AllowClear Prop Variations', () => {
    it('default allowClear is false', () => {
      const testDate = new Date('2024-06-15');
      const { toJSON } = render(
        <FormDatePicker label="Date" value={testDate} onChange={() => {}} />
      );
      const json = JSON.stringify(toJSON());
      expect(json).not.toContain('Clear date');
    });

    it('allowClear true with date shows clear button', () => {
      const testDate = new Date('2024-06-15');
      const { getByLabelText } = render(
        <FormDatePicker label="Date" value={testDate} onChange={jest.fn()} allowClear={true} />
      );
      expect(getByLabelText('Clear date')).toBeTruthy();
    });
  });

  describe('Error Border Styling', () => {
    it('applies error styling when error is provided', () => {
      const { toJSON } = render(
        <FormDatePicker
          label="Date"
          value={null}
          onChange={() => {}}
          error="This field is required"
        />
      );
      const json = JSON.stringify(toJSON());
      // Error text should be present
      expect(json).toContain('This field is required');
    });
  });
});
