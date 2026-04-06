import { BIKE_TEMPLATES } from '../templates/bike/index.js';
import { RUN_TEMPLATES } from '../templates/run/index.js';
import { SWIM_TEMPLATES } from '../templates/swim/index.js';
import {
  clearTemplates,
  getAllTemplates,
  registerTemplates,
  renderTemplate,
  selectTemplate,
} from '../templates/workout-templates.js';
import type { AthleteZones, TrainingTemplate } from '../templates/workout-templates.js';
import { workoutStructureToDSL } from '../utils/dsl-serializer.js';
import { validateDSL } from '../utils/dsl-validator.js';

const ALL_SPORT_TEMPLATES = [...SWIM_TEMPLATES, ...BIKE_TEMPLATES, ...RUN_TEMPLATES];

const testZones: AthleteZones = {
  ftp: 250,
  thresholdPaceSecKm: 270,
  cssSec100m: 100,
  lthr: 165,
  maxHr: 185,
};

beforeEach(() => {
  clearTemplates();
  registerTemplates(ALL_SPORT_TEMPLATES);
});

describe('template registry', () => {
  it('registers all sport templates', () => {
    expect(getAllTemplates().length).toBe(ALL_SPORT_TEMPLATES.length);
  });

  it('clears templates', () => {
    clearTemplates();
    expect(getAllTemplates()).toHaveLength(0);
  });
});

describe('selectTemplate', () => {
  it('selects an exact match for sport + phase + focus + duration', () => {
    const result = selectTemplate({
      sport: 'bike',
      phase: 'build',
      focus: 'threshold_work',
      durationMinutes: 60,
    });
    expect(result).not.toBeNull();
    expect(result?.sport).toBe('bike');
    expect(result?.phases).toContain('build');
    expect(result?.focus).toBe('threshold_work');
  });

  it('falls back to same sport + phase when focus has no match', () => {
    // 'strength' focus doesn't exist for swim
    const result = selectTemplate({
      sport: 'swim',
      phase: 'build',
      focus: 'strength',
      durationMinutes: 50,
    });
    expect(result).not.toBeNull();
    expect(result?.sport).toBe('swim');
    expect(result?.phases).toContain('build');
  });

  it('falls back to same sport when phase has no match', () => {
    // 'taper' phase may have limited swim options
    const result = selectTemplate({
      sport: 'swim',
      phase: 'taper',
      focus: 'threshold_work',
      durationMinutes: 30,
    });
    expect(result).not.toBeNull();
    expect(result?.sport).toBe('swim');
  });

  it('returns null when no templates match the sport', () => {
    const result = selectTemplate({
      sport: 'strength',
      phase: 'base',
      focus: 'aerobic_endurance',
      durationMinutes: 30,
    });
    expect(result).toBeNull();
  });
});

describe('renderTemplate', () => {
  it('renders a bike template producing valid WorkoutStructure', () => {
    const template = selectTemplate({
      sport: 'bike',
      phase: 'build',
      focus: 'threshold_work',
      durationMinutes: 60,
    });
    expect(template).not.toBeNull();
    if (!template) return;

    const structure = renderTemplate(template, testZones, 60);

    expect(structure.totalDurationMinutes).toBe(60);
    expect(structure.sections.length).toBeGreaterThanOrEqual(1);
    for (const section of structure.sections) {
      expect(section.steps.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('renders a swim template producing valid WorkoutStructure', () => {
    const template = selectTemplate({
      sport: 'swim',
      phase: 'build',
      focus: 'threshold_work',
      durationMinutes: 50,
    });
    expect(template).not.toBeNull();
    if (!template) return;

    const structure = renderTemplate(template, testZones, 50);
    expect(structure.sections.length).toBeGreaterThanOrEqual(1);
  });
});

describe('all templates produce valid DSL', () => {
  for (const template of ALL_SPORT_TEMPLATES) {
    it(`${template.name} → valid DSL`, () => {
      const midDuration = Math.round((template.durationRange[0] + template.durationRange[1]) / 2);
      const structure = template.render(testZones, midDuration);
      const dsl = workoutStructureToDSL(structure, template.intervalsTarget);
      const result = validateDSL(dsl);

      expect(result.errors.filter((e) => e.severity === 'error')).toHaveLength(0);
      expect(result.valid).toBe(true);
    });
  }
});

describe('template coverage', () => {
  const sportPhases = (sport: string, templates: readonly TrainingTemplate[]) => {
    const phases = new Set<string>();
    for (const t of templates) {
      if (t.sport === sport) {
        for (const p of t.phases) {
          phases.add(p);
        }
      }
    }
    return phases;
  };

  it('swim has templates for base, build, peak, and recovery phases', () => {
    const phases = sportPhases('swim', ALL_SPORT_TEMPLATES);
    expect(phases.has('base')).toBe(true);
    expect(phases.has('build')).toBe(true);
    expect(phases.has('peak')).toBe(true);
    expect(phases.has('recovery')).toBe(true);
  });

  it('bike has templates for base, build, peak, taper, and recovery phases', () => {
    const phases = sportPhases('bike', ALL_SPORT_TEMPLATES);
    expect(phases.has('base')).toBe(true);
    expect(phases.has('build')).toBe(true);
    expect(phases.has('peak')).toBe(true);
    expect(phases.has('taper')).toBe(true);
    expect(phases.has('recovery')).toBe(true);
  });

  it('run has templates for base, build, peak, taper, and recovery phases', () => {
    const phases = sportPhases('run', ALL_SPORT_TEMPLATES);
    expect(phases.has('base')).toBe(true);
    expect(phases.has('build')).toBe(true);
    expect(phases.has('peak')).toBe(true);
    expect(phases.has('taper')).toBe(true);
    expect(phases.has('recovery')).toBe(true);
  });

  it('swim has at least 6 templates', () => {
    expect(SWIM_TEMPLATES.length).toBeGreaterThanOrEqual(6);
  });

  it('bike has at least 8 templates', () => {
    expect(BIKE_TEMPLATES.length).toBeGreaterThanOrEqual(8);
  });

  it('run has at least 8 templates', () => {
    expect(RUN_TEMPLATES.length).toBeGreaterThanOrEqual(8);
  });
});
