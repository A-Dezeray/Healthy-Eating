-- Migration: Add dietitian_notes and note_replies tables
-- Run this in your Supabase SQL editor

-- Dietitian Notes table
CREATE TABLE dietitian_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Note Replies table
CREATE TABLE note_replies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  note_id UUID NOT NULL REFERENCES dietitian_notes(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_dietitian_notes_author_id ON dietitian_notes(author_id);
CREATE INDEX idx_dietitian_notes_created_at ON dietitian_notes(created_at DESC);
CREATE INDEX idx_note_replies_note_id ON note_replies(note_id);
CREATE INDEX idx_note_replies_author_id ON note_replies(author_id);

-- Trigger for updated_at on dietitian_notes
CREATE TRIGGER update_dietitian_notes_updated_at
  BEFORE UPDATE ON dietitian_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE dietitian_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE note_replies ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS POLICIES: dietitian_notes
-- ============================================================

-- All authenticated users can read notes
CREATE POLICY "Authenticated users can read notes"
  ON dietitian_notes FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Only dietitians can create notes
CREATE POLICY "Dietitians can create notes"
  ON dietitian_notes FOR INSERT
  WITH CHECK (
    auth.uid() = author_id
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = 'dietitian'
    )
  );

-- Only dietitians can update their own notes
CREATE POLICY "Dietitians can update own notes"
  ON dietitian_notes FOR UPDATE
  USING (
    auth.uid() = author_id
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = 'dietitian'
    )
  );

-- Only dietitians can delete their own notes
CREATE POLICY "Dietitians can delete own notes"
  ON dietitian_notes FOR DELETE
  USING (
    auth.uid() = author_id
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = 'dietitian'
    )
  );

-- ============================================================
-- RLS POLICIES: note_replies
-- ============================================================

-- All authenticated users can read replies
CREATE POLICY "Authenticated users can read replies"
  ON note_replies FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- All authenticated users can create replies
CREATE POLICY "Authenticated users can create replies"
  ON note_replies FOR INSERT
  WITH CHECK (auth.uid() = author_id);

-- Users can delete their own replies
CREATE POLICY "Users can delete own replies"
  ON note_replies FOR DELETE
  USING (auth.uid() = author_id);

-- ============================================================
-- Allow users to see each other's profile names (for note author display)
-- ============================================================
CREATE POLICY "Authenticated users can read all profiles"
  ON user_profiles FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- ============================================================
-- Update dietitian role (replace email with your dietitian's email)
-- ============================================================
-- UPDATE user_profiles
-- SET role = 'dietitian', updated_at = NOW()
-- WHERE user_id = (
--   SELECT id FROM auth.users
--   WHERE email = 'your-dietitian@example.com'
-- );
