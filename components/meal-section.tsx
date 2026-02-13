'use client';

import { useState } from 'react';
import { Meal, MealType } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/contexts/auth-context';
import { MealItemForm } from './meal-item-form';
import { RecipeSelector } from './recipe-selector';
import { NoteForm } from './note-form';

interface MealSectionProps {
  mealType: MealType;
  mealLabel: string;
  meals: Meal[];
  dailyLogId: string;
  onUpdate: () => void;
  onDeleteItem: (mealId: string, itemId: string) => void;
  onDeleteMeal: (mealId: string) => void;
  onAddMeal: (newMeal: Meal) => void;
  isLocked?: boolean;
}

export function MealSection({
  mealType,
  mealLabel,
  meals,
  dailyLogId,
  onUpdate,
  onDeleteItem,
  onDeleteMeal,
  onAddMeal,
  isLocked = false,
}: MealSectionProps) {
  const { user } = useAuth();
  const [isExpanded, setIsExpanded] = useState(true); // Expanded by default
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [currentMeal, setCurrentMeal] = useState<Meal | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAddMenu, setShowAddMenu] = useState<string | null>(null); // Track which meal's menu is open
  const [addType, setAddType] = useState<'food' | 'recipe' | 'note'>('food'); // Track what type of item to add
  const supabase = createClient();

  const handleAddMeal = async () => {
    if (!dailyLogId) {
      setError('Unable to create meal. Please refresh the page.');
      return;
    }

    setError(null);
    try {
      const nextOrder = meals.length + 1;
      const { data, error } = await supabase
        .from('meals')
        .insert({
          daily_log_id: dailyLogId,
          meal_type: mealType,
          meal_order: nextOrder,
        })
        .select()
        .single();

      if (error) throw error;

      // Add new meal with empty items to parent state so it renders immediately
      const newMeal: Meal = { ...data, meal_items: [] };
      onAddMeal(newMeal);
      setCurrentMeal(newMeal);
      setIsAddingItem(true);
      setIsExpanded(true);
    } catch (err) {
      console.error('Error adding meal:', err);
      setError('Failed to create meal. Please try again.');
    }
  };

  const handleAddItemToMeal = async (mealId: string) => {
    setCurrentMeal(meals.find(m => m.id === mealId) || null);
    setIsAddingItem(true);
  };

  const handleSaveItem = async () => {
    setIsAddingItem(false);
    setCurrentMeal(null);
    await onUpdate();
  };

  const handleDeleteItem = async (mealId: string, itemId: string) => {
    // Optimistically remove from UI immediately
    onDeleteItem(mealId, itemId);

    try {
      const { error } = await supabase
        .from('meal_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;
    } catch (err) {
      console.error('Error deleting item:', err);
      // Re-fetch to restore correct state on failure
      await onUpdate();
    }
  };

  const handleDeleteMeal = async (mealId: string) => {
    // Clear form state if we're deleting the meal we're currently editing
    if (currentMeal?.id === mealId) {
      setIsAddingItem(false);
      setCurrentMeal(null);
    }

    // Optimistically remove from UI immediately
    onDeleteMeal(mealId);

    try {
      // Delete meal items first
      const { error: itemsError } = await supabase
        .from('meal_items')
        .delete()
        .eq('meal_id', mealId);

      if (itemsError) throw itemsError;

      // Delete meal
      const { error: mealError } = await supabase
        .from('meals')
        .delete()
        .eq('id', mealId);

      if (mealError) throw mealError;
    } catch (err) {
      console.error('Error deleting meal:', err);
      // Re-fetch to restore correct state on failure
      await onUpdate();
    }
  };

  const getMealTotals = (meal: Meal) => {
    const items = meal.meal_items || [];
    return {
      calories: items.reduce((sum, item) => sum + (item.calories || 0), 0),
      protein: items.reduce((sum, item) => sum + (item.protein || 0), 0),
      carbs: items.reduce((sum, item) => sum + (item.carbs || 0), 0),
      fat: items.reduce((sum, item) => sum + (item.fat || 0), 0),
    };
  };

  return (
    <div className="rounded-lg border border-zinc-200 bg-white">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between p-4 text-left hover:bg-zinc-50"
      >
        <div className="flex items-center gap-3">
          <h3 className="font-semibold">{mealLabel}</h3>
          <span className="text-sm text-zinc-500">
            {meals.length} {meals.length === 1 ? 'meal' : 'meals'}
          </span>
        </div>
        <svg
          className={`h-5 w-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="border-t border-zinc-200 p-4 space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {meals.map((meal) => {
            const totals = getMealTotals(meal);
            return (
              <div key={meal.id} className="rounded-lg border border-zinc-200 p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="text-sm">
                    <span className="font-medium">
                      {totals.calories} cal
                    </span>
                    <span className="text-zinc-500 ml-2">
                      P: {totals.protein}g | C: {totals.carbs}g | F: {totals.fat}g
                    </span>
                  </div>
                  {!isLocked && (
                    <button
                      onClick={() => handleDeleteMeal(meal.id)}
                      className="text-sm text-red-600 hover:text-red-800"
                    >
                      Delete
                    </button>
                  )}
                </div>

                {meal.meal_items && meal.meal_items.length > 0 && (
                  <div className="space-y-2 mb-3">
                    {meal.meal_items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-start justify-between text-sm bg-zinc-50 rounded p-2"
                      >
                        <div className="flex-1">
                          <p className="font-medium">{item.food_name}</p>
                          <p className="text-zinc-600">{item.amount}</p>
                          {item.notes && (
                            <p className="text-zinc-500 text-xs mt-1 italic">{item.notes}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-zinc-600">{item.calories} cal</span>
                          {!isLocked && (
                            <button
                              onClick={() => handleDeleteItem(meal.id, item.id)}
                              className="text-red-600 hover:text-red-800"
                            >
                              ×
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {!isLocked && (
                  currentMeal?.id === meal.id && isAddingItem ? (
                    <>
                      {addType === 'food' && (
                        <MealItemForm
                          mealId={meal.id}
                          onSave={handleSaveItem}
                          onCancel={() => {
                            setIsAddingItem(false);
                            setCurrentMeal(null);
                          }}
                        />
                      )}
                      {addType === 'recipe' && (
                        <RecipeSelector
                          mealId={meal.id}
                          onSave={handleSaveItem}
                          onCancel={() => {
                            setIsAddingItem(false);
                            setCurrentMeal(null);
                          }}
                        />
                      )}
                      {addType === 'note' && (
                        <NoteForm
                          mealId={meal.id}
                          onSave={handleSaveItem}
                          onCancel={() => {
                            setIsAddingItem(false);
                            setCurrentMeal(null);
                          }}
                        />
                      )}
                    </>
                  ) : (
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowAddMenu(showAddMenu === meal.id ? null : meal.id)}
                        className="text-sm text-zinc-600 hover:text-pink-500 flex items-center gap-1 transition-colors"
                      >
                        + Add item
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      {showAddMenu === meal.id && (
                        <div className="absolute left-0 mt-1 w-48 rounded-md bg-white shadow-lg border border-zinc-200 z-10">
                          <div className="py-1">
                            <button
                              type="button"
                              onClick={() => {
                                setAddType('food');
                                handleAddItemToMeal(meal.id);
                                setShowAddMenu(null);
                              }}
                              className="w-full text-left px-4 py-2 text-sm text-zinc-700 hover:bg-pink-50 hover:text-pink-600 transition-colors"
                            >
                              🍎 Add Food
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setAddType('recipe');
                                handleAddItemToMeal(meal.id);
                                setShowAddMenu(null);
                              }}
                              className="w-full text-left px-4 py-2 text-sm text-zinc-700 hover:bg-pink-50 hover:text-pink-600 transition-colors"
                            >
                              📖 Add Recipe
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setAddType('note');
                                handleAddItemToMeal(meal.id);
                                setShowAddMenu(null);
                              }}
                              className="w-full text-left px-4 py-2 text-sm text-zinc-700 hover:bg-pink-50 hover:text-pink-600 transition-colors"
                            >
                              📝 Add Note
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                )}
              </div>
            );
          })}

          {!isLocked && (!currentMeal || !isAddingItem) && (
            <button
              onClick={handleAddMeal}
              className="w-full rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-pink-50 hover:text-pink-600 hover:border-pink-300 transition-colors"
            >
              + Add {mealLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
