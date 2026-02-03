'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DailyLog } from '@/lib/types';
import { formatDateForDisplay } from '@/lib/utils/date';

interface WeeklyChartProps {
  dailyLogs: DailyLog[];
  metric: 'calories' | 'protein' | 'carbs' | 'fat';
  goal?: number;
}

export function WeeklyChart({ dailyLogs, metric, goal }: WeeklyChartProps) {
  const metricLabels = {
    calories: 'Calories',
    protein: 'Protein (g)',
    carbs: 'Carbs (g)',
    fat: 'Fat (g)',
  };

  const metricKeys = {
    calories: 'total_calories',
    protein: 'total_protein',
    carbs: 'total_carbs',
    fat: 'total_fat',
  };

  const data = dailyLogs.map(log => ({
    date: formatDateForDisplay(log.log_date),
    value: log[metricKeys[metric] as keyof DailyLog] as number,
    goal: goal || 0,
  }));

  return (
    <div className="w-full h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12 }}
            stroke="#71717a"
          />
          <YAxis
            tick={{ fontSize: 12 }}
            stroke="#71717a"
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e4e4e7',
              borderRadius: '6px',
              fontSize: '14px'
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: '14px' }}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#18181b"
            strokeWidth={2}
            name={metricLabels[metric]}
            dot={{ fill: '#18181b', r: 4 }}
            activeDot={{ r: 6 }}
          />
          {goal && goal > 0 && (
            <Line
              type="monotone"
              dataKey="goal"
              stroke="#71717a"
              strokeWidth={2}
              strokeDasharray="5 5"
              name="Goal"
              dot={false}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
