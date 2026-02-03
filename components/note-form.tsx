'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface NoteFormProps {
  mealId: string;
  onSave: () => void;
  onCancel: () => void;
}

export function NoteForm({ mealId, onSave, onCancel }: NoteFormProps) {
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const handleSave = async () => {
    if (!note.trim()) {
      setError('Please enter a note');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Get the next order number
      const { data: existingItems, error: fetchError } = await supabase
        .from('meal_items')
        .select('"order"')
        .eq('meal_id', mealId)
        .order('"order"', { ascending: false })
        .limit(1);

      if (fetchError) throw fetchError;

      const nextOrder = existingItems && existingItems.length > 0
        ? existingItems[0].order + 1
        : 1;

      // Insert the meal item as a note (0 calories, just the note text)
      const { error: insertError } = await supabase
        .from('meal_items')
        .insert({
          meal_id: mealId,
          food_name: 'Note',
          amount: '-',
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
          fiber: 0,
          notes: note,
          order: nextOrder,
        });

      if (insertError) throw insertError;

      onSave();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3 rounded-lg border border-zinc-300 bg-zinc-50 p-4">
      {error && (
        <div className="rounded-md bg-red-50 p-2 text-sm text-red-600">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="note" className="block text-sm font-medium text-zinc-900 mb-1">
          Add a Note
        </label>
        <textarea
          id="note"
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
          placeholder="e.g., Felt bloated after this meal, drank extra water today..."
        />
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={loading || !note.trim()}
          className="flex-1 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
        >
          {loading ? 'Adding...' : 'Add Note'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
