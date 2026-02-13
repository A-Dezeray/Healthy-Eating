'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/auth-context';
import { createClient } from '@/lib/supabase/client';
import { Meal, MealType, DailyLog, DailyGoals } from '@/lib/types';
import { formatDateForDB, formatDateFull, getWeekStart } from '@/lib/utils/date';
import { addDays } from 'date-fns';
import { MealSection } from '@/components/meal-section';
import { calculateDailyTotals } from '@/lib/utils/nutrition';

const MEAL_TYPES: { type: MealType; label: string }[] = [
  { type: 'breakfast', label: 'Breakfast' },
  { type: 'lunch', label: 'Lunch' },
  { type: 'snack', label: 'Snack' },
  { type: 'dinner', label: 'Dinner' },
  { type: 'bt_snack', label: 'Bedtime Snack' },
];

export default function MealsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const dateParam = searchParams.get('date');
  const { user } = useAuth();
  const initialDate = dateParam || formatDateForDB(new Date());
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [pendingDate, setPendingDate] = useState(initialDate);
  const [dailyLog, setDailyLog] = useState<DailyLog | null>(null);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  const [dailyGoals, setDailyGoals] = useState<DailyGoals | null>(null);
  const supabase = createClient();

  useEffect(() => {
    if (user?.id) {
      supabase
        .from('user_profiles')
        .select('daily_goals')
        .eq('user_id', user.id)
        .single()
        .then(({ data }) => {
          if (data?.daily_goals) setDailyGoals(data.daily_goals);
        });
    }
  }, [user?.id]);

  const applyDate = (date?: string) => {
    const newDate = date || pendingDate;
    if (newDate && newDate !== selectedDate) {
      setSelectedDate(newDate);
      setPendingDate(newDate);
      router.replace(`/meals?date=${newDate}`, { scroll: false });
    }
  };

  useEffect(() => {
    if (user && selectedDate) {
      // Keep URL in sync so refresh stays on this date
      if (searchParams.get('date') !== selectedDate) {
        router.replace(`/meals?date=${selectedDate}`, { scroll: false });
      }
      fetchDayData();
    }
  }, [user, selectedDate]);

  const findOrCreateWeek = async () => {
    const weekStartDate = getWeekStart(new Date(selectedDate + 'T00:00:00'));
    const weekStartStr = formatDateForDB(weekStartDate);
    const weekEndStr = formatDateForDB(addDays(weekStartDate, 6));

    // Try exact start_date match first
    const { data: exactWeek } = await supabase
      .from('weeks')
      .select('*')
      .eq('user_id', user?.id)
      .eq('start_date', weekStartStr)
      .single();

    if (exactWeek) return exactWeek;

    // Try range match (handles weeks created with different start day)
    const { data: rangeWeek } = await supabase
      .from('weeks')
      .select('*')
      .eq('user_id', user?.id)
      .lte('start_date', selectedDate)
      .gte('end_date', selectedDate)
      .single();

    if (rangeWeek) return rangeWeek;

    // Create new week
    const { data: newWeek, error: createError } = await supabase
      .from('weeks')
      .insert({
        user_id: user?.id,
        start_date: weekStartStr,
        end_date: weekEndStr,
      })
      .select()
      .single();

    if (createError) {
      // Race condition: another call already created it — re-fetch
      if (createError.code === '23505') {
        const { data: existingWeek } = await supabase
          .from('weeks')
          .select('*')
          .eq('user_id', user?.id)
          .eq('start_date', weekStartStr)
          .single();
        if (existingWeek) return existingWeek;
      }
      throw createError;
    }
    return newWeek;
  };

  const fetchDayData = async () => {
    setLoading(true);
    try {
      // 1. Look up existing daily log first (most reliable — keyed by user_id + log_date)
      let { data: log, error: logError } = await supabase
        .from('daily_logs')
        .select('*')
        .eq('user_id', user?.id)
        .eq('log_date', selectedDate)
        .single();

      if (logError && logError.code !== 'PGRST116') throw logError;

      // 2. Create daily log only if none exists
      if (!log) {
        const week = await findOrCreateWeek();

        const { data: newLog, error: createError } = await supabase
          .from('daily_logs')
          .insert({
            week_id: week.id,
            user_id: user?.id,
            log_date: selectedDate,
            total_calories: 0,
            total_carbs: 0,
            total_fat: 0,
            total_fiber: 0,
            total_protein: 0,
            water_intake: 0,
          })
          .select()
          .single();

        if (createError) {
          // Race condition: another call already created it — just re-fetch
          if (createError.code === '23505') {
            const { data: existingLog } = await supabase
              .from('daily_logs')
              .select('*')
              .eq('user_id', user?.id)
              .eq('log_date', selectedDate)
              .single();
            log = existingLog;
          } else {
            throw createError;
          }
        } else {
          log = newLog;
        }
      }

      setDailyLog(log);

      // 3. Fetch meals with items
      const { data: mealsData, error: mealsError } = await supabase
        .from('meals')
        .select(`
          *,
          meal_items (*)
        `)
        .eq('daily_log_id', log.id)
        .order('meal_order');

      if (mealsError) throw mealsError;
      setMeals(mealsData || []);
    } catch (err: unknown) {
      const supaError = err as { message?: string; code?: string; details?: string; hint?: string };
      console.error('Error fetching day data:', supaError.message, supaError.code, supaError.details, supaError.hint);
    } finally {
      setLoading(false);
    }
  };

  const updateDailyTotals = async () => {
    if (!dailyLog) return;

    try {
      // Fetch all meals with items (no loading spinner — avoids scroll jump)
      const { data: mealsData, error } = await supabase
        .from('meals')
        .select(`
          *,
          meal_items (*)
        `)
        .eq('daily_log_id', dailyLog.id)
        .order('meal_order');

      if (error) throw error;

      const freshMeals = mealsData || [];
      const totals = calculateDailyTotals(freshMeals);

      // Update local state without triggering loading spinner
      setMeals(freshMeals);
      setDailyLog({
        ...dailyLog,
        total_calories: totals.calories,
        total_carbs: totals.carbs,
        total_fat: totals.fat,
        total_fiber: totals.fiber,
        total_protein: totals.protein,
        water_intake: totals.water,
      });

      // Persist totals to DB in background
      supabase
        .from('daily_logs')
        .update({
          total_calories: totals.calories,
          total_carbs: totals.carbs,
          total_fat: totals.fat,
          total_fiber: totals.fiber,
          total_protein: totals.protein,
          water_intake: totals.water,
        })
        .eq('id', dailyLog.id)
        .then(({ error: updateError }) => {
          if (updateError) console.error('Error updating daily totals:', updateError);
        });
    } catch (err) {
      console.error('Error updating daily totals:', err);
    }
  };

  const recalcAndUpdateTotals = (updatedMeals: Meal[]) => {
    const totals = calculateDailyTotals(updatedMeals);
    setMeals(updatedMeals);

    if (dailyLog) {
      setDailyLog({
        ...dailyLog,
        total_calories: totals.calories,
        total_carbs: totals.carbs,
        total_fat: totals.fat,
        total_fiber: totals.fiber,
        total_protein: totals.protein,
        water_intake: totals.water,
      });

      // Persist totals to DB in background
      supabase
        .from('daily_logs')
        .update({
          total_calories: totals.calories,
          total_carbs: totals.carbs,
          total_fat: totals.fat,
          total_fiber: totals.fiber,
          total_protein: totals.protein,
          water_intake: totals.water,
        })
        .eq('id', dailyLog.id)
        .then(({ error }) => {
          if (error) console.error('Error updating daily totals:', error);
        });
    }
  };

  const handleDeleteItem = (mealId: string, itemId: string) => {
    const updatedMeals = meals.map(meal => {
      if (meal.id !== mealId) return meal;
      return {
        ...meal,
        meal_items: (meal.meal_items || []).filter(item => item.id !== itemId),
      };
    });
    recalcAndUpdateTotals(updatedMeals);
  };

  const handleDeleteMeal = (mealId: string) => {
    const updatedMeals = meals.filter(meal => meal.id !== mealId);
    recalcAndUpdateTotals(updatedMeals);
  };

  const handleAddMealToState = (newMeal: Meal) => {
    setMeals(prev => [...prev, newMeal]);
  };

  const toggleLock = () => {
    if (!dailyLog) return;
    const newLocked = !dailyLog.is_locked;
    setDailyLog({ ...dailyLog, is_locked: newLocked });

    supabase
      .from('daily_logs')
      .update({ is_locked: newLocked })
      .eq('id', dailyLog.id)
      .then(({ error }) => {
        if (error) console.error('Error toggling lock:', error);
      });
  };

  const isLocked = dailyLog?.is_locked ?? false;

  const updateWaterIntake = (newAmount: number) => {
    if (!dailyLog || newAmount < 0) return;
    const rounded = Math.round(newAmount * 10) / 10;

    setDailyLog({ ...dailyLog, water_intake: rounded });

    // Persist to DB in background
    supabase
      .from('daily_logs')
      .update({ water_intake: rounded })
      .eq('id', dailyLog.id)
      .then(({ error }) => {
        if (error) console.error('Error updating water intake:', error);
      });
  };

  const getMealsForType = (mealType: MealType) => {
    return meals.filter(meal => meal.meal_type === mealType);
  };

  if (loading) {
    return <div className="text-center">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Log Meals</h1>
          <p className="mt-1 text-zinc-600">
            {formatDateFull(selectedDate)}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="date"
            value={pendingDate}
            onChange={(e) => setPendingDate(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') applyDate();
            }}
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm"
          />
          {pendingDate !== selectedDate && (
            <button
              onClick={() => applyDate()}
              className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800"
            >
              Go
            </button>
          )}
        </div>
      </div>

      {dailyLog && (
        <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-4 py-3">
          <div className="flex items-center gap-3">
            <span className={`text-sm font-medium ${isLocked ? 'text-green-700' : 'text-zinc-500'}`}>
              {isLocked ? 'Day Locked' : 'Done Logging?'}
            </span>
          </div>
          <button
            type="button"
            onClick={toggleLock}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              isLocked ? 'bg-green-500' : 'bg-zinc-300'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                isLocked ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      )}

      {dailyLog && (
        <div className="rounded-lg border border-zinc-200 bg-white p-4">
          <h2 className="text-sm font-medium text-zinc-900">Daily Totals</h2>
          <div className="mt-2 grid grid-cols-2 gap-4 text-sm md:grid-cols-6">
            {[
              { label: 'Calories', value: dailyLog.total_calories, goal: dailyGoals?.calories, unit: '', color: 'bg-green-500' },
              { label: 'Protein', value: dailyLog.total_protein, goal: dailyGoals?.protein, unit: 'g', color: 'bg-blue-500' },
              { label: 'Carbs', value: dailyLog.total_carbs, goal: dailyGoals?.carbs, unit: 'g', color: 'bg-orange-500' },
              { label: 'Fat', value: dailyLog.total_fat, goal: dailyGoals?.fat, unit: 'g', color: 'bg-yellow-500' },
              { label: 'Fiber', value: dailyLog.total_fiber, goal: dailyGoals?.fiber, unit: 'g', color: 'bg-purple-500' },
              { label: 'Water', value: dailyLog.water_intake, goal: dailyGoals?.water, unit: ' oz', color: 'bg-pink-500', skipOver: true },
            ].map(({ label, value, goal, unit, color, skipOver }) => {
              const isOver = !skipOver && goal != null && value > goal;
              const progress = goal ? Math.min((value / goal) * 100, 100) : 0;
              return (
                <div key={label}>
                  <p className="text-zinc-600">{label}</p>
                  <p className={`text-lg ${isOver ? 'font-bold text-red-600' : 'font-semibold'}`}>
                    {value}{unit}
                  </p>
                  {goal != null && (
                    <div className="mt-1 h-1.5 w-full rounded-full bg-zinc-100">
                      <div
                        className={`h-1.5 rounded-full ${isOver ? 'bg-red-500' : color}`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="space-y-6">
        {MEAL_TYPES.map(({ type, label }) => (
          <MealSection
            key={type}
            mealType={type}
            mealLabel={label}
            meals={getMealsForType(type)}
            dailyLogId={dailyLog?.id || ''}
            onUpdate={updateDailyTotals}
            onDeleteItem={handleDeleteItem}
            onDeleteMeal={handleDeleteMeal}
            onAddMeal={handleAddMealToState}
            isLocked={isLocked}
          />
        ))}

        {dailyLog && (
          <div className="rounded-lg border border-zinc-200 bg-white p-4">
            <h3 className="font-semibold mb-3">Water Intake</h3>
            {isLocked ? (
              <p className="text-sm text-zinc-600">{dailyLog.water_intake} oz</p>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => updateWaterIntake(dailyLog.water_intake - 8)}
                    disabled={dailyLog.water_intake <= 0}
                    className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-30"
                  >
                    - 8 oz
                  </button>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={dailyLog.water_intake}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        if (!isNaN(val)) updateWaterIntake(val);
                      }}
                      min="0"
                      step="1"
                      className="w-20 rounded-md border border-zinc-300 px-3 py-2 text-center text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                    />
                    <span className="text-sm text-zinc-600">oz</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => updateWaterIntake(dailyLog.water_intake + 8)}
                    className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                  >
                    + 8 oz
                  </button>
                </div>
                <p className="mt-2 text-xs text-zinc-500">
                  8 oz = 1 cup of water
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
