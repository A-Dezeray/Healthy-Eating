-- Migration: Add recipes and recipe_items tables
-- Run this in your Supabase SQL editor

-- Recipes table
CREATE TABLE recipes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  servings INTEGER NOT NULL DEFAULT 1,
  notes TEXT,
  total_calories INTEGER DEFAULT 0,
  total_carbs DECIMAL(10, 2) DEFAULT 0,
  total_fat DECIMAL(10, 2) DEFAULT 0,
  total_fiber DECIMAL(10, 2) DEFAULT 0,
  total_protein DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Recipe Items table (ingredients in a recipe)
CREATE TABLE recipe_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  food_id UUID REFERENCES foods(id) ON DELETE SET NULL,
  food_name TEXT NOT NULL,
  amount TEXT NOT NULL,
  calories INTEGER NOT NULL,
  carbs DECIMAL(10, 2),
  fat DECIMAL(10, 2),
  fiber DECIMAL(10, 2),
  protein DECIMAL(10, 2),
  "order" INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add recipe_id to meal_items to reference recipes
ALTER TABLE meal_items
ADD COLUMN recipe_id UUID REFERENCES recipes(id) ON DELETE SET NULL;

-- Indexes for better performance
CREATE INDEX idx_recipes_user_id ON recipes(user_id);
CREATE INDEX idx_recipe_items_recipe_id ON recipe_items(recipe_id);
CREATE INDEX idx_meal_items_recipe_id ON meal_items(recipe_id);

-- Trigger for updated_at on recipes
CREATE TRIGGER update_recipes_updated_at
  BEFORE UPDATE ON recipes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies for recipes
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own recipes"
  ON recipes FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own recipe items"
  ON recipe_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM recipes
      WHERE recipes.id = recipe_items.recipe_id
      AND recipes.user_id = auth.uid()
    )
  );
