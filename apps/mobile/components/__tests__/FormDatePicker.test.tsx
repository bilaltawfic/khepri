import { fireEvent, render } from '@testing-library/react-native';
import {
  FormDatePicker,
  formatDate,
  formatDateRange,
  isDateInRange,
  isRangeEndpoint,
  isSameDay,
  normalizeToStartOfDay,
} from '../FormDatePicker';

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

  // Note: Modal interaction tests are skipped because React Native Modal
  // doesn't work reliably with jest-expo/web test renderer. Modal behavior
  // should be verified via E2E tests.
});

// ====================================================================
// Range Mode
// ====================================================================

describe('FormDatePicker (range mode)', () => {
  describe('Basic Rendering', () => {
    it('renders without crashing', () => {
      const { toJSON } = render(
        <FormDatePicker
          mode="range"
          label="Dates"
          rangeStart={null}
          rangeEnd={null}
          onRangeSelect={() => {}}
        />
      );
      expect(toJSON()).toBeTruthy();
    });

    it('renders the label', () => {
      const { toJSON } = render(
        <FormDatePicker
          mode="range"
          label="Date range"
          rangeStart={null}
          rangeEnd={null}
          onRangeSelect={() => {}}
        />
      );
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Date range');
    });

    it('renders placeholder when no range is selected', () => {
      const { toJSON } = render(
        <FormDatePicker
          mode="range"
          label="Dates"
          rangeStart={null}
          rangeEnd={null}
          onRangeSelect={() => {}}
          placeholder="Tap to select dates"
        />
      );
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Tap to select dates');
    });

    it('uses default placeholder when not specified', () => {
      const { toJSON } = render(
        <FormDatePicker
          mode="range"
          label="Dates"
          rangeStart={null}
          rangeEnd={null}
          onRangeSelect={() => {}}
        />
      );
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Select a date');
    });

    it('renders calendar icon', () => {
      const { toJSON } = render(
        <FormDatePicker
          mode="range"
          label="Dates"
          rangeStart={null}
          rangeEnd={null}
          onRangeSelect={() => {}}
        />
      );
      const json = JSON.stringify(toJSON());
      expect(json).toContain('calendar-outline');
    });
  });

  describe('Display Text', () => {
    it('shows single date when start equals end', () => {
      const date = new Date(2024, 5, 15); // June 15
      const { toJSON } = render(
        <FormDatePicker
          mode="range"
          label="Dates"
          rangeStart={date}
          rangeEnd={date}
          onRangeSelect={() => {}}
        />
      );
      const json = JSON.stringify(toJSON());
      expect(json).toContain('June');
      expect(json).toContain('15');
      expect(json).toContain('2024');
    });

    it('shows date range when start and end differ', () => {
      const start = new Date(2024, 5, 10); // June 10
      const end = new Date(2024, 5, 15); // June 15
      const { toJSON } = render(
        <FormDatePicker
          mode="range"
          label="Dates"
          rangeStart={start}
          rangeEnd={end}
          onRangeSelect={() => {}}
        />
      );
      const json = JSON.stringify(toJSON());
      expect(json).toContain('June');
      expect(json).toContain('10');
      expect(json).toContain('15');
    });

    it('shows start date when only start is provided', () => {
      const start = new Date(2024, 5, 10);
      const { toJSON } = render(
        <FormDatePicker
          mode="range"
          label="Dates"
          rangeStart={start}
          rangeEnd={null}
          onRangeSelect={() => {}}
        />
      );
      const json = JSON.stringify(toJSON());
      expect(json).toContain('June');
      expect(json).toContain('10');
    });
  });

  describe('Accessibility', () => {
    it('has correct accessibility label with placeholder', () => {
      const { getByLabelText } = render(
        <FormDatePicker
          mode="range"
          label="Dates"
          rangeStart={null}
          rangeEnd={null}
          onRangeSelect={() => {}}
          placeholder="Pick dates"
        />
      );
      expect(getByLabelText('Dates: Pick dates')).toBeTruthy();
    });

    it('has correct accessibility label with range selected', () => {
      const start = new Date(2024, 5, 10);
      const end = new Date(2024, 5, 15);
      const { getByLabelText } = render(
        <FormDatePicker
          mode="range"
          label="Dates"
          rangeStart={start}
          rangeEnd={end}
          onRangeSelect={() => {}}
        />
      );
      expect(getByLabelText(/Dates: June/)).toBeTruthy();
    });
  });

  describe('Error and Help Text', () => {
    it('displays error message', () => {
      const { toJSON } = render(
        <FormDatePicker
          mode="range"
          label="Dates"
          rangeStart={null}
          rangeEnd={null}
          onRangeSelect={() => {}}
          error="Please select dates"
        />
      );
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Please select dates');
    });

    it('displays help text', () => {
      const { toJSON } = render(
        <FormDatePicker
          mode="range"
          label="Dates"
          rangeStart={null}
          rangeEnd={null}
          onRangeSelect={() => {}}
          helpText="Select your vacation dates"
        />
      );
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Select your vacation dates');
    });

    it('does not display help text when error is present', () => {
      const { toJSON } = render(
        <FormDatePicker
          mode="range"
          label="Dates"
          rangeStart={null}
          rangeEnd={null}
          onRangeSelect={() => {}}
          error="Required"
          helpText="Select dates"
        />
      );
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Required');
      expect(json).not.toContain('Select dates');
    });
  });

  describe('Clear Button', () => {
    it('shows clear button when allowClear and range is selected', () => {
      const start = new Date(2024, 5, 10);
      const end = new Date(2024, 5, 15);
      const { toJSON } = render(
        <FormDatePicker
          mode="range"
          label="Dates"
          rangeStart={start}
          rangeEnd={end}
          onRangeSelect={() => {}}
          allowClear
        />
      );
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Clear date');
    });

    it('does not show clear button when no range selected', () => {
      const { toJSON } = render(
        <FormDatePicker
          mode="range"
          label="Dates"
          rangeStart={null}
          rangeEnd={null}
          onRangeSelect={() => {}}
          allowClear
        />
      );
      const json = JSON.stringify(toJSON());
      expect(json).not.toContain('Clear date');
    });

    it('calls onRangeSelect with nulls when clear button is pressed', () => {
      const mockOnRangeSelect = jest.fn();
      const start = new Date(2024, 5, 10);
      const end = new Date(2024, 5, 15);
      const { getByLabelText } = render(
        <FormDatePicker
          mode="range"
          label="Dates"
          rangeStart={start}
          rangeEnd={end}
          onRangeSelect={mockOnRangeSelect}
          allowClear
        />
      );

      fireEvent.press(getByLabelText('Clear date'));
      expect(mockOnRangeSelect).toHaveBeenCalledWith(null, null);
    });
  });

  // Note: Modal interaction tests (calendar grid, day selection, month navigation,
  // range selection/swap, onRangeSelect callback) are not included because React
  // Native Modal doesn't work reliably with jest-expo/web test renderer. Calendar
  // interaction is tested via mock-based integration tests in block-setup.test.tsx
  // and races.test.tsx. Full modal behavior should be verified via E2E tests.
});

