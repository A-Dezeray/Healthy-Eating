'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/contexts/auth-context';
import { createClient } from '@/lib/supabase/client';
import { Recipe } from '@/lib/types';
import Link from 'next/link';

export default function RecipesPage() {
  const { user } = useAuth();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    if (user) {
      fetchRecipes();
    }
  }, [user]);

  const fetchRecipes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('recipes')
        .select(`
          *,
          recipe_items (*)
        `)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRecipes(data || []);
    } catch (err) {
      console.error('Error fetching recipes:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this recipe?')) return;

    try {
      const { error } = await supabase
        .from('recipes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchRecipes();
    } catch (err) {
      console.error('Error deleting recipe:', err);
      alert('Failed to delete recipe');
    }
  };

  const getPerServingNutrition = (recipe: Recipe) => {
    return {
      calories: Math.round(recipe.total_calories / recipe.servings),
      protein: Number((recipe.total_protein / recipe.servings).toFixed(1)),
      carbs: Number((recipe.total_carbs / recipe.servings).toFixed(1)),
      fat: Number((recipe.total_fat / recipe.servings).toFixed(1)),
      fiber: Number((recipe.total_fiber / recipe.servings).toFixed(1)),
    };
  };

  if (loading) {
    return <div className="text-center">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">My Recipes</h1>
          <p className="mt-1 text-zinc-600">Create and manage your favorite recipes</p>
        </div>

        <Link
          href="/recipes/new"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          + New Recipe
        </Link>
      </div>

      {recipes.length === 0 ? (
        <div className="rounded-lg border border-zinc-200 bg-white p-12 text-center">
          <p className="text-zinc-600">No recipes yet. Create your first recipe!</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {recipes.map((recipe) => {
            const perServing = getPerServingNutrition(recipe);
            return (
              <div
                key={recipe.id}
                className="rounded-lg border border-zinc-200 bg-white p-6 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <h3 className="text-lg font-semibold">{recipe.name}</h3>
                  <button
                    onClick={() => handleDelete(recipe.id)}
                    className="text-sm text-red-600 hover:text-red-800"
                  >
                    Delete
                  </button>
                </div>

                <div className="text-sm text-zinc-600">
                  {recipe.servings} {recipe.servings === 1 ? 'serving' : 'servings'}
                  {recipe.recipe_items && (
                    <span className="ml-2">
                      • {recipe.recipe_items.length} ingredient{recipe.recipe_items.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                <div className="border-t border-zinc-200 pt-3">
                  <p className="text-xs text-zinc-500 mb-2">Per Serving</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
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
                  </div>
                </div>

                <Link
                  href={`/recipes/${recipe.id}`}
                  className="block w-full rounded-md border border-zinc-300 px-4 py-2 text-center text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                >
                  View / Edit
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
