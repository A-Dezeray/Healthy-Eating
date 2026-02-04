import { MealItem, DailyGoals, Meal } from '@/lib/types';

/**
 * Calculates the total calories from an array of meal items
 */
export function calculateTotalCalories(items: MealItem[]): number {
  return items.reduce((total, item) => total + (item.calories || 0), 0);
}

/**
 * Calculates the total macros from an array of meal items
 */
export function calculateTotalMacros(items: MealItem[]) {
  return items.reduce(
    (totals, item) => ({
      carbs: totals.carbs + (item.carbs || 0),
      fat: totals.fat + (item.fat || 0),
      fiber: totals.fiber + (item.fiber || 0),
      protein: totals.protein + (item.protein || 0),
    }),
    { carbs: 0, fat: 0, fiber: 0, protein: 0 }
  );
}

/**
 * Calculates the percentage of a goal achieved
 */
export function calculateGoalPercentage(actual: number, goal: number): number {
  if (goal === 0) return 0;
  return Math.round((actual / goal) * 100);
}

/**
 * Gets the status color based on goal achievement
 * @returns 'success' | 'warning' | 'default'
 */
export function getGoalStatus(actual: number, goal: number): 'success' | 'warning' | 'default' {
  const percentage = calculateGoalPercentage(actual, goal);
  if (percentage >= 95 && percentage <= 105) return 'success'; // Within 5% of goal
  if (percentage >= 85 && percentage <= 115) return 'warning'; // Within 15% of goal
  return 'default';
}

/**
 * Formats a macro value for display (rounds to 1 decimal place)
 */
export function formatMacroValue(value: number | undefined): string {
  if (value === undefined || value === null) return '0';
  return value.toFixed(1);
}

/**
 * Formats calories for display (no decimals)
 */
export function formatCalories(value: number | undefined): string {
  if (value === undefined || value === null) return '0';
  return Math.round(value).toString();
}

/**
 * Validates if daily goals are complete
 */
export function areGoalsComplete(goals: Partial<DailyGoals>): boolean {
  return !!(
    goals.calories &&
    goals.carbs &&
    goals.fat &&
    goals.fiber &&
    goals.protein &&
    goals.water
  );
}

/**
 * Gets default daily goals
 */
export function getDefaultDailyGoals(): DailyGoals {
  return {
    calories: 2000,
    carbs: 225,
    fat: 65,
    fiber: 28,
    protein: 100,
    water: 80,
  };
}

/**
 * Calculates daily totals from an array of meals
 */
export function calculateDailyTotals(meals: Meal[]) {
  let totals = {
    calories: 0,
    carbs: 0,
    fat: 0,
    fiber: 0,
    protein: 0,
    water: 0,
  };

  meals.forEach(meal => {
    if (meal.meal_items) {
      meal.meal_items.forEach(item => {
        totals.calories += item.calories || 0;
        totals.carbs += item.carbs || 0;
        totals.fat += item.fat || 0;
        totals.fiber += item.fiber || 0;
        totals.protein += item.protein || 0;
        totals.water += item.water || 0;
      });
    }
  });

  return totals;
}
