# Potential Future Improvements

Improvements discovered during manual testing that are out of scope for the current fix but worth tracking.

## Season Setup

- **Edit race distance after import**: Allow tapping a race card to change its distance. Currently, if name-based inference assigns `Custom`, the user must remove and re-add the race manually.
- **Regenerate season skeleton with adjustments**: Allow the athlete to regenerate the season plan (max 2 times) with a text input describing what they'd like to adjust. Pass adjustment notes to the AI coach for a refined plan.

## Block Planning

- **Handle elapsed block start date**: When a block's start date (from the season skeleton) is in the past, detect this and either auto-adjust the start date to today or warn the athlete. Currently the block generates from its original start date, leaving past workouts unplanned.
- **Persist race goals during season setup**: The season setup flow collects race discipline/distance but only passes them to the skeleton prompt — it never creates `goals` rows. The block setup screen reads from `getUpcomingRaceGoals` (goals table) to show the "Required sports" info card, session warnings, and sport-specific day preferences. Without goal rows, these features are invisible. Fix: create a goal row per race in the overview "approve" handler.
- **Day preferences UI (per-day sport/workout scheduling)**: Removed during P7.5 manual testing. The UI for assigning sports and workout types to specific days ("Your weekly rhythm") was built and functional, but the AI generation backend could not reliably honor the preferences — workouts were consistently shifted to adjacent days. Learnings for when this is re-added:
  - **Don't rely on prompting alone.** Sonnet 4.6 cannot reliably schedule workouts to specific days when also generating structured content. Tried: stronger prompt language, expanding day names into concrete dates — all failed.
  - **Split scheduling from content generation.** Build the weekly schedule deterministically in code using the day preferences (which day gets which sport). Then pass the pre-built schedule to Claude and ask it only to fill in workout details (name, duration, zones, structure). This guarantees preferences are respected.
  - **Multi-sport days are essential.** Triathlon athletes regularly have 2 workouts per day (e.g., bike + run on Friday). The validation and external_id scheme must support multiple workouts on the same date (fixed during this session — keyed by date+sport).
  - **Depends on "Persist race goals" fix above.** The sport requirements info card, min sessions warnings, and sport dropdown all depend on goal rows existing. Without them, available sports falls back to a generic swim/bike/run list.
  - **Files to restore:** The UI components (AddPreferenceSheet, DayPreferenceRow) and their tests still exist in the codebase. The block-setup screen just no longer renders them. Restore by re-adding the "Your weekly rhythm" section and passing `dayPreferences` back into `generateWorkouts`.
