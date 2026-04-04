export {
  GYM_TEMPLATES,
  getGymTemplateById,
  getGymTemplatesByCategory,
  getGymTemplatesByDifficulty,
} from './gym.js';

export {
  TRAVEL_TEMPLATES,
  getTravelTemplateById,
  getTravelTemplatesByCategory,
  getTravelTemplatesByDifficulty,
} from './travel.js';

// ==== Workout Templates (Training Plan) ====
export {
  clearTemplates,
  getAllTemplates,
  registerTemplate,
  registerTemplates,
  renderTemplate,
  selectTemplate,
} from './workout-templates.js';
export type {
  AthleteZones,
  TemplateSelection,
  TrainingTemplate,
} from './workout-templates.js';

export { SWIM_TEMPLATES } from './swim/index.js';
export { BIKE_TEMPLATES } from './bike/index.js';
export { RUN_TEMPLATES } from './run/index.js';
