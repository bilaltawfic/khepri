import {
  EVENT_SCHEMA_PROPERTIES,
  VALID_EVENT_TYPES,
  VALID_PRIORITIES,
  buildEventPayload,
  formatEventResponse,
  isIso8601,
  normalizeEventType,
  validateDateField,
  validateEventType,
  validateNonNegativeNumber,
  validatePriority,
} from '../event-validation.ts';

describe('event-validation', () => {
  // ---------------------------------------------------------------------------
  // Constants
  // ---------------------------------------------------------------------------
  describe('constants', () => {
    it('VALID_EVENT_TYPES contains all expected types', () => {
      expect(VALID_EVENT_TYPES.has('WORKOUT')).toBe(true);
      expect(VALID_EVENT_TYPES.has('RACE')).toBe(true);
      expect(VALID_EVENT_TYPES.has('NOTE')).toBe(true);
      expect(VALID_EVENT_TYPES.has('REST_DAY')).toBe(true);
      expect(VALID_EVENT_TYPES.has('TRAVEL')).toBe(true);
      expect(VALID_EVENT_TYPES.size).toBe(5);
    });

    it('VALID_PRIORITIES contains A, B, C', () => {
      expect(VALID_PRIORITIES.has('A')).toBe(true);
      expect(VALID_PRIORITIES.has('B')).toBe(true);
      expect(VALID_PRIORITIES.has('C')).toBe(true);
      expect(VALID_PRIORITIES.size).toBe(3);
    });

    it('isIso8601 matches valid date formats', () => {
      expect(isIso8601('2026-02-20')).toBe(true);
      expect(isIso8601('2026-02-20T07:00')).toBe(true);
      expect(isIso8601('2026-02-20T07:00:00')).toBe(true);
    });

    it('isIso8601 matches Z suffix and timezone offsets', () => {
      expect(isIso8601('2026-02-20T07:00:00Z')).toBe(true);
      expect(isIso8601('2026-02-20T07:00:00+05:30')).toBe(true);
      expect(isIso8601('2026-02-20T07:00:00-04:00')).toBe(true);
      expect(isIso8601('2026-02-20T07:00:00.123Z')).toBe(true);
      expect(isIso8601('2026-02-20T07:00:00.123+0530')).toBe(true);
    });

    it('isIso8601 rejects invalid formats', () => {
      expect(isIso8601('not-a-date')).toBe(false);
      expect(isIso8601('2026/02/20')).toBe(false);
      expect(isIso8601('')).toBe(false);
    });

    it('EVENT_SCHEMA_PROPERTIES has all expected fields', () => {
      const keys = Object.keys(EVENT_SCHEMA_PROPERTIES);
      expect(keys).toContain('name');
      expect(keys).toContain('type');
      expect(keys).toContain('start_date_local');
      expect(keys).toContain('distance');
      expect(keys).toContain('indoor');
      expect(keys).toContain('event_priority');
    });
  });

  // ---------------------------------------------------------------------------
  // validateEventType
  // ---------------------------------------------------------------------------
  describe('validateEventType', () => {
    it.each(['WORKOUT', 'RACE', 'NOTE', 'REST_DAY', 'TRAVEL'])(
      'returns null for valid type %s',
      (type) => {
        expect(validateEventType(type)).toBeNull();
      }
    );

    it.each(['workout', 'race', 'note', 'rest_day', 'travel'])(
      'returns null for lowercase type %s',
      (type) => {
        expect(validateEventType(type)).toBeNull();
      }
    );

    it('returns null for mixed-case type', () => {
      expect(validateEventType('Workout')).toBeNull();
    });

    it('returns error for invalid type', () => {
      const result = validateEventType('INVALID');
      expect(result).not.toBeNull();
      expect(result?.success).toBe(false);
      if (result?.success !== false) return;
      expect(result.code).toBe('INVALID_EVENT_TYPE');
    });

    it('returns error for non-string type', () => {
      expect(validateEventType(42)).not.toBeNull();
      expect(validateEventType(undefined)).not.toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // normalizeEventType
  // ---------------------------------------------------------------------------
  describe('normalizeEventType', () => {
    it('converts lowercase to uppercase', () => {
      expect(normalizeEventType('workout')).toBe('WORKOUT');
    });

    it('keeps uppercase as uppercase', () => {
      expect(normalizeEventType('RACE')).toBe('RACE');
    });

    it('converts mixed-case to uppercase', () => {
      expect(normalizeEventType('Rest_Day')).toBe('REST_DAY');
    });
  });

  // ---------------------------------------------------------------------------
  // validateDateField
  // ---------------------------------------------------------------------------
  describe('validateDateField', () => {
    it('returns null for valid date-only string', () => {
      expect(validateDateField('2026-02-20', 'test_field', false)).toBeNull();
    });

    it('returns null for valid datetime string', () => {
      expect(validateDateField('2026-02-20T07:00:00', 'test_field', false)).toBeNull();
    });

    it('returns null for null optional field', () => {
      expect(validateDateField(null, 'test_field', false)).toBeNull();
      expect(validateDateField(undefined, 'test_field', false)).toBeNull();
    });

    it('returns error for null required field', () => {
      const result = validateDateField(null, 'test_field', true);
      expect(result).not.toBeNull();
      expect(result?.success).toBe(false);
      if (result?.success !== false) return;
      expect(result.code).toBe('INVALID_DATE');
      expect(result.error).toContain('test_field');
    });

    it('returns error for invalid format', () => {
      const result = validateDateField('bad-date', 'test_field', false);
      expect(result).not.toBeNull();
      expect(result?.success).toBe(false);
      if (result?.success !== false) return;
      expect(result.code).toBe('INVALID_DATE');
    });

    it('returns error for non-string value', () => {
      expect(validateDateField(12345, 'test_field', false)).not.toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // validatePriority
  // ---------------------------------------------------------------------------
  describe('validatePriority', () => {
    it.each(['A', 'B', 'C'])('returns null for valid priority %s', (p) => {
      expect(validatePriority(p)).toBeNull();
    });

    it('returns null when priority is null/undefined', () => {
      expect(validatePriority(null)).toBeNull();
      expect(validatePriority(undefined)).toBeNull();
    });

    it('returns error for invalid priority', () => {
      const result = validatePriority('X');
      expect(result).not.toBeNull();
      expect(result?.success).toBe(false);
      if (result?.success !== false) return;
      expect(result.code).toBe('INVALID_PRIORITY');
    });
  });

  // ---------------------------------------------------------------------------
  // validateNonNegativeNumber
  // ---------------------------------------------------------------------------
  describe('validateNonNegativeNumber', () => {
    it('returns null for positive numbers', () => {
      expect(validateNonNegativeNumber(100, 'field')).toBeNull();
    });

    it('returns null for zero', () => {
      expect(validateNonNegativeNumber(0, 'field')).toBeNull();
    });

    it('returns null when value is null/undefined', () => {
      expect(validateNonNegativeNumber(null, 'field')).toBeNull();
      expect(validateNonNegativeNumber(undefined, 'field')).toBeNull();
    });

    it('returns error for negative numbers', () => {
      const result = validateNonNegativeNumber(-1, 'field');
      expect(result).not.toBeNull();
      expect(result?.success).toBe(false);
      if (result?.success !== false) return;
      expect(result.code).toBe('INVALID_INPUT');
      expect(result.error).toContain('field');
    });

    it('includes unit in error message when provided', () => {
      const result = validateNonNegativeNumber(-1, 'distance', 'meters');
      expect(result).not.toBeNull();
      if (result?.success !== false) return;
      expect(result.error).toContain('meters');
    });

    it('returns error for NaN', () => {
      const result = validateNonNegativeNumber(Number.NaN, 'field');
      expect(result).not.toBeNull();
      expect(result?.success).toBe(false);
      if (result?.success !== false) return;
      expect(result.code).toBe('INVALID_INPUT');
    });

    it('returns error for Infinity', () => {
      const result = validateNonNegativeNumber(Number.POSITIVE_INFINITY, 'field');
      expect(result).not.toBeNull();
      expect(result?.success).toBe(false);
      if (result?.success !== false) return;
      expect(result.code).toBe('INVALID_INPUT');
    });

    it('returns error for negative Infinity', () => {
      expect(validateNonNegativeNumber(Number.NEGATIVE_INFINITY, 'field')).not.toBeNull();
    });

    it('returns error for non-number types', () => {
      expect(validateNonNegativeNumber('100', 'field')).not.toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // buildEventPayload
  // ---------------------------------------------------------------------------
  describe('buildEventPayload', () => {
    it('includes string fields present in input', () => {
      const payload = buildEventPayload(
        { name: 'Test', type: 'WORKOUT', description: 'Notes' },
        new Set(['name', 'type'])
      );
      expect(payload).toEqual({ name: 'Test', type: 'WORKOUT', description: 'Notes' });
    });

    it('includes number fields present in input', () => {
      const payload = buildEventPayload(
        { name: 'Ride', moving_time: 3600, distance: 30000 },
        new Set(['name'])
      );
      expect(payload).toHaveProperty('moving_time', 3600);
      expect(payload).toHaveProperty('distance', 30000);
    });

    it('includes boolean fields present in input', () => {
      const payload = buildEventPayload({ name: 'Ride', indoor: true }, new Set(['name']));
      expect(payload).toHaveProperty('indoor', true);
    });

    it('excludes undefined/null fields', () => {
      const payload = buildEventPayload(
        { name: 'Test', type: 'WORKOUT', description: undefined, distance: null },
        new Set(['name', 'type'])
      );
      expect(Object.keys(payload)).toEqual(['name', 'type']);
    });

    it('returns empty object when no matching fields', () => {
      const payload = buildEventPayload({}, new Set());
      expect(payload).toEqual({});
    });

    it('includes number zero', () => {
      const payload = buildEventPayload({ moving_time: 0 }, new Set());
      expect(payload).toHaveProperty('moving_time', 0);
    });

    it('includes boolean false', () => {
      const payload = buildEventPayload({ indoor: false }, new Set());
      expect(payload).toHaveProperty('indoor', false);
    });

    it('normalizes type to uppercase', () => {
      const payload = buildEventPayload(
        { name: 'Test', type: 'workout' },
        new Set(['name', 'type'])
      );
      expect(payload).toHaveProperty('type', 'WORKOUT');
    });
  });

  // ---------------------------------------------------------------------------
  // formatEventResponse
  // ---------------------------------------------------------------------------
  describe('formatEventResponse', () => {
    const mockEvent = {
      id: 42,
      name: 'Test Event',
      type: 'WORKOUT',
      start_date_local: '2026-02-20T07:00:00',
      end_date_local: undefined,
      description: 'Some notes',
      category: 'Ride',
      moving_time: 3600,
      icu_training_load: 50,
      distance: 30000,
      indoor: false,
      event_priority: 'B',
    };

    it('formats created response with all fields', () => {
      const result = formatEventResponse(mockEvent, 'created');
      expect(result.success).toBe(true);
      expect(result.data.event.id).toBe('42');
      expect(result.data.event.name).toBe('Test Event');
      expect(result.data.event.type).toBe('WORKOUT');
      expect(result.data.event.moving_time).toBe(3600);
      expect(result.data.message).toBe('Event "Test Event" created successfully');
    });

    it('formats updated response', () => {
      const result = formatEventResponse(mockEvent, 'updated');
      expect(result.data.message).toBe('Event "Test Event" updated successfully');
    });

    it('converts numeric id to string', () => {
      const result = formatEventResponse({ ...mockEvent, id: 999 }, 'created');
      expect(result.data.event.id).toBe('999');
    });
  });
});
