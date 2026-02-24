# Fix Migration UUID Function for Hosted Supabase

**Date**: 2026-02-24
**Branch**: fix/migration-uuid-function

## Goal

Fix `npx supabase db push` failing on hosted Supabase with error:
`ERROR: function uuid_generate_v4() does not exist (SQLSTATE 42883)`

## Root Cause

Hosted Supabase installs the `uuid-ossp` extension in the `extensions` schema, not `public`. The unqualified `uuid_generate_v4()` call fails because it can't find the function without schema-qualifying it.

## Solution

Replace `uuid_generate_v4()` with `gen_random_uuid()` in all migration files. `gen_random_uuid()` is a built-in Postgres function (available since Postgres 13) that doesn't require any extension. Also removed the unnecessary `CREATE EXTENSION IF NOT EXISTS "uuid-ossp"` from migration 001.

## Key Decisions

- Used `gen_random_uuid()` instead of `extensions.uuid_generate_v4()` because it's simpler and doesn't depend on any extension
- Removed the `uuid-ossp` extension creation entirely since it's no longer needed
- Safe to modify migration files directly since the remote DB is fresh (no migrations applied yet)

## Files Changed

- `supabase/migrations/001_initial_schema.sql` - Removed uuid-ossp extension, replaced 5 occurrences
- `supabase/migrations/002_conversations.sql` - Replaced 2 occurrences
- `supabase/migrations/003_intervals_credentials.sql` - Replaced 1 occurrence
- `supabase/migrations/005_embeddings.sql` - Replaced 1 occurrence

## Learnings

- Hosted Supabase projects install extensions in the `extensions` schema, not `public`
- `gen_random_uuid()` is the modern Postgres-native alternative to `uuid_generate_v4()`
- Local Supabase (`supabase start`) installs `uuid-ossp` in `public` by default, masking this issue during local development
