import { validateDSL } from '../utils/dsl-validator.js';

describe('validateDSL', () => {
  describe('valid DSL', () => {
    it('accepts a valid bike workout (POWER)', () => {
      const dsl = `Warmup
- 10m ramp 50-75%

Main Set 4x
- 8m 95-105%
- 4m 55%

Cooldown
- 10m 50%`;

      const result = validateDSL(dsl);
      expect(result.valid).toBe(true);
      expect(result.errors.filter((e) => e.severity === 'error')).toHaveLength(0);
    });

    it('accepts a valid run workout (PACE)', () => {
      const dsl = `Warmup
- 10m 65% Pace

Main Set 4x
- 400mtr 90-95% Pace
- 200mtr freeride

Cooldown
- 10m 55% Pace`;

      const result = validateDSL(dsl);
      expect(result.valid).toBe(true);
    });

    it('accepts a valid swim workout (PACE)', () => {
      const dsl = `Warmup
- 300mtr 60% Pace

Main Set 6x
- 100mtr 85-90% Pace
- 30s rest

Cooldown
- 200mtr 55% Pace`;

      const result = validateDSL(dsl);
      expect(result.valid).toBe(true);
    });

    it('parses total duration seconds', () => {
      const dsl = `Warmup
- 10m 50%

Main Set
- 5m 80%

Cooldown
- 5m 50%`;

      const result = validateDSL(dsl);
      expect(result.parsedDurationSeconds).toBe(20 * 60);
    });

    it('parses total distance meters', () => {
      const dsl = `Main Set
- 400mtr 80% Pace
- 2km 70% Pace`;

      const result = validateDSL(dsl);
      expect(result.parsedDistanceMeters).toBe(2400);
    });
  });

  describe('invalid DSL', () => {
    it('rejects empty DSL', () => {
      const result = validateDSL('');
      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toBe('DSL is empty');
    });

    it('rejects whitespace-only DSL', () => {
      const result = validateDSL('   \n  \n  ');
      expect(result.valid).toBe(false);
    });

    it('flags bare "m" for meters (ambiguous)', () => {
      const dsl = `Main Set
- 400m 80%`;

      const result = validateDSL(dsl);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.message.includes('Ambiguous'))).toBe(true);
    });

    it('flags missing step after section header', () => {
      const dsl = `Warmup

Main Set
- 10m 80%`;

      const result = validateDSL(dsl);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.message.includes('has no steps'))).toBe(true);
    });

    it('flags step before any section header', () => {
      const dsl = `- 10m 80%

Main Set
- 5m 90%`;

      const result = validateDSL(dsl);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.message.includes('before any section'))).toBe(true);
    });

    it('flags section header at end with no steps', () => {
      const dsl = `Warmup
- 10m 50%

Cooldown`;

      const result = validateDSL(dsl);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.message.includes('"Cooldown" has no steps'))).toBe(true);
    });

    it('flags DSL with no sections', () => {
      const result = validateDSL('just some text');
      // 'just some text' is treated as a section header with no steps
      expect(result.valid).toBe(false);
    });
  });

  describe('warnings', () => {
    it('warns on unrealistic step duration (>5 hours)', () => {
      const dsl = `Main Set
- 301m 50%`;

      const result = validateDSL(dsl);
      const warnings = result.errors.filter((e) => e.severity === 'warning');
      expect(warnings.some((w) => w.message.includes('exceeds 5 hours'))).toBe(true);
    });

    it('warns on unrecognized target format', () => {
      const dsl = `Main Set
- 10m something-invalid`;

      const result = validateDSL(dsl);
      const warnings = result.errors.filter((e) => e.severity === 'warning');
      expect(warnings.some((w) => w.message.includes('Unrecognized target'))).toBe(true);
    });
  });

  describe('accepts valid target formats', () => {
    const validTargets = [
      '75%',
      '95-105%',
      '220w',
      'Z2',
      '60% Pace',
      'Z2 Pace',
      '5:00/km Pace',
      '70% HR',
      'Z2 HR',
      '150bpm HR',
      'ramp 50-75%',
      'freeride',
      'rest',
    ];

    for (const target of validTargets) {
      it(`accepts target: ${target}`, () => {
        const dsl = `Test\n- 10m ${target}`;
        const result = validateDSL(dsl);
        const targetWarnings = result.errors.filter(
          (e) => e.severity === 'warning' && e.message.includes('Unrecognized target')
        );
        expect(targetWarnings).toHaveLength(0);
      });
    }
  });
});