// ====================================================================
// Range Logic Unit Tests
// ====================================================================

describe('normalizeToStartOfDay', () => {
  it('strips time component from date', () => {
    const date = new Date(2024, 5, 15, 14, 30, 45, 500);
    const normalized = normalizeToStartOfDay(date);
    expect(normalized.getHours()).toBe(0);
    expect(normalized.getMinutes()).toBe(0);
    expect(normalized.getSeconds()).toBe(0);
    expect(normalized.getMilliseconds()).toBe(0);
    expect(normalized.getFullYear()).toBe(2024);
    expect(normalized.getMonth()).toBe(5);
    expect(normalized.getDate()).toBe(15);
  });

  it('is idempotent — normalizing an already-normalized date returns same value', () => {
    const date = new Date(2024, 0, 1);
    const first = normalizeToStartOfDay(date);
    const second = normalizeToStartOfDay(first);
    expect(first.getTime()).toBe(second.getTime());
  });
});

describe('isSameDay', () => {
  it('returns true for same date with different times', () => {
    const a = new Date(2024, 5, 15, 8, 0);
    const b = new Date(2024, 5, 15, 20, 30);
    expect(isSameDay(a, b)).toBe(true);
  });

  it('returns false for consecutive days', () => {
    const a = new Date(2024, 5, 15);
    const b = new Date(2024, 5, 16);
    expect(isSameDay(a, b)).toBe(false);
  });

  it('returns false for same day in different months', () => {
    const a = new Date(2024, 5, 15);
    const b = new Date(2024, 6, 15);
    expect(isSameDay(a, b)).toBe(false);
  });

  it('returns false for same day/month in different years', () => {
    const a = new Date(2024, 5, 15);
    const b = new Date(2025, 5, 15);
    expect(isSameDay(a, b)).toBe(false);
  });
});

