/**
 * DSL Validator — validates Intervals.icu DSL syntax without calling the API.
 *
 * Catches common errors before attempting to push workouts.
 */

export interface DSLValidationError {
  readonly line: number;
  readonly message: string;
  readonly severity: 'error' | 'warning';
}

export interface DSLValidationResult {
  readonly valid: boolean;
  readonly errors: readonly DSLValidationError[];
  readonly parsedDurationSeconds?: number;
  readonly parsedDistanceMeters?: number;
}

/** Valid time units: seconds, minutes, hours */
const TIME_UNIT_RE = /^(\d+h)?(\d+m)?(\d+s)?$/;

/** Valid distance units: mtr, km, mi */
const DISTANCE_RE = /^(\d+)(mtr|km|mi)$/;

/** Valid target formats */
const TARGET_PATTERNS: readonly RegExp[] = [
  /^\d+-?\d*%$/, // Power %: 75%, 95-105%
  /^\d+-?\d*w$/, // Absolute watts: 220w
  /^Z[1-7]$/, // Zone: Z2
  /^\d+-?\d*%\s+Pace$/, // Pace %: 60% Pace
  /^Z[1-7]\s+Pace$/, // Zone pace: Z2 Pace
  /^\d+:\d{2}\/km\s+Pace$/, // Specific pace: 5:00/km Pace
  /^\d+-?\d*%\s+HR$/, // HR %: 70% HR
  /^Z[1-7]\s+HR$/, // Zone HR: Z2 HR
  /^\d+bpm\s+HR$/, // Absolute HR: 150bpm HR
  /^ramp\s+\d+-\d+%$/, // Ramp: ramp 50-75%
  /^ramp\s+\d+-\d+%\s+(Pace|HR)$/, // Ramp with suffix
  /^freeride$/, // Freeride
  /^rest$/, // Rest
];

/** Maximum reasonable step duration: 5 hours */
const MAX_STEP_SECONDS = 5 * 60 * 60;

/**
 * Parse a duration string (e.g., "10m", "30s", "1h2m30s") to seconds.
 * Returns null if not a valid duration.
 */
function parseDurationToSeconds(raw: string): number | null {
  if (!TIME_UNIT_RE.test(raw)) {
    return null;
  }
  let seconds = 0;
  const hours = raw.match(/(\d+)h/);
  const minutes = raw.match(/(\d+)m/);
  const secs = raw.match(/(\d+)s/);
  if (hours) seconds += Number(hours[1]) * 3600;
  if (minutes) seconds += Number(minutes[1]) * 60;
  if (secs) seconds += Number(secs[1]);
  return seconds > 0 ? seconds : null;
}

/**
 * Parse a distance string (e.g., "400mtr", "2km") to meters.
 * Returns null if not a valid distance.
 */
function parseDistanceToMeters(raw: string): number | null {
  const match = DISTANCE_RE.exec(raw);
  if (!match) return null;
  const value = Number(match[1]);
  const unit = match[2];
  if (unit === 'mtr') return value;
  if (unit === 'km') return value * 1000;
  if (unit === 'mi') return Math.round(value * 1609.34);
  return null;
}

/**
 * Check if a string looks like bare `m` used for meters (ambiguous).
 * E.g., "400m" could be 400 minutes or 400 meters — should be "400mtr".
 */
function hasBareMetersAmbiguity(token: string): boolean {
  // Match digits followed by just 'm' where the value is too large for minutes
  const match = /^(\d+)m$/.exec(token);
  if (!match) return false;
  // Values >= 100 are almost certainly meters, not minutes
  return Number(match[1]) >= 100;
}

/**
 * Check if a target string matches any known valid format.
 */
function isValidTarget(target: string): boolean {
  return TARGET_PATTERNS.some((re) => re.test(target));
}

/**
 * Validate a DSL string.
 */
