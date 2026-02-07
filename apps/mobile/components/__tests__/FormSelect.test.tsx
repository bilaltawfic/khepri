import { render } from '@testing-library/react-native';
import { FormSelect } from '../FormSelect';

const mockOptions = [
  { label: 'Option 1', value: 'opt1' },
  { label: 'Option 2', value: 'opt2' },
  { label: 'Option 3', value: 'opt3' },
];

const numericOptions = [
  { label: 'One', value: 1 },
  { label: 'Two', value: 2 },
  { label: 'Three', value: 3 },
];

describe('FormSelect', () => {
  describe('Basic Rendering', () => {
    it('renders without crashing', () => {
      const { toJSON } = render(
        <FormSelect label="Test Label" value={null} options={mockOptions} onChange={() => {}} />
      );
      expect(toJSON()).toBeTruthy();
    });

    it('renders the label', () => {
      const { toJSON } = render(
        <FormSelect
          label="Select Category"
          value={null}
          options={mockOptions}
          onChange={() => {}}
        />
      );
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Select Category');
    });

    it('renders placeholder when no value is selected', () => {
      const { toJSON } = render(
        <FormSelect
          label="Category"
          value={null}
          options={mockOptions}
          onChange={() => {}}
          placeholder="Choose a category"
        />
      );
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Choose a category');
    });

    it('uses default placeholder when not specified', () => {
      const { toJSON } = render(
        <FormSelect label="Category" value={null} options={mockOptions} onChange={() => {}} />
      );
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Select an option');
    });

    it('renders selected option label when value is provided', () => {
      const { toJSON } = render(
        <FormSelect label="Category" value="opt2" options={mockOptions} onChange={() => {}} />
      );
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Option 2');
    });

    it('renders chevron-down icon', () => {
      const { toJSON } = render(
        <FormSelect label="Category" value={null} options={mockOptions} onChange={() => {}} />
      );
      const json = JSON.stringify(toJSON());
      expect(json).toContain('chevron-down');
    });
  });

  describe('Error and Help Text', () => {
    it('displays error message when error prop is provided', () => {
      const { toJSON } = render(
        <FormSelect
          label="Category"
          value={null}
          options={mockOptions}
          onChange={() => {}}
          error="Please select an option"
        />
      );
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Please select an option');
    });

    it('displays help text when helpText prop is provided', () => {
      const { toJSON } = render(
        <FormSelect
          label="Category"
          value={null}
          options={mockOptions}
          onChange={() => {}}
          helpText="Select the most relevant category"
        />
      );
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Select the most relevant category');
    });

    it('does not display help text when error is present', () => {
      const { toJSON } = render(
        <FormSelect
          label="Category"
          value={null}
          options={mockOptions}
          onChange={() => {}}
          error="Please select an option"
          helpText="Select the most relevant category"
        />
      );
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Please select an option');
      expect(json).not.toContain('Select the most relevant category');
    });
  });

  describe('Accessibility', () => {
    it('has correct accessibility label with placeholder', () => {
      const { toJSON } = render(
        <FormSelect label="Category" value={null} options={mockOptions} onChange={() => {}} />
      );
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Category: Select an option');
    });

    it('has correct accessibility label with custom placeholder', () => {
      const { getByLabelText } = render(
        <FormSelect
          label="Category"
          value={null}
          options={mockOptions}
          onChange={() => {}}
          placeholder="Choose one"
        />
      );
      expect(getByLabelText('Category: Choose one')).toBeTruthy();
    });

    it('has correct accessibility label with selected value', () => {
      const { getByLabelText } = render(
        <FormSelect label="Category" value="opt2" options={mockOptions} onChange={() => {}} />
      );
      expect(getByLabelText('Category: Option 2')).toBeTruthy();
    });

    it('has button accessibility role', () => {
      const { toJSON } = render(
        <FormSelect label="Category" value={null} options={mockOptions} onChange={() => {}} />
      );
      const json = JSON.stringify(toJSON());
      expect(json).toContain('button');
    });
  });

  describe('Empty Options', () => {
    it('renders with empty options array', () => {
      const { toJSON } = render(
        <FormSelect label="Category" value={null} options={[]} onChange={() => {}} />
      );
      expect(toJSON()).toBeTruthy();
    });
  });

  describe('Numeric Values', () => {
    it('works with numeric option values', () => {
      const { toJSON } = render(
        <FormSelect label="Number" value={2} options={numericOptions} onChange={() => {}} />
      );
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Two');
    });

    it('shows first numeric value correctly', () => {
      const { toJSON } = render(
        <FormSelect label="Number" value={1} options={numericOptions} onChange={() => {}} />
      );
      const json = JSON.stringify(toJSON());
      expect(json).toContain('One');
    });

    it('shows third numeric value correctly', () => {
      const { toJSON } = render(
        <FormSelect label="Number" value={3} options={numericOptions} onChange={() => {}} />
      );
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Three');
    });
  });

  describe('Long Option Lists', () => {
    const manyOptions = Array.from({ length: 20 }, (_, i) => ({
      label: `Option ${i + 1}`,
      value: `opt${i + 1}`,
    }));

    it('renders with many options', () => {
      const { toJSON } = render(
        <FormSelect label="Category" value={null} options={manyOptions} onChange={() => {}} />
      );
      expect(toJSON()).toBeTruthy();
    });

    it('shows selected option from long list', () => {
      const { toJSON } = render(
        <FormSelect label="Category" value="opt15" options={manyOptions} onChange={() => {}} />
      );
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Option 15');
    });
  });

  describe('Special Characters in Labels', () => {
    const specialOptions = [
      { label: 'Option with "quotes"', value: 'quotes' },
      { label: "Option with 'apostrophe'", value: 'apostrophe' },
      { label: 'Option with & ampersand', value: 'ampersand' },
    ];

    it('renders options with special characters', () => {
      const { toJSON } = render(
        <FormSelect label="Special" value={null} options={specialOptions} onChange={() => {}} />
      );
      expect(toJSON()).toBeTruthy();
    });

    it('displays selected option with special characters', () => {
      const { toJSON } = render(
        <FormSelect
          label="Special"
          value="ampersand"
          options={specialOptions}
          onChange={() => {}}
        />
      );
      const json = JSON.stringify(toJSON());
      expect(json).toContain('ampersand');
    });
  });

  describe('Value Not Found in Options', () => {
    it('shows placeholder when value does not match any option', () => {
      const { toJSON } = render(
        <FormSelect
          label="Category"
          value="nonexistent"
          options={mockOptions}
          onChange={() => {}}
        />
      );
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Select an option');
    });
  });

  describe('Error Styling', () => {
    it('applies error styling when error is provided', () => {
      const { toJSON } = render(
        <FormSelect
          label="Category"
          value={null}
          options={mockOptions}
          onChange={() => {}}
          error="This field is required"
        />
      );
      const json = JSON.stringify(toJSON());
      // Error text should be present
      expect(json).toContain('This field is required');
    });
  });

  describe('Color Scheme Support', () => {
    it('renders correctly with default color scheme', () => {
      const { toJSON } = render(
        <FormSelect label="Category" value={null} options={mockOptions} onChange={() => {}} />
      );
      expect(toJSON()).toBeTruthy();
    });
  });

  describe('First Option Display', () => {
    it('displays first option label when value matches first option', () => {
      const { toJSON } = render(
        <FormSelect label="Category" value="opt1" options={mockOptions} onChange={() => {}} />
      );
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Option 1');
    });
  });

  describe('Last Option Display', () => {
    it('displays last option label when value matches last option', () => {
      const { toJSON } = render(
        <FormSelect label="Category" value="opt3" options={mockOptions} onChange={() => {}} />
      );
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Option 3');
    });
  });
});
