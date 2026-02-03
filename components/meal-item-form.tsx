'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { createClient } from '@/lib/supabase/client';
import { FoodSearchModal } from './food-search-modal';

const mealItemSchema = z.object({
  food_name: z.string().min(1, 'Food name is required'),
  amount: z.string().min(1, 'Amount is required'),
  calories: z.number().min(0, 'Calories must be positive'),
  protein: z.number().min(0).optional(),
  carbs: z.number().min(0).optional(),
  fat: z.number().min(0).optional(),
  fiber: z.number().min(0).optional(),
  notes: z.string().optional(),
});

type MealItemFormData = z.infer<typeof mealItemSchema>;

interface MealItemFormProps {
  mealId: string;
  onSave: () => void;
  onCancel: () => void;
}

export function MealItemForm({ mealId, onSave, onCancel }: MealItemFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const supabase = createClient();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<MealItemFormData>({
    resolver: zodResolver(mealItemSchema),
    defaultValues: {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
    },
  });

  const handleFoodSelect = (food: {
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    defaultAmount: string;
  }) => {
    setValue('food_name', food.name);
    setValue('amount', food.defaultAmount);
    setValue('calories', food.calories);
    setValue('protein', food.protein);
    setValue('carbs', food.carbs);
    setValue('fat', food.fat);
    setValue('fiber', food.fiber);
  };

  const onSubmit = async (data: MealItemFormData) => {
    setLoading(true);
    setError(null);

    try {
      // Get the next order number
      const { data: existingItems, error: fetchError } = await supabase
        .from('meal_items')
        .select('order')
        .eq('meal_id', mealId)
        .order('order', { ascending: false })
        .limit(1);

      if (fetchError) throw fetchError;

      const nextOrder = existingItems && existingItems.length > 0
        ? existingItems[0].order + 1
        : 1;

      // Insert the meal item
      const { error: insertError } = await supabase
        .from('meal_items')
        .insert({
          meal_id: mealId,
          food_name: data.food_name,
          amount: data.amount,
          calories: data.calories,
          protein: data.protein || 0,
          carbs: data.carbs || 0,
          fat: data.fat || 0,
          fiber: data.fiber || 0,
          notes: data.notes || null,
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
    <>
      <FoodSearchModal
        isOpen={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
        onSelect={handleFoodSelect}
      />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 rounded-lg border border-zinc-300 bg-zinc-50 p-4">
        {error && (
          <div className="rounded-md bg-red-50 p-2 text-sm text-red-600">
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={() => setSearchModalOpen(true)}
          className="w-full rounded-md border-2 border-dashed border-zinc-300 px-4 py-3 text-sm font-medium text-zinc-600 hover:border-zinc-400 hover:text-zinc-900"
        >
          🔍 Search Food Database
        </button>

        <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label htmlFor="food_name" className="block text-sm font-medium text-zinc-900">
            Food Name
          </label>
          <input
            id="food_name"
            type="text"
            {...register('food_name')}
            className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
            placeholder="e.g., Chicken breast"
          />
          {errors.food_name && (
            <p className="mt-1 text-sm text-red-600">{errors.food_name.message}</p>
          )}
        </div>

        <div className="col-span-2">
          <label htmlFor="amount" className="block text-sm font-medium text-zinc-900">
            Amount
          </label>
          <input
            id="amount"
            type="text"
            {...register('amount')}
            className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
            placeholder="e.g., 4 oz, 1 cup"
          />
          {errors.amount && (
            <p className="mt-1 text-sm text-red-600">{errors.amount.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="calories" className="block text-sm font-medium text-zinc-900">
            Calories
          </label>
          <input
            id="calories"
            type="number"
            {...register('calories', { valueAsNumber: true })}
            className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
          />
          {errors.calories && (
            <p className="mt-1 text-sm text-red-600">{errors.calories.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="protein" className="block text-sm font-medium text-zinc-900">
            Protein (g)
          </label>
          <input
            id="protein"
            type="number"
            {...register('protein', { valueAsNumber: true })}
            className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
          />
        </div>

        <div>
          <label htmlFor="carbs" className="block text-sm font-medium text-zinc-900">
            Carbs (g)
          </label>
          <input
            id="carbs"
            type="number"
            {...register('carbs', { valueAsNumber: true })}
            className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
          />
        </div>

        <div>
          <label htmlFor="fat" className="block text-sm font-medium text-zinc-900">
            Fat (g)
          </label>
          <input
            id="fat"
            type="number"
            {...register('fat', { valueAsNumber: true })}
            className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
          />
        </div>

        <div className="col-span-2">
          <label htmlFor="notes" className="block text-sm font-medium text-zinc-900">
            Notes (optional)
          </label>
          <textarea
            id="notes"
            rows={2}
            {...register('notes')}
            className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
            placeholder="Any additional notes..."
          />
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
        >
          {loading ? 'Adding...' : 'Add Food'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          Cancel
        </button>
      </div>
      </form>
    </>
  );
}
