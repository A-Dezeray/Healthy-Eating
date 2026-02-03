-- Import Foods and Recipes
-- Run this in your Supabase SQL editor
-- This will add all foods and recipes to your account

-- Get the current user's ID
-- IMPORTANT: Replace 'YOUR_EMAIL_HERE' with your actual email address
DO $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Get user ID from auth.users table using your email
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'aliyah.dezeray@gmail.com';

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found. Please replace YOUR_EMAIL_HERE with your actual email address.';
  END IF;

-- Insert Foods from master_food_list.csv
INSERT INTO foods (user_id, name, default_amount, calories_per_serving, usage_count) VALUES
(v_user_id, 'American Cheese', 'per serving', 80, 0),
(v_user_id, 'Chobani Greek Yogurt, Low Fat Plain', 'per ¾ cup', 140, 0),
(v_user_id, 'Chobani Vanilla Yogurt (20g Protein)', 'per 4 oz', 83, 0),
(v_user_id, 'Vanilla Yogurt, Zero Sugar', 'per ¾ cup', 140, 0),
(v_user_id, 'Fairlife 2% Milk', 'per cup', 120, 0),
(v_user_id, '2% Milk (Vitamin A & D)', 'per cup', 122, 0),
(v_user_id, 'Ice Cream, French Vanilla', 'per ½ cup', 192, 0),
(v_user_id, 'Ice Cream, Homemade Vanilla', 'per ½ cup', 240, 0),
(v_user_id, 'Old-Fashioned Vanilla Ice Cream', 'per ¼ cup', 79, 0),
(v_user_id, 'Hard-Boiled Egg', 'each', 60, 0),
(v_user_id, 'Eggs, Large', 'for 3', 214, 0),
(v_user_id, 'Eggs, Over Easy', 'for 2', 180, 0),
(v_user_id, 'Thin Sliced Chicken Breast', 'per 8 oz', 240, 0),
(v_user_id, 'Ground Turkey 93/7', 'per 100g', 143, 0),
(v_user_id, 'Ground Beef 75/25', 'per 4 oz', 320, 0),
(v_user_id, 'Salmon Fillet', 'per serving', 170, 0),
(v_user_id, 'Tuna, Canned', 'per can', 110, 0),
(v_user_id, 'Old Fashioned Oats', 'per ¾ cup', 225, 0),
(v_user_id, 'Cheerios', 'per 1¼ cups', 125, 0),
(v_user_id, 'Strawberry Banana Cheerios', 'per cup', 140, 0),
(v_user_id, 'Mini Potato Gnocchi', 'per cup', 200, 0),
(v_user_id, 'Turkey Gnocchi in Tomato Sauce', 'per serving', 469, 0),
(v_user_id, 'Instant White Rice', 'per cup', 170, 0),
(v_user_id, 'Jasmine Rice', 'per 1¼ cups', 200, 0),
(v_user_id, 'Thai Jasmine Rice', 'per serving', 240, 0),
(v_user_id, 'Spaghetti with Meat Sauce', 'per 2 cups', 574, 0),
(v_user_id, 'Cup of Noodles', 'per container', 290, 0),
(v_user_id, 'Ramen', 'per package', 380, 0),
(v_user_id, 'Blueberries', 'per cup', 84, 0),
(v_user_id, 'Banana', 'medium', 105, 0),
(v_user_id, 'Pear', 'half', 52, 0),
(v_user_id, 'Watermelon', 'per cup', 46, 0),
(v_user_id, 'Kiwi', 'per serving', 90, 0),
(v_user_id, 'Broccoli', 'per 2 cups', 109, 0),
(v_user_id, 'Cauliflower', 'per serving', 42, 0),
(v_user_id, 'Collard Greens', 'per serving', 29, 0),
(v_user_id, 'Kale', 'per serving', 12, 0),
(v_user_id, 'Brussels Sprouts', 'per 9 oz', 105, 0),
(v_user_id, 'Pepperoni Hot Pocket', 'per serving', 320, 0),
(v_user_id, 'Uncrustable (Raspberry)', 'per sandwich', 210, 0),
(v_user_id, 'French Fries', 'per serving', 330, 0),
(v_user_id, 'Honey Roasted Almonds', 'per serving', 75, 0),
(v_user_id, 'Butter', 'per ½ tbsp', 68, 0),
(v_user_id, 'Teriyaki Marinade', 'per 2 tbsp', 40, 0),
(v_user_id, 'Tomato Sauce', 'per ½ cup', 80, 0),
(v_user_id, 'Lite Syrup', 'per 2 tbsp', 50, 0),
(v_user_id, 'Fruit Snacks', 'per serving', 90, 0),
(v_user_id, 'Oreo Snack Pack', 'per pack', 220, 0),
(v_user_id, 'Special Dark Chocolate', 'per serving', 112, 0),
(v_user_id, 'Pineapple Juice', 'per can', 100, 0),
(v_user_id, 'Lemon Juice', 'per ½ cup', 31, 0),
(v_user_id, 'Water', 'per serving', 0, 0),
(v_user_id, 'Baking Powder', 'per tsp', 0, 0),
(v_user_id, 'Vanilla Extract', 'per tsp', 0, 0),
(v_user_id, 'Kosher Salt', 'per tsp', 0, 0),
(v_user_id, 'Brown Sugar', 'per ½ cup', 360, 0),
(v_user_id, 'Whole Wheat Flour', 'per 1½ cups', 600, 0),
(v_user_id, 'Cinnamon', 'per tsp', 3, 0),
(v_user_id, 'Salted Butter', 'per 2 tbsp', 175, 0),
(v_user_id, 'Cornstarch', 'per 2 tbsp', 30, 0),
(v_user_id, 'Rolled Oats', 'per ¾ cup', 225, 0),
(v_user_id, 'Mini Chocolate Chips', 'per tbsp', 33, 0),
(v_user_id, 'Strawberries', 'per ½ cup', 14, 0),
(v_user_id, 'Roasted Garlic Tomato Sauce', 'per ½ cup', 80, 0),
(v_user_id, 'Heirloom Tomato', 'medium', 20, 0);

