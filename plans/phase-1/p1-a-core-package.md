# Phase 1 Workstream A: Core Package Setup

## Goal

Create `packages/core/` as a shared package containing common types, utilities, and constants used across the mobile app, AI client, and Supabase client packages.

---

## Current State

- `packages/core/` exists as placeholder (`.gitkeep` only)
- Types exist in `packages/ai-client/src/types.ts` (AI-specific, camelCase)
- Types exist in `packages/supabase-client/src/types.ts` (DB-specific, snake_case)
- Types exist in `apps/mobile/types/checkin.ts` (form-specific, with UI constants)
- Formatters exist in `apps/mobile/utils/formatters.ts`
- Root tsconfig already has `@khepri/core` path alias configured

**Decision:** Keep ai-client and supabase-client types where they are. Core provides shared enums, utilities, and type guards.

---

## Tasks (4 PRs)

### P1-A-01: Create core package structure with tsconfig
**Branch:** `feat/p1-a-01-core-package-structure`

**Create files:**
- `packages/core/package.json` - ESM package config
- `packages/core/tsconfig.json` - TypeScript config extending root
- `packages/core/jest.config.js` - Jest configuration
- `packages/core/src/index.ts` - Public exports (initially empty)

**package.json pattern:**
```json
{
  "name": "@khepri/core",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "typecheck": "tsc --noEmit",
    "test": "node --experimental-vm-modules node_modules/jest/bin/jest.js --passWithNoTests",
    "clean": "rm -rf dist coverage"
  },
  "devDependencies": {
    "@types/jest": "^29.5.14",
    "@types/node": "^22.10.2",
    "jest": "^29.7.0",
    "ts-jest": "^29.2.5",
    "typescript": "^5.7.2"
  }
}
```

**Test:** `pnpm build` passes in package

---

### P1-A-02: Extract shared types from mobile app
**Branch:** `feat/p1-a-02-extract-shared-types`

**Create files:**
- `packages/core/src/types/wellness.ts` - BodyArea, SorenessAreas, TravelStatus
- `packages/core/src/types/time.ts` - AvailableTimeMinutes
- `packages/core/src/types/constraints.ts` - DailyConstraintType
- `packages/core/src/types/index.ts` - Re-exports
- `packages/core/src/__tests__/types.test.ts` - Type guard tests

**wellness.ts pattern:**
```typescript
export type BodyArea = 'legs' | 'back' | 'shoulders' | 'arms' | 'core' | 'neck';

export const BODY_AREAS: readonly BodyArea[] = [
  'legs', 'back', 'shoulders', 'arms', 'core', 'neck'
] as const;

export type SorenessAreas = Partial<Record<BodyArea, number>>;

export type TravelStatus = 'home' | 'traveling' | 'returning';

export function isBodyArea(value: string): value is BodyArea {
  return BODY_AREAS.includes(value as BodyArea);
}
```

**Test:** Type guards work for valid/invalid inputs

---

### P1-A-03: Add utility functions (date formatting, validation)
**Branch:** `feat/p1-a-03-core-utils`

**Create files:**
- `packages/core/src/utils/formatters.ts` - formatDate, formatDuration, formatMinutes, getToday
- `packages/core/src/utils/validators.ts` - isInRange, isValidWellnessMetric, isValidISODate
- `packages/core/src/utils/index.ts` - Re-exports
- `packages/core/src/__tests__/formatters.test.ts`
- `packages/core/src/__tests__/validators.test.ts`

**formatters.ts (revised from mobile app with edge-case fixes):**

Note: This is an enhanced version of `apps/mobile/utils/formatters.ts` with:
- `formatDuration` returns `'0:00'` for zero (mobile returns `''`)
- `getToday()` added (new utility)
- `formatDateRange` moved from mobile
- `formatMinutes` added (new utility)

```typescript
export function formatDate(date?: Date): string {
  if (!date) return '';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatDateRange(startDate: Date, endDate?: Date): string {
  if (endDate) {
    return `${formatDate(startDate)} - ${formatDate(endDate)}`;
  }
  return `${formatDate(startDate)} - Ongoing`;
}

export function formatDuration(seconds?: number): string {
  if (seconds == null || seconds < 0) return '';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

export function getToday(): string {
  const now = new Date();
  return now.toISOString().split('T')[0]!;
}
```

**Test:** Formatters handle edge cases (null, undefined, 0, negative)

---

### P1-A-04: Update mobile app to import from @khepri/core
**Branch:** `feat/p1-a-04-mobile-use-core`

**Modify files:**
- `apps/mobile/package.json` - Add `@khepri/core` dependency
- `apps/mobile/types/checkin.ts` - Import from @khepri/core, keep UI constants
- `apps/mobile/utils/formatters.ts` - Re-export from @khepri/core

**Updated types/checkin.ts:**
```typescript
// Re-export core types
export type {
  AvailableTimeMinutes,
  BodyArea,
  DailyConstraintType,
  SorenessAreas,
  TravelStatus,
} from '@khepri/core';

// Alias for backward compatibility
export type ConstraintType = DailyConstraintType;

// Keep UI-specific constants here
export const AVAILABLE_TIME_UI_OPTIONS = [
  { value: 15, label: '15 min' },
  // ...
];
```

**Test:** All existing mobile app tests pass

---

## Key Files Reference

| Purpose | File Path |
|---------|-----------|
| Mobile types to extract | `apps/mobile/types/checkin.ts` |
| Mobile formatters to move | `apps/mobile/utils/formatters.ts` |
| Package pattern | `packages/supabase-client/package.json` |
| Root tsconfig | `tsconfig.json` |

---

## Testing Approach

- Unit tests in `packages/core/src/__tests__/` for type guards and utilities
- Run with `pnpm test` in core package
- Mobile app tests serve as integration validation

---

## Verification

After all 4 PRs merged:
1. `pnpm build` passes in packages/core
2. `pnpm test` passes in packages/core
3. `pnpm test` passes in apps/mobile
4. Mobile app can import: `import { formatDate, BodyArea } from '@khepri/core'`
