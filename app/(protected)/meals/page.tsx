'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/contexts/auth-context';
import { createClient } from '@/lib/supabase/client';
import { Meal, MealType, DailyLog } from '@/lib/types';
import { formatDateForDB, formatDateFull } from '@/lib/utils/date';
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
  const dateParam = searchParams.get('date');
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(dateParam || formatDateForDB(new Date()));
  const [dailyLog, setDailyLog] = useState<DailyLog | null>(null);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    if (user && selectedDate) {
      fetchDayData();
    }
  }, [user, selectedDate]);

  const fetchDayData = async () => {
    setLoading(true);
    try {
      // Helper function to get Sunday of the week for any date
      const getWeekStart = (date: Date) => {
        const d = new Date(date);
        const day = d.getDay();
        d.setDate(d.getDate() - day); // Sunday is day 0
        return formatDateForDB(d);
      };

      const getWeekEnd = (startDate: string) => {
        const d = new Date(startDate + 'T00:00:00');
        d.setDate(d.getDate() + 6); // Saturday is 6 days after Sunday
        return formatDateForDB(d);
      };

      const weekStart = getWeekStart(new Date(selectedDate + 'T00:00:00'));
      const weekEnd = getWeekEnd(weekStart);

      // Try to find a week that contains the selected date
      let { data: week, error: weekError } = await supabase
        .from('weeks')
        .select('*')
        .eq('user_id', user?.id)
        .lte('start_date', selectedDate)
        .gte('end_date', selectedDate)
        .single();

      if (weekError && weekError.code !== 'PGRST116') {
        // If no containing week found, try exact Sunday start match
        const { data: exactWeek, error: exactError } = await supabase
          .from('weeks')
          .select('*')
          .eq('user_id', user?.id)
          .eq('start_date', weekStart)
          .single();

        if (exactError && exactError.code !== 'PGRST116') {
          throw exactError;
        }
        week = exactWeek;
      }

      // Create week if it doesn't exist
      if (!week) {
        const { data: newWeek, error: createWeekError } = await supabase
          .from('weeks')
          .insert({
            user_id: user?.id,
            start_date: weekStart,
            end_date: weekEnd,
          })
          .select()
          .single();

        if (createWeekError) throw createWeekError;
        week = newWeek;
      }

      // Fetch or create daily log
      let { data: log, error: logError } = await supabase
        .from('daily_logs')
        .select('*')
        .eq('user_id', user?.id)
        .eq('log_date', selectedDate)
        .single();

      if (logError && logError.code !== 'PGRST116') {
        throw logError;
      }

      // Create daily log if it doesn't exist
      if (!log) {
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

        if (createError) throw createError;
        log = newLog;
      }

      setDailyLog(log);

      // Fetch meals with items
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
      // Fetch all meals with items
      const { data: mealsData, error } = await supabase
        .from('meals')
        .select(`
          *,
          meal_items (*)
        `)
        .eq('daily_log_id', dailyLog.id);

      if (error) throw error;

      const totals = calculateDailyTotals(mealsData || []);

      // Update daily log
      const { error: updateError } = await supabase
        .from('daily_logs')
        .update({
          total_calories: totals.calories,
          total_carbs: totals.carbs,
          total_fat: totals.fat,
          total_fiber: totals.fiber,
          total_protein: totals.protein,
          water_intake: totals.water,
        })
        .eq('id', dailyLog.id);

      if (updateError) throw updateError;

      // Refresh data
      await fetchDayData();
    } catch (err) {
      console.error('Error updating daily totals:', err);
    }
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

        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="rounded-md border border-zinc-300 px-4 py-2 text-sm"
        />
      </div>

      {dailyLog && (
        <div className="rounded-lg border border-zinc-200 bg-white p-4">
          <h2 className="text-sm font-medium text-zinc-900">Daily Totals</h2>
          <div className="mt-2 grid grid-cols-2 gap-4 text-sm md:grid-cols-6">
            <div>
              <p className="text-zinc-600">Calories</p>
              <p className="text-lg font-semibold">{dailyLog.total_calories}</p>
            </div>
            <div>
              <p className="text-zinc-600">Protein</p>
              <p className="text-lg font-semibold">{dailyLog.total_protein}g</p>
            </div>
            <div>
              <p className="text-zinc-600">Carbs</p>
              <p className="text-lg font-semibold">{dailyLog.total_carbs}g</p>
            </div>
            <div>
              <p className="text-zinc-600">Fat</p>
              <p className="text-lg font-semibold">{dailyLog.total_fat}g</p>
            </div>
            <div>
              <p className="text-zinc-600">Fiber</p>
              <p className="text-lg font-semibold">{dailyLog.total_fiber}g</p>
            </div>
            <div>
              <p className="text-zinc-600">Water</p>
              <p className="text-lg font-semibold">{dailyLog.water_intake} oz</p>
            </div>
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
          />
        ))}
      </div>
    </div>
  );
}
