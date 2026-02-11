'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/lib/contexts/auth-context';
import { createClient } from '@/lib/supabase/client';
import { formatDateForDB, formatDateFull } from '@/lib/utils/date';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface WeightLog {
  id: string;
  weight: number;
  log_date: string;
  notes?: string;
  created_at: string;
}

type TimeRange = 'week' | 'month' | 'year' | 'all';

export default function WeightPage() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(formatDateForDB(new Date()));
  const [weight, setWeight] = useState('');
  const [notes, setNotes] = useState('');
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([]);
  const [todaysWeight, setTodaysWeight] = useState<WeightLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [timeRange, setTimeRange] = useState<TimeRange>('month');
  const [showAllLogs, setShowAllLogs] = useState(false);
  const supabase = createClient();

  const draftKey = user?.id ? `weight-draft-${user.id}-${selectedDate}` : null;

  const clearDraft = useCallback(() => {
    if (draftKey) localStorage.removeItem(draftKey);
  }, [draftKey]);

  useEffect(() => {
    if (user) {
      fetchWeightLogs();
      fetchTodaysWeight();
    }
  }, [user, selectedDate]);

  const fetchWeightLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('weight_logs')
        .select('*')
        .eq('user_id', user?.id)
        .order('log_date', { ascending: false });

      if (error) throw error;
      setWeightLogs(data || []);
    } catch (err) {
      console.error('Error fetching weight logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTodaysWeight = async () => {
    try {
      const { data, error } = await supabase
        .from('weight_logs')
        .select('*')
        .eq('user_id', user?.id)
        .eq('log_date', selectedDate)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setTodaysWeight(data);
        setWeight(data.weight.toString());
        setNotes(data.notes || '');
      } else {
        setTodaysWeight(null);
        // Restore draft if exists
        let draftRestored = false;
        if (draftKey) {
          try {
            const saved = localStorage.getItem(draftKey);
            if (saved) {
              const draft = JSON.parse(saved);
              if (draft.weight) setWeight(draft.weight);
              if (draft.notes) setNotes(draft.notes);
              draftRestored = true;
            }
          } catch {}
        }
        if (!draftRestored) {
          setWeight('');
          setNotes('');
        }
      }
    } catch (err) {
      console.error('Error fetching today\'s weight:', err);
    }
  };

  // Save draft on changes
  useEffect(() => {
    if (!draftKey || loading) return;
    // Only save draft if user has typed something and there's no existing DB entry
    if (!weight && !notes) return;
    if (todaysWeight) return; // Don't draft over DB data
    const draft = { weight, notes };
    localStorage.setItem(draftKey, JSON.stringify(draft));
  }, [draftKey, loading, weight, notes, todaysWeight]);

  const handleSave = async () => {
    if (!weight) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('weight_logs')
        .upsert({
          user_id: user?.id,
          log_date: selectedDate,
          weight: parseFloat(weight),
          notes: notes || null,
        }, {
          onConflict: 'user_id,log_date'
        });

      if (error) throw error;

      clearDraft();
      await fetchWeightLogs();
      await fetchTodaysWeight();
    } catch (err) {
      console.error('Error saving weight:', err);
      alert('Failed to save weight');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this weight entry?')) return;

    try {
      const { error } = await supabase
        .from('weight_logs')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await fetchWeightLogs();
      await fetchTodaysWeight();
    } catch (err) {
      console.error('Error deleting weight:', err);
      alert('Failed to delete weight entry');
    }
  };

  const getWeightChange = () => {
    if (weightLogs.length < 2) return null;

    const currentWeight = weightLogs[0].weight;
    const previousWeight = weightLogs[1].weight;
    const change = currentWeight - previousWeight;

    return {
      amount: Math.abs(change),
      direction: change > 0 ? 'up' : change < 0 ? 'down' : 'same',
    };
  };

  const filteredChartData = useMemo(() => {
    if (weightLogs.length === 0) return [];

    const now = new Date();
    let cutoffDate = new Date();

    switch (timeRange) {
      case 'week':
        cutoffDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        cutoffDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        cutoffDate = new Date(now.getFullYear(), 0, 1);
        break;
      case 'all':
        cutoffDate = new Date(0);
        break;
    }

    return weightLogs
      .filter(log => new Date(log.log_date) >= cutoffDate)
      .reverse()
      .map(log => ({
        date: log.log_date,
        weight: log.weight,
        displayDate: new Date(log.log_date).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric'
        }),
      }));
  }, [weightLogs, timeRange]);

  const weightStats = useMemo(() => {
    if (filteredChartData.length === 0) return null;

    const weights = filteredChartData.map(d => d.weight);
    const highest = Math.max(...weights);
    const lowest = Math.min(...weights);
    const average = weights.reduce((a, b) => a + b, 0) / weights.length;
    const change = weights[weights.length - 1] - weights[0];

    return {
      highest,
      lowest,
      average: Math.round(average * 10) / 10,
      change: Math.round(change * 10) / 10,
    };
  }, [filteredChartData]);

  const weightChange = getWeightChange();

  if (loading) {
    return <div className="text-center">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Weight Tracker</h1>
        <p className="mt-1 text-zinc-600">Track your daily weight</p>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Log Weight</h2>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm"
          />
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-sm font-medium text-zinc-900 mb-1">
              Weight (lbs)
            </label>
            <input
              type="number"
              step="0.1"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
              placeholder="Enter weight"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-zinc-900 mb-1">
              Notes (optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
              placeholder="Optional notes"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={!weight || saving}
          className="w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
        >
          {saving ? 'Saving...' : todaysWeight ? 'Update Weight' : 'Save Weight'}
        </button>

        {weightChange && (
          <div className="mt-4 rounded-md bg-zinc-50 p-4">
            <p className="text-sm text-zinc-600">
              {weightChange.direction === 'up' && (
                <span className="text-red-600">
                  ↑ {weightChange.amount.toFixed(1)} lbs since last entry
                </span>
              )}
              {weightChange.direction === 'down' && (
                <span className="text-green-600">
                  ↓ {weightChange.amount.toFixed(1)} lbs since last entry
                </span>
              )}
              {weightChange.direction === 'same' && (
                <span className="text-zinc-600">No change since last entry</span>
              )}
            </p>
          </div>
        )}
      </div>

      {weightLogs.length > 0 && (
        <div className="rounded-lg border border-zinc-200 bg-white p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Weight Chart</h2>
            <div className="flex gap-2">
              {(['week', 'month', 'year', 'all'] as TimeRange[]).map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-3 py-1 rounded-md text-sm font-medium ${
                    timeRange === range
                      ? 'bg-zinc-900 text-white'
                      : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                  }`}
                >
                  {range.charAt(0).toUpperCase() + range.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {weightStats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="rounded-md bg-zinc-50 p-3">
                <p className="text-zinc-600">Highest</p>
                <p className="text-lg font-semibold">{weightStats.highest} lbs</p>
              </div>
              <div className="rounded-md bg-zinc-50 p-3">
                <p className="text-zinc-600">Lowest</p>
                <p className="text-lg font-semibold">{weightStats.lowest} lbs</p>
              </div>
              <div className="rounded-md bg-zinc-50 p-3">
                <p className="text-zinc-600">Average</p>
                <p className="text-lg font-semibold">{weightStats.average} lbs</p>
              </div>
              <div className="rounded-md bg-zinc-50 p-3">
                <p className="text-zinc-600">Change</p>
                <p className={`text-lg font-semibold ${
                  weightStats.change > 0 ? 'text-red-600' :
                  weightStats.change < 0 ? 'text-green-600' :
                  'text-zinc-900'
                }`}>
                  {weightStats.change > 0 ? '+' : ''}{weightStats.change} lbs
                </p>
              </div>
            </div>
          )}

          {filteredChartData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={filteredChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="displayDate"
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis
                    domain={['dataMin - 5', 'dataMax + 5']}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e4e4e7',
                      borderRadius: '6px'
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="weight"
                    stroke="#18181b"
                    strokeWidth={2}
                    dot={{ fill: '#18181b', r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-center text-zinc-500 py-8">
              No data available for the selected time range
            </p>
          )}
        </div>
      )}

      <div className="rounded-lg border border-zinc-200 bg-white p-6">
        <h2 className="text-lg font-semibold mb-4">Weight History</h2>

        {weightLogs.length === 0 ? (
          <p className="text-center text-zinc-500 py-8">No weight entries yet</p>
        ) : (
          <div className="space-y-2">
            {(showAllLogs ? weightLogs : weightLogs.slice(0, 5)).map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between rounded-lg border border-zinc-200 p-4 hover:bg-zinc-50"
              >
                <div>
                  <p className="font-medium">{formatDateFull(log.log_date)}</p>
                  <p className="text-sm text-zinc-600">{log.weight} lbs</p>
                  {log.notes && (
                    <p className="text-sm text-zinc-500 italic mt-1">{log.notes}</p>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(log.id)}
                  className="text-sm text-red-600 hover:text-red-800"
                >
                  Delete
                </button>
              </div>
            ))}
            {weightLogs.length > 5 && (
              <button
                onClick={() => setShowAllLogs(!showAllLogs)}
                className="w-full rounded-md border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors"
              >
                {showAllLogs ? 'Show less' : `Show all (${weightLogs.length} entries)`}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