export function validateDSL(dsl: string): DSLValidationResult {
  const errors: DSLValidationError[] = [];
  let totalDurationSeconds = 0;
  let totalDistanceMeters = 0;

  const trimmed = dsl.trim();
  if (trimmed.length === 0) {
    return {
      valid: false,
      errors: [{ line: 1, message: 'DSL is empty', severity: 'error' }],
    };
  }

  const lines = trimmed.split('\n');
  let hasSection = false;
  let hasStepInSection = false;
  let currentSectionLine = 0;
  let currentSectionName = '';
  let sectionHasRepeat = false;

  for (let i = 0; i < lines.length; i++) {
    const lineNum = i + 1;
    const line = (lines[i] ?? '').trim();

    // Skip empty lines
    if (line.length === 0) {
      // Check if previous section had no steps
      if (hasSection && !hasStepInSection) {
        errors.push({
          line: currentSectionLine,
          message: `Section "${currentSectionName}" has no steps`,
          severity: 'error',
        });
      }
      continue;
    }

    // Step line (starts with "- ")
    if (line.startsWith('- ')) {
      if (!hasSection) {
        errors.push({
          line: lineNum,
          message: 'Step found before any section header',
          severity: 'error',
        });
        continue;
      }

      hasStepInSection = true;
      const stepContent = line.slice(2).trim();
      const tokens = stepContent.split(/\s+/);

      if (tokens.length === 0 || tokens[0] === '') {
        errors.push({
          line: lineNum,
          message: 'Empty step',
          severity: 'error',
        });
        continue;
      }

      // First token should be duration or distance
      const firstToken = tokens[0] ?? '';

      // Check for bare meters ambiguity
      if (hasBareMetersAmbiguity(firstToken)) {
        errors.push({
          line: lineNum,
          message: `Ambiguous "${firstToken}" — use "${firstToken}tr" for meters or ensure minutes is intended`,
          severity: 'error',
        });
      }

      // Try parsing as duration
      const durationSecs = parseDurationToSeconds(firstToken);
      if (durationSecs != null) {
        totalDurationSeconds += durationSecs;
        if (durationSecs > MAX_STEP_SECONDS) {
          errors.push({
            line: lineNum,
            message: `Step duration ${firstToken} exceeds 5 hours — likely an error`,
            severity: 'warning',
          });
        }
      }

      // Try parsing as distance
      const distanceM = parseDistanceToMeters(firstToken);
      if (distanceM != null) {
        totalDistanceMeters += distanceM;
      }

      // If neither duration nor distance, it might be a target-only step (unusual but possible)
      if (durationSecs == null && distanceM == null && !isValidTarget(stepContent)) {
        errors.push({
          line: lineNum,
          message: `Step "${firstToken}" is neither a valid duration nor distance`,
          severity: 'error',
        });
      }

      // Validate target (everything after duration/distance)
      if (tokens.length > 1) {
        const targetStr = tokens.slice(1).join(' ');
        if (!isValidTarget(targetStr)) {
          errors.push({
            line: lineNum,
            message: `Unrecognized target format "${targetStr}"`,
            severity: 'warning',
          });
        }
      }

      continue;
    }

    // Section header line
    // Check if previous section had no steps
    if (hasSection && !hasStepInSection) {
      errors.push({
        line: currentSectionLine,
        message: `Section "${currentSectionName}" has no steps`,
        severity: 'error',
      });
    }

    hasSection = true;
    hasStepInSection = false;
    currentSectionLine = lineNum;

    // Check for repeat count (e.g., "Main Set 4x")
    const repeatMatch = /\s+(\d+)x$/.exec(line);
    sectionHasRepeat = repeatMatch != null;
    currentSectionName = sectionHasRepeat ? line.replace(/\s+\d+x$/, '') : line;
  }

  // Check last section
  if (hasSection && !hasStepInSection) {
    errors.push({
      line: currentSectionLine,
      message: `Section "${currentSectionName}" has no steps`,
      severity: 'error',
    });
  }

  // Check for repeat sections with no steps (already handled above)
  if (!hasSection) {
    errors.push({
      line: 1,
      message: 'No sections found — DSL must have at least one section with steps',
      severity: 'error',
    });
  }

  // Multiply durations/distances for repeat sections
  // (This is a simplification — we'd need section-level tracking for accuracy)

  const hasErrors = errors.some((e) => e.severity === 'error');

  return {
    valid: !hasErrors,
    errors,
    parsedDurationSeconds: totalDurationSeconds > 0 ? totalDurationSeconds : undefined,
    parsedDistanceMeters: totalDistanceMeters > 0 ? totalDistanceMeters : undefined,
  };
}
