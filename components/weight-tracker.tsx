'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/lib/contexts/auth-context';
import { createClient } from '@/lib/supabase/client';
import { WeightLog } from '@/lib/types';
import { formatDateForDB, formatDateForDisplay } from '@/lib/utils/date';

const weightLogSchema = z.object({
  weight: z.number().min(0, 'Weight must be positive'),
  log_date: z.string(),
  notes: z.string().optional(),
});

type WeightLogFormData = z.infer<typeof weightLogSchema>;

export function WeightTracker() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<WeightLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<WeightLogFormData>({
    resolver: zodResolver(weightLogSchema),
    defaultValues: {
      log_date: formatDateForDB(new Date()),
    },
  });

  useEffect(() => {
    if (user) {
      fetchWeightLogs();
    }
  }, [user]);

  const fetchWeightLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('weight_logs')
        .select('*')
        .eq('user_id', user?.id)
        .order('log_date', { ascending: false })
        .limit(10);

      if (error) throw error;
      setLogs(data || []);
    } catch (err) {
      console.error('Error fetching weight logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: WeightLogFormData) => {
    setSaving(true);
    setError(null);

    try {
      const { error: insertError } = await supabase
        .from('weight_logs')
        .insert({
          user_id: user?.id,
          weight: data.weight,
          log_date: data.log_date,
          notes: data.notes || null,
        });

      if (insertError) throw insertError;

      reset({
        log_date: formatDateForDB(new Date()),
        notes: '',
      });
      await fetchWeightLogs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to log weight');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('weight_logs')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchWeightLogs();
    } catch (err) {
      console.error('Error deleting weight log:', err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-zinc-200 bg-white p-6">
        <h2 className="text-lg font-semibold mb-4">Log Weight</h2>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-4 text-sm text-red-600">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="weight" className="block text-sm font-medium text-zinc-900">
                Weight (lbs)
              </label>
              <input
                id="weight"
                type="number"
                step="0.1"
                {...register('weight', { valueAsNumber: true })}
                className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
              />
              {errors.weight && (
                <p className="mt-1 text-sm text-red-600">{errors.weight.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="log_date" className="block text-sm font-medium text-zinc-900">
                Date
              </label>
              <input
                id="log_date"
                type="date"
                {...register('log_date')}
                className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
              />
              {errors.log_date && (
                <p className="mt-1 text-sm text-red-600">{errors.log_date.message}</p>
              )}
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="notes" className="block text-sm font-medium text-zinc-900">
                Notes (optional)
              </label>
              <textarea
                id="notes"
                rows={2}
                {...register('notes')}
                className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                placeholder="Any notes about this weigh-in..."
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Logging...' : 'Log Weight'}
          </button>
        </form>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-6">
        <h2 className="text-lg font-semibold mb-4">Weight History</h2>

        {loading ? (
          <p className="text-sm text-zinc-500">Loading...</p>
        ) : logs.length === 0 ? (
          <p className="text-sm text-zinc-500">No weight logs yet. Add your first entry above.</p>
        ) : (
          <div className="space-y-2">
            {logs.map((log) => (
              <div
                key={log.id}
                className="flex items-start justify-between rounded-lg border border-zinc-200 p-3"
              >
                <div>
                  <p className="font-medium">{log.weight} lbs</p>
                  <p className="text-sm text-zinc-600">
                    {formatDateForDisplay(log.log_date)}
                  </p>
                  {log.notes && (
                    <p className="mt-1 text-sm text-zinc-500">{log.notes}</p>
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
          </div>
        )}
      </div>
    </div>
  );
}
