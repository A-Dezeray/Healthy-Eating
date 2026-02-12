-- Migration: Add is_locked to daily_logs + allow clients to create notes
-- Run this in your Supabase SQL editor

-- ============================================================
-- 1. Add is_locked column to daily_logs
-- ============================================================
ALTER TABLE daily_logs ADD COLUMN is_locked BOOLEAN NOT NULL DEFAULT FALSE;

-- ============================================================
-- 2. Allow clients to create notes (not just dietitians)
-- ============================================================

-- Drop the existing dietitian-only insert policy
DROP POLICY IF EXISTS "Dietitians can create notes" ON dietitian_notes;

-- Replace with a policy that lets any authenticated user create notes
CREATE POLICY "Authenticated users can create notes"
  ON dietitian_notes FOR INSERT
  WITH CHECK (auth.uid() = author_id);

-- Allow users to update their own notes (not just dietitians)
DROP POLICY IF EXISTS "Dietitians can update own notes" ON dietitian_notes;

CREATE POLICY "Users can update own notes"
  ON dietitian_notes FOR UPDATE
  USING (auth.uid() = author_id);

-- Allow users to delete their own notes (not just dietitians)
DROP POLICY IF EXISTS "Dietitians can delete own notes" ON dietitian_notes;

CREATE POLICY "Users can delete own notes"
  ON dietitian_notes FOR DELETE
  USING (auth.uid() = author_id);
