'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/contexts/auth-context';
import { createClient } from '@/lib/supabase/client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const foodSchema = z.object({
  name: z.string().min(1, 'Food name is required'),
  default_amount: z.string().min(1, 'Default amount is required'),
  calories_per_serving: z.number().min(0, 'Calories must be positive'),
  protein_per_serving: z.number().min(0).optional(),
  carbs_per_serving: z.number().min(0).optional(),
  fat_per_serving: z.number().min(0).optional(),
  fiber_per_serving: z.number().min(0).optional(),
  water_per_serving: z.number().min(0).optional(),
});

type FoodFormData = z.infer<typeof foodSchema>;

interface Food {
  id: string;
  name: string;
  default_amount: string;
  calories_per_serving: number;
  protein_per_serving?: number;
  carbs_per_serving?: number;
  fat_per_serving?: number;
  fiber_per_serving?: number;
  water_per_serving?: number;
  usage_count: number;
}

export default function FoodsPage() {
  const { user } = useAuth();
  const [foods, setFoods] = useState<Food[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const supabase = createClient();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FoodFormData>({
    resolver: zodResolver(foodSchema),
    defaultValues: {
      calories_per_serving: 0,
      protein_per_serving: 0,
      carbs_per_serving: 0,
      fat_per_serving: 0,
      fiber_per_serving: 0,
      water_per_serving: 0,
    },
  });

  useEffect(() => {
    if (user) {
      fetchFoods();
    }
  }, [user]);

  const fetchFoods = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('foods')
        .select('*')
        .eq('user_id', user?.id)
        .order('name');

      if (error) throw error;
      setFoods(data || []);
    } catch (err) {
      console.error('Error fetching foods:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (data: FoodFormData) => {
    try {
      const { error } = await supabase
        .from('foods')
        .insert({
          user_id: user?.id,
          name: data.name,
          default_amount: data.default_amount,
          calories_per_serving: data.calories_per_serving,
          protein_per_serving: data.protein_per_serving || 0,
          carbs_per_serving: data.carbs_per_serving || 0,
          fat_per_serving: data.fat_per_serving || 0,
          fiber_per_serving: data.fiber_per_serving || 0,
          water_per_serving: data.water_per_serving || 0,
        });

      if (error) throw error;

      reset();
      setAdding(false);
      await fetchFoods();
    } catch (err) {
      console.error('Error adding food:', err);
      alert('Failed to add food');
    }
  };

  const handleUpdate = async (foodId: string, data: FoodFormData) => {
    try {
      const { error } = await supabase
        .from('foods')
        .update({
          name: data.name,
          default_amount: data.default_amount,
          calories_per_serving: data.calories_per_serving,
          protein_per_serving: data.protein_per_serving || 0,
          carbs_per_serving: data.carbs_per_serving || 0,
          fat_per_serving: data.fat_per_serving || 0,
          fiber_per_serving: data.fiber_per_serving || 0,
          water_per_serving: data.water_per_serving || 0,
        })
        .eq('id', foodId);

      if (error) throw error;

      setEditing(null);
      reset();
      await fetchFoods();
    } catch (err) {
      console.error('Error updating food:', err);
      alert('Failed to update food');
    }
  };

  const handleDelete = async (foodId: string) => {
    if (!confirm('Are you sure you want to delete this food?')) return;

    try {
      const { error } = await supabase
        .from('foods')
        .delete()
        .eq('id', foodId);

      if (error) throw error;
      await fetchFoods();
    } catch (err) {
      console.error('Error deleting food:', err);
      alert('Failed to delete food');
    }
  };

  const startEdit = (food: Food) => {
    setEditing(food.id);
    reset({
      name: food.name,
      default_amount: food.default_amount,
      calories_per_serving: food.calories_per_serving,
      protein_per_serving: food.protein_per_serving || 0,
      carbs_per_serving: food.carbs_per_serving || 0,
      fat_per_serving: food.fat_per_serving || 0,
      fiber_per_serving: food.fiber_per_serving || 0,
      water_per_serving: food.water_per_serving || 0,
    });
  };

  const filteredFoods = foods.filter(food =>
    food.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return <div className="text-center">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">My Foods</h1>
          <p className="mt-1 text-zinc-600">Manage your food library</p>
        </div>

        <button
          onClick={() => {
            setAdding(!adding);
            if (!adding) {
              setEditing(null);
              reset();
            }
          }}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          {adding ? 'Cancel' : '+ New Food'}
        </button>
      </div>

      {adding && (
        <form
          onSubmit={handleSubmit(handleAdd)}
          className="rounded-lg border border-zinc-200 bg-white p-6 space-y-4"
        >
          <h2 className="text-lg font-semibold">Add New Food</h2>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-zinc-900">Food Name</label>
              <input
                type="text"
                {...register('name')}
                className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
                placeholder="e.g., Chicken Breast"
              />
              {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-zinc-900">Default Amount</label>
              <input
                type="text"
                {...register('default_amount')}
                className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
                placeholder="e.g., 1 cup, 1/2 cup"
              />
              {errors.default_amount && <p className="mt-1 text-sm text-red-600">{errors.default_amount.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-900">Calories</label>
              <input
                type="number"
                {...register('calories_per_serving', { valueAsNumber: true })}
                className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
              />
              {errors.calories_per_serving && <p className="mt-1 text-sm text-red-600">{errors.calories_per_serving.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-900">Protein (g)</label>
              <input
                type="number"
                step="0.1"
                {...register('protein_per_serving', { valueAsNumber: true })}
                className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-900">Carbs (g)</label>
              <input
                type="number"
                step="0.1"
                {...register('carbs_per_serving', { valueAsNumber: true })}
                className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-900">Fat (g)</label>
              <input
                type="number"
                step="0.1"
                {...register('fat_per_serving', { valueAsNumber: true })}
                className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-900">Fiber (g)</label>
              <input
                type="number"
                step="0.1"
                {...register('fiber_per_serving', { valueAsNumber: true })}
                className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-900">Water (oz)</label>
              <input
                type="number"
                step="0.1"
                {...register('water_per_serving', { valueAsNumber: true })}
                className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
          >
            Add Food
          </button>
        </form>
      )}

      <div className="rounded-lg border border-zinc-200 bg-white p-6">
        <div className="flex items-center justify-between mb-4">
          <input
            type="text"
            placeholder="Search foods..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm"
          />
          <span className="ml-3 text-sm text-zinc-500 whitespace-nowrap">{foods.length} foods</span>
        </div>

        {filteredFoods.length === 0 ? (
          <p className="text-center text-zinc-500">No foods found</p>
        ) : (
          <div className="space-y-2">
            {filteredFoods.map((food) => (
              <div key={food.id}>
                {editing === food.id ? (
                  <form
                    onSubmit={handleSubmit((data) => handleUpdate(food.id, data))}
                    className="rounded-lg border border-zinc-300 bg-zinc-50 p-4 space-y-3"
                  >
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2">
                        <input
                          type="text"
                          {...register('name')}
                          className="block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="text"
                          {...register('default_amount')}
                          className="block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-zinc-600">Calories</label>
                        <input
                          type="number"
                          {...register('calories_per_serving', { valueAsNumber: true })}
                          className="block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-zinc-600">Protein (g)</label>
                        <input
                          type="number"
                          step="0.1"
                          {...register('protein_per_serving', { valueAsNumber: true })}
                          className="block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-zinc-600">Carbs (g)</label>
                        <input
                          type="number"
                          step="0.1"
                          {...register('carbs_per_serving', { valueAsNumber: true })}
                          className="block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-zinc-600">Fat (g)</label>
                        <input
                          type="number"
                          step="0.1"
                          {...register('fat_per_serving', { valueAsNumber: true })}
                          className="block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-zinc-600">Fiber (g)</label>
                        <input
                          type="number"
                          step="0.1"
                          {...register('fiber_per_serving', { valueAsNumber: true })}
                          className="block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-zinc-600">Water (oz)</label>
                        <input
                          type="number"
                          step="0.1"
                          {...register('water_per_serving', { valueAsNumber: true })}
                          className="block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        className="flex-1 rounded-md bg-zinc-900 px-3 py-1.5 text-sm text-white hover:bg-zinc-800"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditing(null);
                          reset();
                        }}
                        className="flex-1 rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="flex items-center justify-between rounded-lg border border-zinc-200 p-4 hover:bg-zinc-50">
                    <div className="flex-1">
                      <p className="font-medium">{food.name}</p>
                      <p className="text-sm text-zinc-600">{food.default_amount}</p>
                      <p className="text-xs text-zinc-500 mt-1">
                        {food.calories_per_serving} cal
                        {food.protein_per_serving ? ` | P: ${food.protein_per_serving}g` : ''}
                        {food.carbs_per_serving ? ` | C: ${food.carbs_per_serving}g` : ''}
                        {food.fat_per_serving ? ` | F: ${food.fat_per_serving}g` : ''}
                        {food.fiber_per_serving ? ` | Fiber: ${food.fiber_per_serving}g` : ''}
                        {food.water_per_serving ? ` | Water: ${food.water_per_serving}oz` : ''}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => startEdit(food)}
                        className="text-sm text-zinc-600 hover:text-zinc-900"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(food.id)}
                        className="text-sm text-red-600 hover:text-red-800"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
