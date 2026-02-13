-- Khepri: Enable pgvector Extension
-- Migration: 004_pgvector.sql
-- Description: Enables the pgvector extension for vector similarity search.
--   Required for Phase 5: Knowledge Integration (RAG).

-- ============================================================================
-- PGVECTOR EXTENSION
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS vector;
