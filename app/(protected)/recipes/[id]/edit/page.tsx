'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/lib/contexts/auth-context';
import { createClient } from '@/lib/supabase/client';
import { RecipeItemForm } from '@/components/recipe-item-form';
import type { Recipe, RecipeItem } from '@/lib/types';

const recipeSchema = z.object({
  name: z.string().min(1, 'Recipe name is required'),
  servings: z.number().min(1, 'Must make at least 1 serving'),
  notes: z.string().optional(),
});

type RecipeFormData = z.infer<typeof recipeSchema>;

interface RecipeIngredient {
  id?: string;
  food_name: string;
  amount: string;
  calories: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  water?: number;
}

export default function EditRecipePage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const recipeId = params.id as string;
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([]);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<RecipeFormData>({
    resolver: zodResolver(recipeSchema),
  });

  useEffect(() => {
    if (recipeId) {
      fetchRecipe();
    }
  }, [recipeId]);

  const fetchRecipe = async () => {
    try {
      const { data: recipeData, error: recipeError } = await supabase
        .from('recipes')
        .select('*')
        .eq('id', recipeId)
        .single();

      if (recipeError) throw recipeError;

      const { data: itemsData, error: itemsError } = await supabase
        .from('recipe_items')
        .select('*')
        .eq('recipe_id', recipeId)
        .order('order');

      if (itemsError) throw itemsError;

      setRecipe(recipeData);
      setIngredients(itemsData || []);
      reset({
        name: recipeData.name,
        servings: recipeData.servings,
        notes: recipeData.notes || '',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load recipe');
    } finally {
      setLoading(false);
    }
  };

  const handleAddIngredient = (ingredient: RecipeIngredient) => {
    setIngredients([...ingredients, ingredient]);
    setAdding(false);
  };

  const handleRemoveIngredient = async (index: number) => {
    const ingredient = ingredients[index];

    // If the ingredient has an id, delete it from the database
    if (ingredient.id) {
      try {
        const { error } = await supabase
          .from('recipe_items')
          .delete()
          .eq('id', ingredient.id);

        if (error) throw error;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete ingredient');
        return;
      }
    }

    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const calculateTotals = () => {
    return ingredients.reduce(
      (totals, item) => ({
        calories: totals.calories + (item.calories || 0),
        protein: totals.protein + (item.protein || 0),
        carbs: totals.carbs + (item.carbs || 0),
        fat: totals.fat + (item.fat || 0),
        fiber: totals.fiber + (item.fiber || 0),
        water: totals.water + (item.water || 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, water: 0 }
    );
  };

  const onSubmit = async (data: RecipeFormData) => {
    if (ingredients.length === 0) {
      setError('Add at least one ingredient to your recipe');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const totals = calculateTotals();

      // Update recipe
      const { error: recipeError } = await supabase
        .from('recipes')
        .update({
          name: data.name,
          servings: data.servings,
          notes: data.notes || null,
          total_calories: totals.calories,
          total_protein: totals.protein,
          total_carbs: totals.carbs,
          total_fat: totals.fat,
          total_fiber: totals.fiber,
          total_water: totals.water,
        })
        .eq('id', recipeId);

      if (recipeError) throw recipeError;

      // Delete all existing recipe items
      const { error: deleteError } = await supabase
        .from('recipe_items')
        .delete()
        .eq('recipe_id', recipeId);

      if (deleteError) throw deleteError;

      // Add updated recipe items
      const recipeItems = ingredients.map((item, index) => ({
        recipe_id: recipeId,
        food_name: item.food_name,
        amount: item.amount,
        calories: item.calories,
        protein: item.protein || 0,
        carbs: item.carbs || 0,
        fat: item.fat || 0,
        fiber: item.fiber || 0,
        water: item.water || 0,
        order: index + 1,
      }));

      const { error: itemsError } = await supabase
        .from('recipe_items')
        .insert(recipeItems);

      if (itemsError) throw itemsError;

      router.push('/recipes');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update recipe');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl space-y-6">
        <p className="text-zinc-600">Loading recipe...</p>
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="max-w-3xl space-y-6">
        <p className="text-red-600">Recipe not found</p>
      </div>
    );
  }

  const totals = calculateTotals();

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Edit Recipe</h1>
        <p className="mt-1 text-zinc-600">Update ingredients and serving size</p>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="rounded-lg border border-zinc-200 bg-white p-6 space-y-4">
          <h2 className="text-lg font-semibold">Recipe Details</h2>

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-zinc-900">
              Recipe Name
            </label>
            <input
              id="name"
              type="text"
              {...register('name')}
              className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
              placeholder="e.g., Chicken Stir Fry"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="servings" className="block text-sm font-medium text-zinc-900">
              Number of Servings
            </label>
            <input
              id="servings"
              type="number"
              {...register('servings', { valueAsNumber: true })}
              className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
            />
            {errors.servings && (
              <p className="mt-1 text-sm text-red-600">{errors.servings.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-zinc-900">
              Notes (optional)
            </label>
            <textarea
              id="notes"
              rows={3}
              {...register('notes')}
              className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
              placeholder="Preparation instructions, tips, etc."
            />
          </div>
        </div>

        <div className="rounded-lg border border-zinc-200 bg-white p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Ingredients</h2>
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
            >
              + Add Ingredient
            </button>
          </div>

          {ingredients.length === 0 && !adding && (
            <p className="text-sm text-zinc-500">No ingredients added yet</p>
          )}

          <div className="space-y-2">
            {ingredients.map((item, index) => (
              <div
                key={index}
                className="flex items-start justify-between rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm"
              >
                <div>
                  <p className="font-medium">{item.food_name}</p>
                  <p className="text-zinc-600">{item.amount}</p>
                  <p className="text-zinc-500 text-xs mt-1">
                    {item.calories} cal | P: {item.protein || 0}g | C: {item.carbs || 0}g | F: {item.fat || 0}g | Fiber: {item.fiber || 0}g | Water: {item.water || 0}oz
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveIngredient(index)}
                  className="text-red-600 hover:text-red-800"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          {adding && (
            <RecipeItemForm
              onSave={handleAddIngredient}
              onCancel={() => setAdding(false)}
            />
          )}

          {ingredients.length > 0 && (
            <div className="border-t border-zinc-200 pt-4">
              <p className="text-sm font-medium text-zinc-900 mb-2">Total Nutrition</p>
              <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-6">
                <div>
                  <p className="text-zinc-600">Calories</p>
                  <p className="font-medium">{totals.calories}</p>
                </div>
                <div>
                  <p className="text-zinc-600">Protein</p>
                  <p className="font-medium">{totals.protein.toFixed(1)}g</p>
                </div>
                <div>
                  <p className="text-zinc-600">Carbs</p>
                  <p className="font-medium">{totals.carbs.toFixed(1)}g</p>
                </div>
                <div>
                  <p className="text-zinc-600">Fat</p>
                  <p className="font-medium">{totals.fat.toFixed(1)}g</p>
                </div>
                <div>
                  <p className="text-zinc-600">Fiber</p>
                  <p className="font-medium">{totals.fiber.toFixed(1)}g</p>
                </div>
                <div>
                  <p className="text-zinc-600">Water</p>
                  <p className="font-medium">{totals.water.toFixed(1)} oz</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving || ingredients.length === 0}
            className="flex-1 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving Changes...' : 'Save Changes'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
