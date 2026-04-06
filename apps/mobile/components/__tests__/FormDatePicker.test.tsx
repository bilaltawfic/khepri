import { fireEvent, render } from '@testing-library/react-native';
import {
  CalendarGrid,
  FormDatePicker,
  RangePickerModal,
  SinglePickerModal,
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

// ====================================================================
// CalendarGrid (rendered directly, bypassing Modal)
// ====================================================================

describe('CalendarGrid', () => {
  const makeProps = (overrides = {}) => ({
    currentYear: 2024,
    currentMonth: 5, // June
    colorScheme: 'light' as const,
    isSelected: () => false,
    isInRangeMiddle: () => false,
    onSelectDay: jest.fn(),
    onChangeMonth: jest.fn(),
    ...overrides,
  });

  it('renders weekday headers and days of the month', () => {
    const props = makeProps();
    const { toJSON, getByLabelText } = render(<CalendarGrid {...props} />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Su');
    expect(json).toContain('Fr');
    expect(json).toContain('June');
    expect(json).toContain('2024');
    // June has 30 days
    expect(getByLabelText('June 30')).toBeTruthy();
  });

  it('calls onChangeMonth when navigation arrows are pressed', () => {
    const props = makeProps();
    const { getByLabelText } = render(<CalendarGrid {...props} />);
    fireEvent.press(getByLabelText('Previous month'));
    expect(props.onChangeMonth).toHaveBeenCalledWith(-1);
    fireEvent.press(getByLabelText('Next month'));
    expect(props.onChangeMonth).toHaveBeenCalledWith(1);
  });

  it('calls onSelectDay when a day is pressed', () => {
    const props = makeProps();
    const { getByLabelText } = render(<CalendarGrid {...props} />);
    fireEvent.press(getByLabelText('June 15'));
    expect(props.onSelectDay).toHaveBeenCalledWith(15);
  });

  it('renders disabled days with reduced opacity for dates before minimumDate', () => {
    const props = makeProps({ minimumDate: new Date(2024, 5, 10) });
    const { toJSON } = render(<CalendarGrid {...props} />);
    const json = JSON.stringify(toJSON());
    // Days before min get opacity: 0.3
    expect(json).toContain('"opacity":0.3');
  });

  it('renders disabled days with reduced opacity for dates after maximumDate', () => {
    const props = makeProps({ maximumDate: new Date(2024, 5, 20) });
    const { toJSON } = render(<CalendarGrid {...props} />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('"opacity":0.3');
  });

  it('highlights selected days with primary background color', () => {
    const props = makeProps({ isSelected: (day: number) => day === 15 });
    const { toJSON } = render(<CalendarGrid {...props} />);
    const json = JSON.stringify(toJSON());
    // Selected day gets the light-mode primary color (#1a5f4a → rgba(26,95,74,1.00))
    expect(json).toContain('"backgroundColor":"rgba(26,95,74,1.00)"');
  });

  it('highlights in-range days with translucent primary background', () => {
    const props = makeProps({
      isSelected: (day: number) => day === 10 || day === 20,
      isInRangeMiddle: (day: number) => day > 10 && day < 20,
    });
    const { toJSON } = render(<CalendarGrid {...props} />);
    const json = JSON.stringify(toJSON());
    // Endpoint days get solid primary
    expect(json).toContain('"backgroundColor":"rgba(26,95,74,1.00)"');
    // In-range days get borderRadius styling for the highlight circle
    expect(json).toContain('"borderTopLeftRadius":"16px"');
  });
});

// ====================================================================
// SinglePickerModal (rendered directly, bypassing Modal)
// ====================================================================

describe('SinglePickerModal', () => {
  it('renders calendar showing the value month', () => {
    const { toJSON } = render(
      <SinglePickerModal
        value={new Date(2024, 5, 15)}
        onChange={jest.fn()}
        onClose={jest.fn()}
        colorScheme="light"
      />
    );
    const json = JSON.stringify(toJSON());
    expect(json).toContain('June');
    expect(json).toContain('2024');
    expect(json).toContain('Select Date');
  });

  it('navigates months forward and backward', () => {
    const { getByLabelText, toJSON } = render(
      <SinglePickerModal
        value={new Date(2024, 5, 15)}
        onChange={jest.fn()}
        onClose={jest.fn()}
        colorScheme="light"
      />
    );

    fireEvent.press(getByLabelText('Next month'));
    let json = JSON.stringify(toJSON());
    expect(json).toContain('July');

    fireEvent.press(getByLabelText('Previous month'));
    json = JSON.stringify(toJSON());
    expect(json).toContain('June');
  });

  it('selects a day and calls onChange with normalized date on confirm', () => {
    const mockOnChange = jest.fn();
    const mockOnClose = jest.fn();
    const { getByLabelText } = render(
      <SinglePickerModal
        value={new Date(2024, 5, 15)}
        onChange={mockOnChange}
        onClose={mockOnClose}
        colorScheme="light"
      />
    );

    fireEvent.press(getByLabelText('June 20'));
    fireEvent.press(getByLabelText('Select date'));

    expect(mockOnChange).toHaveBeenCalledTimes(1);
    const selected = mockOnChange.mock.calls[0][0] as Date;
    expect(selected.getFullYear()).toBe(2024);
    expect(selected.getMonth()).toBe(5);
    expect(selected.getDate()).toBe(20);
    expect(selected.getHours()).toBe(0);
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('does not select days outside min/max range', () => {
    const mockOnChange = jest.fn();
    const { getByLabelText } = render(
      <SinglePickerModal
        value={new Date(2024, 5, 15)}
        onChange={mockOnChange}
        onClose={jest.fn()}
        minimumDate={new Date(2024, 5, 10)}
        maximumDate={new Date(2024, 5, 20)}
        colorScheme="light"
      />
    );

    // Tap day outside range, then confirm — should still use the previously selected day
    fireEvent.press(getByLabelText('June 5'));
    fireEvent.press(getByLabelText('Select date'));
    // onChange fires with the initial value (15) since day 5 was rejected
    const selected = mockOnChange.mock.calls[0][0] as Date;
    expect(selected.getDate()).toBe(15);
  });

  it('calls onClose when close button is pressed', () => {
    const mockOnClose = jest.fn();
    const { getByLabelText } = render(
      <SinglePickerModal
        value={null}
        onChange={jest.fn()}
        onClose={mockOnClose}
        colorScheme="light"
      />
    );

    fireEvent.press(getByLabelText('Close'));
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('starts on minimumDate month when value is null and now is before minimumDate', () => {
    const futureMin = new Date(2030, 0, 15);
    const { toJSON } = render(
      <SinglePickerModal
        value={null}
        onChange={jest.fn()}
        onClose={jest.fn()}
        minimumDate={futureMin}
        colorScheme="light"
      />
    );
    const json = JSON.stringify(toJSON());
    expect(json).toContain('January');
    expect(json).toContain('2030');
  });
});

// ====================================================================
// RangePickerModal (rendered directly, bypassing Modal)
// ====================================================================

describe('RangePickerModal', () => {
  it('shows hint text when no dates are selected', () => {
    const { toJSON } = render(
      <RangePickerModal
        rangeStart={null}
        rangeEnd={null}
        onSelect={jest.fn()}
        onClose={jest.fn()}
        colorScheme="light"
      />
    );
    const json = JSON.stringify(toJSON());
    expect(json).toContain('Select Date Range');
    expect(json).toContain('Tap a start date');
  });

  it('selects start and end dates then calls onSelect', () => {
    const mockOnSelect = jest.fn();
    const mockOnClose = jest.fn();
    // Use maximumDate to anchor the calendar to June 2024 (now > max → view starts on max month)
    const { getByLabelText } = render(
      <RangePickerModal
        rangeStart={null}
        rangeEnd={null}
        onSelect={mockOnSelect}
        onClose={mockOnClose}
        maximumDate={new Date(2024, 5, 30)}
        colorScheme="light"
      />
    );

    // First tap sets start, second tap sets end
    fireEvent.press(getByLabelText('June 12'));
    fireEvent.press(getByLabelText('June 18'));
    fireEvent.press(getByLabelText('Select date range'));

    expect(mockOnSelect).toHaveBeenCalledTimes(1);
    const [start, end] = mockOnSelect.mock.calls[0] as [Date, Date];
    expect(start.getDate()).toBe(12);
    expect(end.getDate()).toBe(18);
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('auto-swaps when tapping a date before the current start', () => {
    const mockOnSelect = jest.fn();
    // Pre-set start to June 15 — no end, so next tap after start sets end
    // But we want to test swap: tap a new start (20), then tap before it (10)
    const { getByLabelText } = render(
      <RangePickerModal
        rangeStart={null}
        rangeEnd={null}
        onSelect={mockOnSelect}
        onClose={jest.fn()}
        maximumDate={new Date(2024, 5, 30)}
        colorScheme="light"
      />
    );

    // Tap June 20 (becomes start), then June 10 (before start → auto-swap)
    fireEvent.press(getByLabelText('June 20'));
    fireEvent.press(getByLabelText('June 10'));
    fireEvent.press(getByLabelText('Select date range'));

    const [start, end] = mockOnSelect.mock.calls[0] as [Date, Date];
    expect(start.getDate()).toBe(10);
    expect(end.getDate()).toBe(20);
  });

  it('resets selection when tapping a third day after both are set', () => {
    const mockOnSelect = jest.fn();
    const { getByLabelText } = render(
      <RangePickerModal
        rangeStart={null}
        rangeEnd={null}
        onSelect={mockOnSelect}
        onClose={jest.fn()}
        maximumDate={new Date(2024, 5, 30)}
        colorScheme="light"
      />
    );

    // Select start and end
    fireEvent.press(getByLabelText('June 12'));
    fireEvent.press(getByLabelText('June 18'));
    // Third tap resets — June 25 becomes new start, end cleared
    fireEvent.press(getByLabelText('June 25'));
    fireEvent.press(getByLabelText('Select date range'));

    const [start, end] = mockOnSelect.mock.calls[0] as [Date, Date];
    // When only start set, onSelect normalizes end = start
    expect(start.getDate()).toBe(25);
    expect(end.getDate()).toBe(25);
  });

  it('shows hint text updating through the selection flow', () => {
    const { getByLabelText, toJSON } = render(
      <RangePickerModal
        rangeStart={null}
        rangeEnd={null}
        onSelect={jest.fn()}
        onClose={jest.fn()}
        maximumDate={new Date(2024, 5, 30)}
        colorScheme="light"
      />
    );

    // After tapping start, hint should prompt for end date
    fireEvent.press(getByLabelText('June 15'));
    let json = JSON.stringify(toJSON());
    expect(json).toContain('tap end date');

    // After tapping end, hint should show formatted range
    fireEvent.press(getByLabelText('June 20'));
    json = JSON.stringify(toJSON());
    expect(json).toContain('–');
  });

  it('navigates months', () => {
    const { getByLabelText, toJSON } = render(
      <RangePickerModal
        rangeStart={new Date(2024, 5, 10)}
        rangeEnd={null}
        onSelect={jest.fn()}
        onClose={jest.fn()}
        colorScheme="light"
      />
    );

    let json = JSON.stringify(toJSON());
    expect(json).toContain('June');
    expect(json).toContain('2024');
    fireEvent.press(getByLabelText('Next month'));
    json = JSON.stringify(toJSON());
    expect(json).toContain('July');
  });

  it('does not call onSelect when start is null and button is pressed', () => {
    const mockOnSelect = jest.fn();
    const { getByLabelText } = render(
      <RangePickerModal
        rangeStart={null}
        rangeEnd={null}
        onSelect={mockOnSelect}
        onClose={jest.fn()}
        colorScheme="light"
      />
    );

    fireEvent.press(getByLabelText('Select date range'));
    expect(mockOnSelect).not.toHaveBeenCalled();
  });

  it('ignores day taps outside min/max constraints', () => {
    const mockOnSelect = jest.fn();
    const { getByLabelText } = render(
      <RangePickerModal
        rangeStart={null}
        rangeEnd={null}
        onSelect={mockOnSelect}
        onClose={jest.fn()}
        minimumDate={new Date(2024, 5, 10)}
        maximumDate={new Date(2024, 5, 20)}
        colorScheme="light"
      />
    );

    // Tap day within range as start
    fireEvent.press(getByLabelText('June 12'));
    // Tap day outside range — should be ignored, no end set
    fireEvent.press(getByLabelText('June 25'));
    fireEvent.press(getByLabelText('Select date range'));

    // Only start was set (12), end defaults to same as start
    const [start, end] = mockOnSelect.mock.calls[0] as [Date, Date];
    expect(start.getDate()).toBe(12);
    expect(end.getDate()).toBe(12);
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