describe('isDateInRange', () => {
  const jan10 = new Date(2024, 0, 10);
  const jan15 = new Date(2024, 0, 15);
  const jan20 = new Date(2024, 0, 20);

  it('returns false when start is null', () => {
    expect(isDateInRange(jan15, null, jan20)).toBe(false);
  });

  it('matches only the start date when end is null', () => {
    expect(isDateInRange(jan10, jan10, null)).toBe(true);
    expect(isDateInRange(jan15, jan10, null)).toBe(false);
  });

  it('includes start and end dates in the range', () => {
    expect(isDateInRange(jan10, jan10, jan20)).toBe(true);
    expect(isDateInRange(jan20, jan10, jan20)).toBe(true);
  });

  it('includes dates between start and end', () => {
    expect(isDateInRange(jan15, jan10, jan20)).toBe(true);
  });

  it('excludes dates before start', () => {
    const jan5 = new Date(2024, 0, 5);
    expect(isDateInRange(jan5, jan10, jan20)).toBe(false);
  });

  it('excludes dates after end', () => {
    const jan25 = new Date(2024, 0, 25);
    expect(isDateInRange(jan25, jan10, jan20)).toBe(false);
  });

  it('handles single-day range (start equals end)', () => {
    expect(isDateInRange(jan10, jan10, jan10)).toBe(true);
    expect(isDateInRange(jan15, jan10, jan10)).toBe(false);
  });
});

describe('isRangeEndpoint', () => {
  const jan10 = new Date(2024, 0, 10);
  const jan15 = new Date(2024, 0, 15);
  const jan20 = new Date(2024, 0, 20);

  it('identifies start date as endpoint', () => {
    expect(isRangeEndpoint(jan10, jan10, jan20)).toBe(true);
  });

  it('identifies end date as endpoint', () => {
    expect(isRangeEndpoint(jan20, jan10, jan20)).toBe(true);
  });

  it('does not flag mid-range dates as endpoints', () => {
    expect(isRangeEndpoint(jan15, jan10, jan20)).toBe(false);
  });

  it('returns false when both start and end are null', () => {
    expect(isRangeEndpoint(jan15, null, null)).toBe(false);
  });

  it('identifies date matching start even when end is null', () => {
    expect(isRangeEndpoint(jan10, jan10, null)).toBe(true);
  });
});

describe('formatDateRange', () => {
  it('returns empty string when start is null', () => {
    expect(formatDateRange(null, null)).toBe('');
    expect(formatDateRange(null, new Date(2024, 5, 15))).toBe('');
  });

  it('returns single date string when end is null', () => {
    const result = formatDateRange(new Date(2024, 5, 15), null);
    expect(result).toContain('June');
    expect(result).toContain('15');
    expect(result).toContain('2024');
  });

  it('returns single date string when start equals end', () => {
    const date = new Date(2024, 5, 15);
    const result = formatDateRange(date, date);
    expect(result).toContain('June');
    // Should NOT contain an en-dash since it's a single day
    expect(result).not.toContain('–');
  });

  it('returns range string with en-dash when start and end differ', () => {
    const start = new Date(2024, 5, 10);
    const end = new Date(2024, 5, 20);
    const result = formatDateRange(start, end);
    expect(result).toContain('–');
    expect(result).toContain('10');
    expect(result).toContain('20');
  });
});

describe('formatDate', () => {
  it('returns empty string for null', () => {
    expect(formatDate(null)).toBe('');
  });

  it('formats a date in long US format', () => {
    const result = formatDate(new Date(2024, 0, 1));
    expect(result).toContain('January');
    expect(result).toContain('1');
    expect(result).toContain('2024');
  });
});

describe('FormDatePicker range clear produces real null state', () => {
  it('clears to null, not epoch sentinel — hasValue becomes false', () => {
    const mockOnRangeSelect = jest.fn();
    const start = new Date(2024, 5, 10);
    const end = new Date(2024, 5, 15);

    const { getByLabelText, rerender, toJSON } = render(
      <FormDatePicker
        mode="range"
        label="Dates"
        rangeStart={start}
        rangeEnd={end}
        onRangeSelect={mockOnRangeSelect}
        allowClear
      />
    );

    // Clear the range
    fireEvent.press(getByLabelText('Clear date'));
    expect(mockOnRangeSelect).toHaveBeenCalledWith(null, null);

    // Simulate parent updating state to null
    rerender(
      <FormDatePicker
        mode="range"
        label="Dates"
        rangeStart={null}
        rangeEnd={null}
        onRangeSelect={mockOnRangeSelect}
        allowClear
      />
    );

    // After clearing, should show placeholder (not epoch date), and no clear button
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Select a date');
    expect(json).not.toContain('Clear date');
    expect(json).not.toContain('1970');
  });
});
