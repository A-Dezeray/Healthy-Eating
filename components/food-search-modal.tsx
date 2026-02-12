'use client';

import { useState } from 'react';

interface FoodPortion {
  measureUnit: string;
  gramWeight: number;
  amount: number;
  modifier?: string;
}

interface FoodSearchResult {
  id: string;
  fdcId: number;
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  water: number;
  servingSize: number;
  servingSizeUnit: string;
  portions: FoodPortion[];
  source: 'USDA';
}

interface FoodSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (food: {
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    water: number;
    defaultAmount: string;
  }) => void;
}

function findCupGrams(portions: FoodPortion[]): number | null {
  const match = portions.find(p => {
    const u = p.measureUnit;
    return u === 'cup' || u === 'cup, whole' || u === 'cup, sliced' ||
      u === 'cup, chopped' || u === 'cup, diced' || u === 'cup, mashed' ||
      u === 'cup, halves' || u === 'cup, pieces' || u === 'cup, shredded' ||
      u.startsWith('1 cup') ||
      (u.includes('cup') && !u.includes('undrained'));
  });
  return match ? match.gramWeight / match.amount : null;
}

function scaleNutrientFromGrams(per100g: number, gramWeight: number): number {
  return (per100g * gramWeight) / 100;
}

export function FoodSearchModal({ isOpen, onClose, onSelect }: FoodSearchModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FoodSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selecting, setSelecting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!query.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/food-search?query=${encodeURIComponent(query)}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `Search failed: ${response.status}`);
      }

      const data = await response.json();
      setResults(data.foods || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to search foods';
      setError(errorMessage);
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectFood = async (food: FoodSearchResult) => {
    setSelecting(food.id);

    try {
      // Try to get portions from search results first
      let portions = food.portions || [];

      // If no portions from search, fetch the food detail
      if (portions.length === 0) {
        const detailRes = await fetch(`/api/food-search?fdcId=${food.fdcId}`);
        if (detailRes.ok) {
          const detailData = await detailRes.json();
          portions = detailData.portions || [];
        }
      }

      // Find cup gram weight and convert nutrition
      const cupGrams = findCupGrams(portions);

      let calories: number, protein: number, carbs: number, fat: number, fiber: number, water: number;
      let servingText: string;

      if (cupGrams) {
        // Convert from per-100g to per-cup using the gram weight
        calories = Math.round(scaleNutrientFromGrams(food.calories, cupGrams));
        protein = Math.round(scaleNutrientFromGrams(food.protein, cupGrams) * 10) / 10;
        carbs = Math.round(scaleNutrientFromGrams(food.carbs, cupGrams) * 10) / 10;
        fat = Math.round(scaleNutrientFromGrams(food.fat, cupGrams) * 10) / 10;
        fiber = Math.round(scaleNutrientFromGrams(food.fiber, cupGrams) * 10) / 10;
        water = Math.round(scaleNutrientFromGrams(food.water, cupGrams) * 10) / 10;
        servingText = `per 1 cup (${Math.round(cupGrams)}g)`;
      } else {
        // No cup mapping — use per-100g as-is
        calories = Math.round(food.calories);
        protein = Math.round(food.protein * 10) / 10;
        carbs = Math.round(food.carbs * 10) / 10;
        fat = Math.round(food.fat * 10) / 10;
        fiber = Math.round(food.fiber * 10) / 10;
        water = Math.round(food.water * 10) / 10;
        servingText = 'per 100g (no cup data)';
      }

      onSelect({
        name: food.description,
        calories,
        protein,
        carbs,
        fat,
        fiber,
        water,
        defaultAmount: servingText,
      });

      onClose();
      setQuery('');
      setResults([]);
    } catch (err) {
      console.error('Error fetching food detail:', err);
      // Fall back to raw per-100g values
      onSelect({
        name: food.description,
        calories: Math.round(food.calories),
        protein: Math.round(food.protein * 10) / 10,
        carbs: Math.round(food.carbs * 10) / 10,
        fat: Math.round(food.fat * 10) / 10,
        fiber: Math.round(food.fiber * 10) / 10,
        water: Math.round(food.water * 10) / 10,
        defaultAmount: 'per 100g',
      });
      onClose();
      setQuery('');
      setResults([]);
    } finally {
      setSelecting(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="p-6 border-b border-zinc-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Search Food Database</h2>
            <button
              onClick={onClose}
              className="text-zinc-400 hover:text-zinc-600"
            >
              ✕
            </button>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSearch(); } }}
              placeholder="Search for food (e.g., chicken breast, banana)"
              className="flex-1 rounded-md border border-zinc-300 px-4 py-2 text-sm"
            />
            <button
              onClick={handleSearch}
              disabled={loading || !query.trim()}
              className="rounded-md bg-zinc-900 px-6 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>

          {error && (
            <p className="mt-2 text-sm text-red-600">{error}</p>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {results.length === 0 && !loading && (
            <p className="text-center text-zinc-500">
              Search for a food to see nutritional information
            </p>
          )}

          <div className="space-y-2">
            {results.map((food) => {
              const cupGrams = findCupGrams(food.portions || []);
              const isSelecting = selecting === food.id;

              return (
                <button
                  key={food.id}
                  onClick={() => handleSelectFood(food)}
                  disabled={!!selecting}
                  className="w-full text-left rounded-lg border border-zinc-200 p-4 hover:bg-zinc-50 transition-colors disabled:opacity-50"
                >
                  <div className="flex items-start justify-between">
                    <p className="font-medium text-zinc-900">
                      {isSelecting ? 'Loading nutrition...' : food.description}
                    </p>
                    <span className="ml-2 shrink-0 rounded-full px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700">
                      USDA
                    </span>
                  </div>
                  <p className="text-sm text-zinc-600 mt-1">
                    {cupGrams
                      ? `Per 1 cup (${Math.round(cupGrams)}g)`
                      : `Per 100g`}
                  </p>
                  <div className="mt-2 flex gap-4 text-xs text-zinc-500">
                    {cupGrams ? (
                      <>
                        <span>{Math.round(scaleNutrientFromGrams(food.calories, cupGrams))} cal</span>
                        <span>P: {(scaleNutrientFromGrams(food.protein, cupGrams)).toFixed(1)}g</span>
                        <span>C: {(scaleNutrientFromGrams(food.carbs, cupGrams)).toFixed(1)}g</span>
                        <span>F: {(scaleNutrientFromGrams(food.fat, cupGrams)).toFixed(1)}g</span>
                        {scaleNutrientFromGrams(food.fiber, cupGrams) > 0 && (
                          <span>Fiber: {(scaleNutrientFromGrams(food.fiber, cupGrams)).toFixed(1)}g</span>
                        )}
                      </>
                    ) : (
                      <>
                        <span>{Math.round(food.calories)} cal</span>
                        <span>P: {food.protein.toFixed(1)}g</span>
                        <span>C: {food.carbs.toFixed(1)}g</span>
                        <span>F: {food.fat.toFixed(1)}g</span>
                        {food.fiber > 0 && <span>Fiber: {food.fiber.toFixed(1)}g</span>}
                      </>
                    )}
                  </div>
                  {cupGrams && (
                    <p className="mt-1 text-xs text-green-600">Cup conversion available</p>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
