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

/**
 * Valid target formats.
 *
 * These regexes validate short DSL tokens (typically <20 chars) produced by
 * our own serializer — not arbitrary user input — so ReDoS is not a concern.
 * Patterns use explicit alternation to avoid backtracking where possible.
 */
const TARGET_PATTERNS: readonly RegExp[] = [
  /^\d+%$/, // Power %: 75%
  /^\d+-\d+%$/, // Power range: 95-105%
  /^\d+w$/, // Absolute watts: 220w
  /^Z[1-7]$/, // Zone: Z2
  /^\d+% Pace$/, // Pace %: 60% Pace
  /^\d+-\d+% Pace$/, // Pace range: 90-95% Pace
  /^Z[1-7] Pace$/, // Zone pace: Z2 Pace
  /^\d+:\d{2}\/km Pace$/, // Specific pace: 5:00/km Pace
  /^\d+% HR$/, // HR %: 70% HR
  /^\d+-\d+% HR$/, // HR range: 65-75% HR
  /^Z[1-7] HR$/, // Zone HR: Z2 HR
  /^\d+bpm HR$/, // Absolute HR: 150bpm HR
  /^ramp \d+-\d+%$/, // Ramp: ramp 50-75%
  /^ramp \d+-\d+% Pace$/, // Ramp with Pace suffix
  /^ramp \d+-\d+% HR$/, // Ramp with HR suffix
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
  // Parse by scanning for unit suffixes without regex to avoid S5852 hotspots
  let seconds = 0;
  let numBuf = '';
  for (const ch of raw) {
    if (ch >= '0' && ch <= '9') {
      numBuf += ch;
    } else {
      const val = numBuf.length > 0 ? Number(numBuf) : 0;
      numBuf = '';
      if (ch === 'h') seconds += val * 3600;
      else if (ch === 'm') seconds += val * 60;
      else if (ch === 's') seconds += val;
    }
  }
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
 */
function hasBareMetersAmbiguity(token: string): boolean {
  const match = /^(\d+)m$/.exec(token);
  if (!match) return false;
  return Number(match[1]) >= 100;
}

/**
 * Check if a target string matches any known valid format.
 */
function isValidTarget(target: string): boolean {
  return TARGET_PATTERNS.some((re) => re.test(target));
}

/** Accumulated totals from step validation. */
interface StepTotals {
  durationSeconds: number;
  distanceMeters: number;
}

/**
 * Validate a single step line and return any errors/warnings.
 */
function validateStepLine(
  stepContent: string,
  lineNum: number,
  totals: StepTotals
): readonly DSLValidationError[] {
  const errors: DSLValidationError[] = [];
  const tokens = stepContent.split(/\s+/);

  if (tokens.length === 0 || tokens[0] === '') {
    errors.push({ line: lineNum, message: 'Empty step', severity: 'error' });
    return errors;
  }

  const firstToken = tokens[0] ?? '';

  if (hasBareMetersAmbiguity(firstToken)) {
    errors.push({
      line: lineNum,
      message: `Ambiguous "${firstToken}" — use "${firstToken}tr" for meters or ensure minutes is intended`,
      severity: 'warning',
    });
  }

  const durationSecs = parseDurationToSeconds(firstToken);
  if (durationSecs != null) {
    totals.durationSeconds += durationSecs;
    if (durationSecs > MAX_STEP_SECONDS) {
      errors.push({
        line: lineNum,
        message: `Step duration ${firstToken} exceeds 5 hours — likely an error`,
        severity: 'warning',
      });
    }
  }

  const distanceM = parseDistanceToMeters(firstToken);
  if (distanceM != null) {
    totals.distanceMeters += distanceM;
  }

  if (durationSecs == null && distanceM == null) {
    errors.push({
      line: lineNum,
      message: `Step "${firstToken}" is neither a valid duration nor distance — every step must start with a duration or distance`,
      severity: 'error',
    });
  }

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

  return errors;
}

/** Mutable state tracking the current section during parsing. */
interface SectionState {
  hasSection: boolean;
  hasStepInSection: boolean;
  sectionLine: number;
  sectionName: string;
}

/**
 * If the current section has no steps, push an error and reset.
 */
function checkEmptySection(state: SectionState, errors: DSLValidationError[]): void {
  if (state.hasSection && !state.hasStepInSection) {
    errors.push({
      line: state.sectionLine,
      message: `Section "${state.sectionName}" has no steps`,
      severity: 'error',
    });
    // Mark as handled to avoid duplicate errors on consecutive blank lines
    state.hasSection = false;
  }
}

/**
 * Start a new section.
 */
function startNewSection(state: SectionState, lineNum: number, line: string): void {
  state.hasSection = true;
  state.hasStepInSection = false;
  state.sectionLine = lineNum;
  const repeatMatch = / (\d+)x$/.exec(line);
  state.sectionName = repeatMatch == null ? line : line.slice(0, repeatMatch.index);
}

/**
 * Validate a DSL string.
 */
export function validateDSL(dsl: string): DSLValidationResult {
  const trimmed = dsl.trim();
  if (trimmed.length === 0) {
    return {
      valid: false,
      errors: [{ line: 1, message: 'DSL is empty', severity: 'error' }],
    };
  }

  const errors: DSLValidationError[] = [];
  const totals: StepTotals = { durationSeconds: 0, distanceMeters: 0 };
  const state: SectionState = {
    hasSection: false,
    hasStepInSection: false,
    sectionLine: 0,
    sectionName: '',
  };

  const lines = trimmed.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const lineNum = i + 1;
    const line = (lines[i] ?? '').trim();

    if (line.length === 0) {
      checkEmptySection(state, errors);
      continue;
    }

    if (line.startsWith('- ')) {
      processStepLine(line, lineNum, state, totals, errors);
      continue;
    }

    // Section header
    checkEmptySection(state, errors);
    startNewSection(state, lineNum, line);
  }

  // Final section check
  checkEmptySection(state, errors);

  if (!state.hasSection) {
    errors.push({
      line: 1,
      message: 'No sections found — DSL must have at least one section with steps',
      severity: 'error',
    });
  }

  const hasErrors = errors.some((e) => e.severity === 'error');

  return {
    valid: !hasErrors,
    errors,
    parsedDurationSeconds: totals.durationSeconds > 0 ? totals.durationSeconds : undefined,
    parsedDistanceMeters: totals.distanceMeters > 0 ? totals.distanceMeters : undefined,
  };
}

/**
 * Process a step line within the current section context.
 */
function processStepLine(
  line: string,
  lineNum: number,
  state: SectionState,
  totals: StepTotals,
  errors: DSLValidationError[]
): void {
  if (!state.hasSection) {
    errors.push({
      line: lineNum,
      message: 'Step found before any section header',
      severity: 'error',
    });
    return;
  }

  state.hasStepInSection = true;
  const stepContent = line.slice(2).trim();
  const stepErrors = validateStepLine(stepContent, lineNum, totals);
  errors.push(...stepErrors);
}
