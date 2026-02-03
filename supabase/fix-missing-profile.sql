-- Fix for users who signed up before the profile creation bug was fixed
-- This will create a profile for any user in auth.users who doesn't have one

INSERT INTO user_profiles (user_id, full_name, role, daily_goals)
SELECT
  id,
  COALESCE(raw_user_meta_data->>'full_name', email),
  'client',
  '{"calories": 2000, "carbs": 225, "fat": 65, "fiber": 28, "protein": 100, "water": 80}'::jsonb
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM user_profiles);
