'use client';

import { useState } from 'react';

interface FoodSearchResult {
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

export function FoodSearchModal({ isOpen, onClose, onSelect }: FoodSearchModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FoodSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
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

  const handleSelectFood = (food: FoodSearchResult) => {
    const servingText = food.servingSize
      ? `per ${food.servingSize}${food.servingSizeUnit}`
      : 'per 100g';

    onSelect({
      name: food.description,
      calories: Math.round(food.calories),
      protein: Math.round(food.protein * 10) / 10,
      carbs: Math.round(food.carbs * 10) / 10,
      fat: Math.round(food.fat * 10) / 10,
      fiber: Math.round(food.fiber * 10) / 10,
      water: Math.round(food.water * 10) / 10,
      defaultAmount: servingText,
    });

    onClose();
    setQuery('');
    setResults([]);
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
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
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
            {results.map((food) => (
              <button
                key={food.fdcId}
                onClick={() => handleSelectFood(food)}
                className="w-full text-left rounded-lg border border-zinc-200 p-4 hover:bg-zinc-50 transition-colors"
              >
                <p className="font-medium text-zinc-900">{food.description}</p>
                <p className="text-sm text-zinc-600 mt-1">
                  {food.servingSize > 0
                    ? `Per ${food.servingSize}${food.servingSizeUnit}`
                    : 'Per 100g'}
                </p>
                <div className="mt-2 flex gap-4 text-xs text-zinc-500">
                  <span>{Math.round(food.calories)} cal</span>
                  <span>P: {food.protein.toFixed(1)}g</span>
                  <span>C: {food.carbs.toFixed(1)}g</span>
                  <span>F: {food.fat.toFixed(1)}g</span>
                  {food.fiber > 0 && <span>Fiber: {food.fiber.toFixed(1)}g</span>}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
