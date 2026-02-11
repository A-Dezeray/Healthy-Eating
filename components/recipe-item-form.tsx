'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { FoodSearchModal } from './food-search-modal';

const servingUnits = ['cup', 'tbsp', 'tsp'] as const;
type ServingUnit = typeof servingUnits[number];

const unitToCups: Record<ServingUnit, number> = {
  cup: 1,
  tbsp: 1 / 16,
  tsp: 1 / 48,
};

const recipeItemSchema = z.object({
  food_name: z.string().min(1, 'Food name is required'),
  serving: z.number().min(0.25, 'Serving must be at least 0.25'),
  unit: z.enum(servingUnits),
  calories: z.number().min(0, 'Calories must be positive'),
  protein: z.number().min(0).optional(),
  carbs: z.number().min(0).optional(),
  fat: z.number().min(0).optional(),
  fiber: z.number().min(0).optional(),
  water: z.number().min(0).optional(),
});

type RecipeItemFormData = z.infer<typeof recipeItemSchema>;

interface BaseNutrition {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  water: number;
}

interface RecipeItemSaveData {
  food_name: string;
  amount: string;
  calories: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  water?: number;
}

interface RecipeItemFormProps {
  onSave: (data: RecipeItemSaveData) => void;
  onCancel: () => void;
}

const formatAmount = (val: number, unit: ServingUnit): string => {
  if (unit === 'tbsp') {
    return val === 1 ? '1 tbsp' : `${val} tbsp`;
  }
  if (unit === 'tsp') {
    return val === 1 ? '1 tsp' : `${val} tsp`;
  }
  if (val === 0.25) return '1/4 cup';
  if (val === 0.5) return '1/2 cup';
  if (val === 0.75) return '3/4 cup';
  if (val === 1) return '1 cup';
  if (val === 1.25) return '1 1/4 cups';
  if (val === 1.5) return '1 1/2 cups';
  if (val === 1.75) return '1 3/4 cups';
  if (val === 2) return '2 cups';
  if (val === 2.5) return '2 1/2 cups';
  if (val === 3) return '3 cups';
  return `${val} cups`;
};

export function RecipeItemForm({ onSave, onCancel }: RecipeItemFormProps) {
  const [loading, setLoading] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [baseNutrition, setBaseNutrition] = useState<BaseNutrition | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<RecipeItemFormData>({
    resolver: zodResolver(recipeItemSchema),
    defaultValues: {
      serving: 1,
      unit: 'cup' as ServingUnit,
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
      water: 0,
    },
  });

  const scaleNutrition = (base: BaseNutrition, cups: number) => {
    setValue('calories', Math.round(base.calories * cups));
    setValue('protein', Math.round(base.protein * cups * 10) / 10);
    setValue('carbs', Math.round(base.carbs * cups * 10) / 10);
    setValue('fat', Math.round(base.fat * cups * 10) / 10);
    setValue('fiber', Math.round(base.fiber * cups * 10) / 10);
    setValue('water', Math.round(base.water * cups * 10) / 10);
  };

  const handleFoodSelect = (food: {
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    water: number;
    defaultAmount: string;
  }) => {
    const base: BaseNutrition = {
      calories: food.calories,
      protein: food.protein,
      carbs: food.carbs,
      fat: food.fat,
      fiber: food.fiber,
      water: food.water,
    };
    setBaseNutrition(base);
    setValue('food_name', food.name);
    setValue('serving', 1);
    scaleNutrition(base, 1);
  };

  const rescaleFromUnit = (servingVal: number, unit: ServingUnit) => {
    if (!baseNutrition) return;
    const cups = servingVal * unitToCups[unit];
    scaleNutrition(baseNutrition, cups);
  };

  const handleServingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (!isNaN(val) && val > 0) {
      rescaleFromUnit(val, watch('unit'));
    }
  };

  const handleUnitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newUnit = e.target.value as ServingUnit;
    setValue('unit', newUnit);
    const serving = watch('serving');
    if (!isNaN(serving) && serving > 0) {
      rescaleFromUnit(serving, newUnit);
    }
  };

  const onSubmit = async (data: RecipeItemFormData) => {
    setLoading(true);
    onSave({
      food_name: data.food_name,
      amount: formatAmount(data.serving, data.unit),
      calories: data.calories,
      protein: data.protein,
      carbs: data.carbs,
      fat: data.fat,
      fiber: data.fiber,
      water: data.water,
    });
    setLoading(false);
  };

  return (
    <>
      <FoodSearchModal
        isOpen={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
        onSelect={handleFoodSelect}
      />

      <div className="space-y-3 rounded-lg border border-zinc-300 bg-zinc-50 p-4">
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
              Ingredient Name
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
          <label htmlFor="serving" className="block text-sm font-medium text-zinc-900">
            Serving
          </label>
          <div className="mt-1 flex gap-2">
            <input
              id="serving"
              type="number"
              step="0.25"
              min="0.25"
              {...register('serving', { valueAsNumber: true })}
              onChange={(e) => {
                register('serving', { valueAsNumber: true }).onChange(e);
                handleServingChange(e);
              }}
              className="block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
            />
            <select
              {...register('unit')}
              onChange={(e) => {
                register('unit').onChange(e);
                handleUnitChange(e);
              }}
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
            >
              <option value="cup">Cups</option>
              <option value="tbsp">Tbsp</option>
              <option value="tsp">Tsp</option>
            </select>
          </div>
          {errors.serving && (
            <p className="mt-1 text-sm text-red-600">{errors.serving.message}</p>
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
            step="0.1"
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
            step="0.1"
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
            step="0.1"
            {...register('fat', { valueAsNumber: true })}
            className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
          />
        </div>

        <div>
          <label htmlFor="fiber" className="block text-sm font-medium text-zinc-900">
            Fiber (g)
          </label>
          <input
            id="fiber"
            type="number"
            step="0.1"
            {...register('fiber', { valueAsNumber: true })}
            className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
          />
        </div>

        <div>
          <label htmlFor="water" className="block text-sm font-medium text-zinc-900">
            Water (oz)
          </label>
          <input
            id="water"
            type="number"
            step="0.1"
            {...register('water', { valueAsNumber: true })}
            className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
          />
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleSubmit(onSubmit)}
          disabled={loading}
          className="flex-1 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
        >
          {loading ? 'Adding...' : 'Add Ingredient'}
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
    </>
  );
}