-- Insert Recipes with calculated totals

-- Recipe 1: Blueberry/Oatmeal Muffins (Whole Wheat)
WITH new_recipe AS (
  INSERT INTO recipes (user_id, name, servings, total_calories, total_carbs, total_fat, total_fiber, total_protein)
  VALUES (v_user_id, 'Blueberry/Oatmeal Muffins (Whole Wheat)', 16, 1932, 0, 0, 0, 0)
  RETURNING id
)
INSERT INTO recipe_items (recipe_id, food_name, amount, calories, carbs, fat, fiber, protein, "order")
SELECT
  new_recipe.id,
  ingredient.food_name,
  ingredient.amount,
  ingredient.calories,
  0, 0, 0, 0,
  ingredient."order"
FROM new_recipe
CROSS JOIN (VALUES
  ('Baking Powder', '1 tsp', 0, 1),
  ('Eggs', '2 large', 140, 2),
  ('Rolled Oats', '¾ cup', 225, 3),
  ('2% Milk', '1 cup', 120, 4),
  ('Vanilla Extract', '1 tsp', 0, 5),
  ('Kosher Salt', '½ tsp', 0, 6),
  ('Blueberries', '1 cup', 84, 7),
  ('Brown Sugar', '½ cup', 360, 8),
  ('Butter', '4 tbsp', 400, 9),
  ('Whole Wheat Flour', '1½ cups', 600, 10),
  ('Cinnamon', '1 tsp', 3, 11)
) AS ingredient(food_name, amount, calories, "order");

-- Recipe 2: Chicken and Rice
WITH new_recipe AS (
  INSERT INTO recipes (user_id, name, servings, total_calories, total_carbs, total_fat, total_fiber, total_protein)
  VALUES (v_user_id, 'Chicken and Rice', 8, 685, 0, 0, 0, 0)
  RETURNING id
)
INSERT INTO recipe_items (recipe_id, food_name, amount, calories, carbs, fat, fiber, protein, "order")
SELECT
  new_recipe.id,
  ingredient.food_name,
  ingredient.amount,
  ingredient.calories,
  0, 0, 0, 0,
  ingredient."order"
FROM new_recipe
CROSS JOIN (VALUES
  ('Thai Jasmine Rice', '1 serving', 240, 1),
  ('Salted Butter', '2 tbsp', 175, 2),
  ('Thin Sliced Chicken Breast', '8 oz', 240, 3),
  ('Cornstarch', '2 tbsp', 30, 4),
  ('Water', 'as needed', 0, 5)
) AS ingredient(food_name, amount, calories, "order");

-- Recipe 3: Snack: Berries and Yogurt
WITH new_recipe AS (
  INSERT INTO recipes (user_id, name, servings, total_calories, total_carbs, total_fat, total_fiber, total_protein)
  VALUES (v_user_id, 'Snack: Berries and Yogurt', 1, 151, 0, 0, 0, 0)
  RETURNING id
)
INSERT INTO recipe_items (recipe_id, food_name, amount, calories, carbs, fat, fiber, protein, "order")
SELECT
  new_recipe.id,
  ingredient.food_name,
  ingredient.amount,
  ingredient.calories,
  0, 0, 0, 0,
  ingredient."order"
FROM new_recipe
CROSS JOIN (VALUES
  ('Mini Chocolate Chips', '1 tbsp', 33, 1),
  ('Strawberries', '½ cup', 14, 2),
  ('Blueberries', '¼ cup', 21, 3),
  ('Chobani Vanilla Yogurt (20g Protein)', '4 oz', 83, 4)
) AS ingredient(food_name, amount, calories, "order");

-- Recipe 4: Turkey Gnocchi in Tomato Sauce
WITH new_recipe AS (
  INSERT INTO recipes (user_id, name, servings, total_calories, total_carbs, total_fat, total_fiber, total_protein)
  VALUES (v_user_id, 'Turkey Gnocchi in Tomato Sauce', 1, 469, 0, 0, 0, 0)
  RETURNING id
)
INSERT INTO recipe_items (recipe_id, food_name, amount, calories, carbs, fat, fiber, protein, "order")
SELECT
  new_recipe.id,
  ingredient.food_name,
  ingredient.amount,
  ingredient.calories,
  0, 0, 0, 0,
  ingredient."order"
FROM new_recipe
CROSS JOIN (VALUES
  ('Roasted Garlic Tomato Sauce', '½ cup', 80, 1),
  ('Ground Turkey 93/7', '100g', 143, 2),
  ('Cauliflower', '1 serving', 26, 3),
  ('Mini Potato Gnocchi', '1 cup', 200, 4),
  ('Heirloom Tomato', 'medium', 20, 5)
) AS ingredient(food_name, amount, calories, "order");

END $$;
