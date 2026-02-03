'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/contexts/auth-context';
import { createClient } from '@/lib/supabase/client';
import { DailyLog, DailyGoals } from '@/lib/types';
import {
  getWeekStart,
  getDaysInWeek,
  formatDateForDB,
  formatDateForDisplay,
  getWeekRangeString,
} from '@/lib/utils/date';
import { addDays, subDays } from 'date-fns';
import Link from 'next/link';

interface DailyData {
  date: Date;
  dateString: string;
  log?: DailyLog;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [currentWeekStart, setCurrentWeekStart] = useState(getWeekStart());
  const [dailyData, setDailyData] = useState<DailyData[]>([]);
  const [dailyGoals, setDailyGoals] = useState<DailyGoals | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    if (user) {
      fetchDailyGoals();
      fetchWeekData();
    }
  }, [user, currentWeekStart]);

  const fetchDailyGoals = async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('daily_goals')
        .eq('user_id', user?.id)
        .single();

      if (error) throw error;
      setDailyGoals(data?.daily_goals || null);
    } catch (err) {
      console.error('Error fetching daily goals:', err);
    }
  };

  const fetchWeekData = async () => {
    setLoading(true);
    try {
      const daysInWeek = getDaysInWeek(currentWeekStart);
      const startDate = formatDateForDB(daysInWeek[0]);
      const endDate = formatDateForDB(daysInWeek[6]);

      const { data: logs, error } = await supabase
        .from('daily_logs')
        .select('*')
        .eq('user_id', user?.id)
        .gte('log_date', startDate)
        .lte('log_date', endDate)
        .order('log_date');

      if (error) throw error;

      const logsMap = new Map(logs?.map(log => [log.log_date, log]) || []);

      const data: DailyData[] = daysInWeek.map(date => ({
        date,
        dateString: formatDateForDB(date),
        log: logsMap.get(formatDateForDB(date)),
      }));

      setDailyData(data);
    } catch (err) {
      console.error('Error fetching week data:', err);
    } finally {
      setLoading(false);
    }
  };

  const goToPreviousWeek = () => {
    setCurrentWeekStart(prev => subDays(prev, 7));
  };

  const goToNextWeek = () => {
    setCurrentWeekStart(prev => addDays(prev, 7));
  };

  const goToCurrentWeek = () => {
    setCurrentWeekStart(getWeekStart());
  };

  const calculateProgress = (actual: number, goal: number) => {
    if (!goal) return 0;
    return Math.min((actual / goal) * 100, 100);
  };

  if (loading) {
    return <div className="text-center">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Dashboard</h1>
          <p className="mt-1 text-zinc-600">
            {getWeekRangeString(currentWeekStart)}
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={goToPreviousWeek}
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-50"
          >
            Previous
          </button>
          <button
            onClick={goToCurrentWeek}
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-50"
          >
            Today
          </button>
          <button
            onClick={goToNextWeek}
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-50"
          >
            Next
          </button>
        </div>
      </div>

      {dailyGoals && (
        <div className="rounded-lg border border-zinc-200 bg-white p-4">
          <h2 className="text-sm font-medium text-zinc-900">Daily Goals</h2>
          <div className="mt-2 grid grid-cols-2 gap-4 text-sm md:grid-cols-6">
            <div>
              <p className="text-zinc-600">Calories</p>
              <p className="font-medium">{dailyGoals.calories}</p>
            </div>
            <div>
              <p className="text-zinc-600">Protein</p>
              <p className="font-medium">{dailyGoals.protein}g</p>
            </div>
            <div>
              <p className="text-zinc-600">Carbs</p>
              <p className="font-medium">{dailyGoals.carbs}g</p>
            </div>
            <div>
              <p className="text-zinc-600">Fat</p>
              <p className="font-medium">{dailyGoals.fat}g</p>
            </div>
            <div>
              <p className="text-zinc-600">Fiber</p>
              <p className="font-medium">{dailyGoals.fiber}g</p>
            </div>
            <div>
              <p className="text-zinc-600">Water</p>
              <p className="font-medium">{dailyGoals.water} oz</p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {dailyData.map(({ date, dateString, log }) => (
          <div
            key={dateString}
            className="rounded-lg border border-zinc-200 bg-white p-6"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold">{formatDateForDisplay(date)}</h3>
                {log ? (
                  <div className="mt-3 grid grid-cols-2 gap-4 text-sm md:grid-cols-6">
                    <div>
                      <p className="text-zinc-600">Calories</p>
                      <p className="font-medium">{log.total_calories}</p>
                      {dailyGoals && (
                        <div className="mt-1 h-1.5 w-full rounded-full bg-zinc-100">
                          <div
                            className="h-1.5 rounded-full bg-green-500"
                            style={{
                              width: `${calculateProgress(log.total_calories, dailyGoals.calories)}%`,
                            }}
                          />
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-zinc-600">Protein</p>
                      <p className="font-medium">{log.total_protein}g</p>
                      {dailyGoals && (
                        <div className="mt-1 h-1.5 w-full rounded-full bg-zinc-100">
                          <div
                            className="h-1.5 rounded-full bg-blue-500"
                            style={{
                              width: `${calculateProgress(log.total_protein, dailyGoals.protein)}%`,
                            }}
                          />
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-zinc-600">Carbs</p>
                      <p className="font-medium">{log.total_carbs}g</p>
                      {dailyGoals && (
                        <div className="mt-1 h-1.5 w-full rounded-full bg-zinc-100">
                          <div
                            className="h-1.5 rounded-full bg-orange-500"
                            style={{
                              width: `${calculateProgress(log.total_carbs, dailyGoals.carbs)}%`,
                            }}
                          />
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-zinc-600">Fat</p>
                      <p className="font-medium">{log.total_fat}g</p>
                      {dailyGoals && (
                        <div className="mt-1 h-1.5 w-full rounded-full bg-zinc-100">
                          <div
                            className="h-1.5 rounded-full bg-yellow-500"
                            style={{
                              width: `${calculateProgress(log.total_fat, dailyGoals.fat)}%`,
                            }}
                          />
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-zinc-600">Fiber</p>
                      <p className="font-medium">{log.total_fiber}g</p>
                      {dailyGoals && (
                        <div className="mt-1 h-1.5 w-full rounded-full bg-zinc-100">
                          <div
                            className="h-1.5 rounded-full bg-purple-500"
                            style={{
                              width: `${calculateProgress(log.total_fiber, dailyGoals.fiber)}%`,
                            }}
                          />
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-zinc-600">Water</p>
                      <p className="font-medium">{log.water_intake} oz</p>
                      {dailyGoals && (
                        <div className="mt-1 h-1.5 w-full rounded-full bg-zinc-100">
                          <div
                            className="h-1.5 rounded-full bg-pink-500"
                            style={{
                              width: `${calculateProgress(log.water_intake, dailyGoals.water)}%`,
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-zinc-500">No meals logged yet</p>
                )}
              </div>

              <Link
                href={`/meals?date=${dateString}`}
                className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-pink-500 transition-colors"
              >
                {log ? 'View / Edit' : 'Log Meals'}
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
