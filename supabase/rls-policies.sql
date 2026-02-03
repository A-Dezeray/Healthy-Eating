-- Enable Row Level Security on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE weeks ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE foods ENABLE ROW LEVEL SECURITY;
ALTER TABLE weight_logs ENABLE ROW LEVEL SECURITY;

-- User Profiles policies
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Weeks policies
CREATE POLICY "Users can manage own weeks"
  ON weeks FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Dietitians can view client weeks"
  ON weeks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = 'dietitian'
    )
  );

-- Daily Logs policies
CREATE POLICY "Users can manage own daily logs"
  ON daily_logs FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Dietitians can view client daily logs"
  ON daily_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = 'dietitian'
    )
  );

-- Meals policies
CREATE POLICY "Users can manage own meals"
  ON meals FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM daily_logs
      WHERE daily_logs.id = meals.daily_log_id
      AND daily_logs.user_id = auth.uid()
    )
  );

CREATE POLICY "Dietitians can view client meals"
  ON meals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = 'dietitian'
    )
  );

-- Meal Items policies
CREATE POLICY "Users can manage own meal items"
  ON meal_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM meals
      JOIN daily_logs ON daily_logs.id = meals.daily_log_id
      WHERE meals.id = meal_items.meal_id
      AND daily_logs.user_id = auth.uid()
    )
  );

CREATE POLICY "Dietitians can view client meal items"
  ON meal_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = 'dietitian'
    )
  );

-- Foods policies
CREATE POLICY "Users can manage own foods"
  ON foods FOR ALL
  USING (auth.uid() = user_id);

-- Note: Dietitians typically don't need access to client food libraries
-- If needed, add a similar policy as above

-- Weight Logs policies
CREATE POLICY "Users can manage own weight logs"
  ON weight_logs FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Dietitians can view client weight logs"
  ON weight_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = 'dietitian'
    )
  );
