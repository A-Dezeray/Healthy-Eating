'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/contexts/auth-context';
import { createClient } from '@/lib/supabase/client';
import type { Recipe, RecipeItem } from '@/lib/types';
import Link from 'next/link';

export default function RecipeDetailPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const recipeId = params.id as string;
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [ingredients, setIngredients] = useState<RecipeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load recipe');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this recipe?')) return;

    try {
      const { error } = await supabase
        .from('recipes')
        .delete()
        .eq('id', recipeId);

      if (error) throw error;
      router.push('/recipes');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete recipe');
    }
  };

  const getPerServingNutrition = () => {
    if (!recipe) return null;
    return {
      calories: Math.round(recipe.total_calories / recipe.servings),
      protein: Number((recipe.total_protein / recipe.servings).toFixed(1)),
      carbs: Number((recipe.total_carbs / recipe.servings).toFixed(1)),
      fat: Number((recipe.total_fat / recipe.servings).toFixed(1)),
      fiber: Number((recipe.total_fiber / recipe.servings).toFixed(1)),
      water: Number(((recipe.total_water || 0) / recipe.servings).toFixed(1)),
    };
  };

  if (loading) {
    return (
      <div className="max-w-3xl space-y-6">
        <p className="text-zinc-600">Loading recipe...</p>
      </div>
    );
  }

  if (error || !recipe) {
    return (
      <div className="max-w-3xl space-y-6">
        <p className="text-red-600">{error || 'Recipe not found'}</p>
        <Link
          href="/recipes"
          className="inline-block rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          Back to Recipes
        </Link>
      </div>
    );
  }

  const perServing = getPerServingNutrition();

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-semibold">{recipe.name}</h1>
          <p className="mt-1 text-zinc-600">
            {recipe.servings} {recipe.servings === 1 ? 'serving' : 'servings'}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/recipes/${recipeId}/edit`}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
          >
            Edit Recipe
          </Link>
          <button
            onClick={handleDelete}
            className="rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            Delete
          </button>
        </div>
      </div>

      {recipe.notes && (
        <div className="rounded-lg border border-zinc-200 bg-white p-6">
          <h2 className="text-sm font-semibold text-zinc-900 mb-2">Notes</h2>
          <p className="text-sm text-zinc-600 whitespace-pre-wrap">{recipe.notes}</p>
        </div>
      )}

      <div className="rounded-lg border border-zinc-200 bg-white p-6 space-y-4">
        <h2 className="text-lg font-semibold">Ingredients</h2>

        {ingredients.length === 0 ? (
          <p className="text-sm text-zinc-500">No ingredients</p>
        ) : (
          <div className="space-y-2">
            {ingredients.map((item) => (
              <div
                key={item.id}
                className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">{item.food_name}</p>
                    <p className="text-zinc-600">{item.amount}</p>
                  </div>
                  <p className="font-medium text-zinc-900">{item.calories} cal</p>
                </div>
                <p className="text-zinc-500 text-xs mt-1">
                  P: {item.protein || 0}g | C: {item.carbs || 0}g | F: {item.fat || 0}g | Fiber: {item.fiber || 0}g | Water: {item.water || 0}oz
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-6 space-y-4">
        <h2 className="text-lg font-semibold">Nutrition Information</h2>

        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium text-zinc-900 mb-2">Total (All Servings)</h3>
            <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-6">
              <div>
                <p className="text-zinc-600">Calories</p>
                <p className="font-medium">{recipe.total_calories}</p>
              </div>
              <div>
                <p className="text-zinc-600">Protein</p>
                <p className="font-medium">{recipe.total_protein.toFixed(1)}g</p>
              </div>
              <div>
                <p className="text-zinc-600">Carbs</p>
                <p className="font-medium">{recipe.total_carbs.toFixed(1)}g</p>
              </div>
              <div>
                <p className="text-zinc-600">Fat</p>
                <p className="font-medium">{recipe.total_fat.toFixed(1)}g</p>
              </div>
              <div>
                <p className="text-zinc-600">Fiber</p>
                <p className="font-medium">{recipe.total_fiber.toFixed(1)}g</p>
              </div>
              <div>
                <p className="text-zinc-600">Water</p>
                <p className="font-medium">{(recipe.total_water || 0).toFixed(1)} oz</p>
              </div>
            </div>
          </div>

          {perServing && (
            <div className="border-t border-zinc-200 pt-4">
              <h3 className="text-sm font-medium text-zinc-900 mb-2">Per Serving</h3>
              <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-6">
                <div>
                  <p className="text-zinc-600">Calories</p>
                  <p className="font-medium">{perServing.calories}</p>
                </div>
                <div>
                  <p className="text-zinc-600">Protein</p>
                  <p className="font-medium">{perServing.protein}g</p>
                </div>
                <div>
                  <p className="text-zinc-600">Carbs</p>
                  <p className="font-medium">{perServing.carbs}g</p>
                </div>
                <div>
                  <p className="text-zinc-600">Fat</p>
                  <p className="font-medium">{perServing.fat}g</p>
                </div>
                <div>
                  <p className="text-zinc-600">Fiber</p>
                  <p className="font-medium">{perServing.fiber}g</p>
                </div>
                <div>
                  <p className="text-zinc-600">Water</p>
                  <p className="font-medium">{perServing.water} oz</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <Link
        href="/recipes"
        className="inline-block rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
      >
        Back to Recipes
      </Link>
    </div>
  );
}
