// Database types
export type UserRole = 'client' | 'dietitian';

export interface UserProfile {
  id: string;
  user_id: string;
  full_name: string;
  username?: string;
  role: UserRole;
  daily_goals: DailyGoals;
  created_at: string;
  updated_at: string;
}

export interface DailyGoals {
  calories: number;
  carbs: number;
  fat: number;
  fiber: number;
  protein: number;
  water: number; // in oz
}

export interface Week {
  id: string;
  user_id: string;
  start_date: string; // Sunday
  end_date: string; // Saturday
  created_at: string;
}

export interface DailyLog {
  id: string;
  week_id: string;
  user_id: string;
  log_date: string;
  total_calories: number;
  total_carbs: number;
  total_fat: number;
  total_fiber: number;
  total_protein: number;
  water_intake: number;
  is_locked: boolean;
  created_at: string;
  updated_at: string;
}

export type MealType = 'breakfast' | 'lunch' | 'snack' | 'dinner' | 'bt_snack';

export interface Meal {
  id: string;
  daily_log_id: string;
  meal_type: MealType;
  meal_order: number;
  preparation_notes?: string;
  created_at: string;
  updated_at: string;
  meal_items?: MealItem[];
}

export interface MealItem {
  id: string;
  meal_id: string;
  food_id?: string;
  recipe_id?: string;
  food_name: string;
  amount: string;
  calories: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  protein?: number;
  water?: number;
  notes?: string;
  order: number;
  created_at: string;
}

export interface Food {
  id: string;
  user_id: string;
  name: string;
  default_amount: string;
  calories_per_serving: number;
  carbs_per_serving?: number;
  fat_per_serving?: number;
  fiber_per_serving?: number;
  protein_per_serving?: number;
  water_per_serving?: number;
  usage_count: number;
  created_at: string;
  last_used_at: string;
}

export interface WeightLog {
  id: string;
  user_id: string;
  weight: number;
  log_date: string;
  notes?: string;
  created_at: string;
}

export interface Recipe {
  id: string;
  user_id: string;
  name: string;
  servings: number;
  notes?: string;
  total_calories: number;
  total_carbs: number;
  total_fat: number;
  total_fiber: number;
  total_protein: number;
  total_water?: number;
  created_at: string;
  updated_at: string;
  recipe_items?: RecipeItem[];
}

export interface RecipeItem {
  id: string;
  recipe_id: string;
  food_id?: string;
  food_name: string;
  amount: string;
  calories: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  protein?: number;
  water?: number;
  order: number;
  created_at: string;
}

export interface DietitianNote {
  id: string;
  author_id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
  note_replies?: NoteReply[];
}

export interface NoteReply {
  id: string;
  note_id: string;
  author_id: string;
  content: string;
  created_at: string;
}

// Form types
export interface MealItemFormData {
  food_name: string;
  amount: string;
  calories: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  protein?: number;
  water?: number;
  notes?: string;
}

export interface DailyGoalsFormData {
  calories: number;
  carbs: number;
  fat: number;
  fiber: number;
  protein: number;
  water: number;
}
