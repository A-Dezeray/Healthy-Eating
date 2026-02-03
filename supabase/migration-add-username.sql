-- Migration: Add username field to user_profiles table
-- Run this in your Supabase SQL editor after the initial schema

ALTER TABLE user_profiles
ADD COLUMN username TEXT UNIQUE;

-- Optionally set a default username from email (before @ symbol)
-- UPDATE user_profiles SET username = split_part(email, '@', 1) WHERE username IS NULL;
