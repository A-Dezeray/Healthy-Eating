'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/contexts/auth-context';
import { Recipe } from '@/lib/types';

interface RecipeSelectorProps {
  mealId: string;
  onSave: () => void;
  onCancel: () => void;
}

export function RecipeSelector({ mealId, onSave, onCancel }: RecipeSelectorProps) {
  const { user } = useAuth();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [servings, setServings] = useState<number>(1);
  const supabase = createClient();

  useEffect(() => {
    fetchRecipes();
  }, [user]);

  const fetchRecipes = async () => {
    try {
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .eq('user_id', user?.id)
        .order('name');

      if (error) throw error;
      setRecipes(data || []);
    } catch (err) {
      console.error('Error fetching recipes:', err);
      setError('Failed to load recipes');
    } finally {
      setLoading(false);
    }
  };

  const handleAddRecipe = async (recipe: Recipe) => {
    setSaving(true);
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

      // Calculate per-serving nutrition
      const caloriesPerServing = Math.round(recipe.total_calories / recipe.servings);
      const proteinPerServing = recipe.total_protein / recipe.servings;
      const carbsPerServing = recipe.total_carbs / recipe.servings;
      const fatPerServing = recipe.total_fat / recipe.servings;
      const fiberPerServing = recipe.total_fiber / recipe.servings;

      // Insert the meal item with recipe reference
      const { error: insertError } = await supabase
        .from('meal_items')
        .insert({
          meal_id: mealId,
          recipe_id: recipe.id,
          food_name: recipe.name,
          amount: `${servings} serving${servings > 1 ? 's' : ''}`,
          calories: caloriesPerServing * servings,
          protein: proteinPerServing * servings,
          carbs: carbsPerServing * servings,
          fat: fatPerServing * servings,
          fiber: fiberPerServing * servings,
          water: 0,
          order: nextOrder,
        });

      if (insertError) throw insertError;

      onSave();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3 rounded-lg border border-zinc-300 bg-zinc-50 p-4">
        <p className="text-sm text-zinc-600">Loading recipes...</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-zinc-300 bg-zinc-50 p-4">
      {error && (
        <div className="rounded-md bg-red-50 p-2 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="mb-3">
        <label className="block text-sm font-medium text-zinc-900 mb-2">
          Select a Recipe
        </label>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {recipes.length === 0 ? (
            <p className="text-sm text-zinc-500">No recipes found. Create a recipe first.</p>
          ) : (
            recipes.map((recipe) => {
              const perServing = {
                calories: Math.round(recipe.total_calories / recipe.servings),
                protein: (recipe.total_protein / recipe.servings).toFixed(1),
                carbs: (recipe.total_carbs / recipe.servings).toFixed(1),
                fat: (recipe.total_fat / recipe.servings).toFixed(1),
              };

              return (
                <button
                  key={recipe.id}
                  type="button"
                  onClick={() => handleAddRecipe(recipe)}
                  disabled={saving}
                  className="w-full text-left rounded-lg border border-zinc-200 bg-white p-3 hover:bg-zinc-50 disabled:opacity-50"
                >
                  <p className="font-medium text-zinc-900">{recipe.name}</p>
                  <p className="text-xs text-zinc-500 mt-1">
                    Per serving: {perServing.calories} cal | P: {perServing.protein}g | C: {perServing.carbs}g | F: {perServing.fat}g
                  </p>
                  <p className="text-xs text-zinc-400 mt-1">
                    Makes {recipe.servings} servings
                  </p>
                </button>
              );
            })
          )}
        </div>
      </div>

      <div className="flex gap-2">
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
