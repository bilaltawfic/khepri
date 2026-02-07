import { render } from '@testing-library/react-native';
import { FormSelect } from '../FormSelect';

const mockOptions = [
  { label: 'Option 1', value: 'opt1' },
  { label: 'Option 2', value: 'opt2' },
  { label: 'Option 3', value: 'opt3' },
];

describe('FormSelect', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(
      <FormSelect label="Test Label" value={null} options={mockOptions} onChange={() => {}} />
    );
    expect(toJSON()).toBeTruthy();
  });

  it('renders the label', () => {
    const { toJSON } = render(
      <FormSelect label="Select Category" value={null} options={mockOptions} onChange={() => {}} />
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

  it('renders selected option label when value is provided', () => {
    const { toJSON } = render(
      <FormSelect label="Category" value="opt2" options={mockOptions} onChange={() => {}} />
    );
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Option 2');
  });

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

  it('has correct accessibility label with placeholder', () => {
    const { toJSON } = render(
      <FormSelect label="Category" value={null} options={mockOptions} onChange={() => {}} />
    );
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Category: Select an option');
  });
});
