/**
 * Tools Index
 *
 * Export all tool definitions and safety check functions.
 */

// Intervals.icu MCP tools
export {
  INTERVALS_TOOLS,
  GET_ACTIVITIES_TOOL,
  GET_ACTIVITY_DETAILS_TOOL,
  GET_ACTIVITY_INTERVALS_TOOL,
  GET_WELLNESS_DATA_TOOL,
  GET_EVENTS_TOOL,
  GET_EVENT_BY_ID_TOOL,
  getIntervalsToolsForScenario,
} from './intervals-tools.js';

// Knowledge base tools
export {
  KNOWLEDGE_TOOLS,
  SEARCH_KNOWLEDGE_TOOL,
} from './knowledge-tools.js';

// Safety tools
export {
  SAFETY_TOOLS,
  CHECK_TRAINING_READINESS_TOOL,
  CHECK_FATIGUE_LEVEL_TOOL,
  CHECK_CONSTRAINT_COMPATIBILITY_TOOL,
  VALIDATE_TRAINING_LOAD_TOOL,
  VALIDATE_WORKOUT_MODIFICATION_TOOL,
  checkTrainingReadiness,
  checkFatigueLevel,
  checkConstraintCompatibility,
  validateTrainingLoad,
  validateWorkoutModification,
} from './safety-tools.js';

export type {
  TrainingReadiness,
  ReadinessAssessment,
  FatigueAssessment,
  ConstraintCompatibility,
  ModificationContext,
} from './safety-tools.js';
