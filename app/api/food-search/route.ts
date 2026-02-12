import { NextRequest, NextResponse } from 'next/server';

interface FoodPortion {
  measureUnit: string;
  gramWeight: number;
  amount: number;
  modifier?: string;
}

interface NormalizedFood {
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

function extractPortions(food: any): FoodPortion[] {
  const portions: FoodPortion[] = [];

  // foodPortions from SR Legacy / Foundation foods
  if (food.foodPortions) {
    for (const p of food.foodPortions) {
      const unit = p.measureUnit?.name || p.modifier || '';
      if (unit && p.gramWeight > 0) {
        portions.push({
          measureUnit: unit.toLowerCase(),
          gramWeight: p.gramWeight,
          amount: p.amount || 1,
          modifier: p.modifier?.toLowerCase(),
        });
      }
    }
  }

  // foodMeasures from search results
  if (food.foodMeasures) {
    for (const m of food.foodMeasures) {
      const unit = m.disseminationText || m.measureUnitAbbreviation || '';
      if (unit && m.gramWeight > 0) {
        portions.push({
          measureUnit: unit.toLowerCase(),
          gramWeight: m.gramWeight,
          amount: m.rank ? 1 : 1,
        });
      }
    }
  }

  return portions;
}

function findPortionGrams(portions: FoodPortion[], unit: string): number | null {
  const unitLower = unit.toLowerCase();

  // Direct match patterns for cups
  if (unitLower === 'cup') {
    const cupMatch = portions.find(p => {
      const u = p.measureUnit;
      return u === 'cup' || u === 'cup, whole' || u === 'cup, sliced' ||
        u === 'cup, chopped' || u === 'cup, diced' || u === 'cup, mashed' ||
        u === 'cup, halves' || u === 'cup, pieces' ||
        u.startsWith('1 cup') || u === 'cup, shredded' ||
        (u.includes('cup') && !u.includes('undrained'));
    });
    if (cupMatch) return cupMatch.gramWeight / cupMatch.amount;
  }

  // Direct match for tablespoon
  if (unitLower === 'tbsp') {
    const tbspMatch = portions.find(p => {
      const u = p.measureUnit;
      return u === 'tbsp' || u === 'tablespoon' || u.startsWith('1 tbsp') ||
        u.includes('tablespoon');
    });
    if (tbspMatch) return tbspMatch.gramWeight / tbspMatch.amount;
  }

  // Direct match for teaspoon
  if (unitLower === 'tsp') {
    const tspMatch = portions.find(p => {
      const u = p.measureUnit;
      return u === 'tsp' || u === 'teaspoon' || u.startsWith('1 tsp') ||
        u.includes('teaspoon');
    });
    if (tspMatch) return tspMatch.gramWeight / tspMatch.amount;
  }

  return null;
}

async function searchUSDA(query: string, apiKey: string): Promise<NormalizedFood[]> {
  try {
    const response = await fetch(
      `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(query)}&pageSize=10&api_key=${apiKey}`
    );

    if (!response.ok) return [];

    const data = await response.json();

    return (data.foods || []).map((food: any) => {
      const nutrients = food.foodNutrients || [];
      const getNutrient = (nutrientId: number) => {
        const nutrient = nutrients.find((n: any) => n.nutrientId === nutrientId);
        return nutrient?.value || 0;
      };

      const portions = extractPortions(food);

      return {
        id: `usda-${food.fdcId}`,
        fdcId: food.fdcId,
        description: food.description,
        calories: getNutrient(1008),
        protein: getNutrient(1003),
        carbs: getNutrient(1005),
        fat: getNutrient(1004),
        fiber: getNutrient(1079),
        water: 0,
        servingSize: food.servingSize || 100,
        servingSizeUnit: food.servingSizeUnit || 'g',
        portions,
        source: 'USDA' as const,
      };
    });
  } catch {
    return [];
  }
}

async function getFoodDetail(fdcId: number, apiKey: string): Promise<FoodPortion[]> {
  try {
    const response = await fetch(
      `https://api.nal.usda.gov/fdc/v1/food/${fdcId}?api_key=${apiKey}`
    );

    if (!response.ok) return [];

    const food = await response.json();
    return extractPortions(food);
  } catch {
    return [];
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('query');
  const fdcId = searchParams.get('fdcId');

  const apiKey = process.env.USDA_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
  }

  // Detail endpoint: fetch portions for a specific food
  if (fdcId) {
    try {
      const portions = await getFoodDetail(parseInt(fdcId), apiKey);
      return NextResponse.json({ portions });
    } catch (error) {
      console.error('Error fetching food detail:', error);
      return NextResponse.json({ error: 'Failed to fetch food detail' }, { status: 500 });
    }
  }

  // Search endpoint
  if (!query) {
    return NextResponse.json({ error: 'Query is required' }, { status: 400 });
  }

  try {
    const results = await searchUSDA(query, apiKey);
    return NextResponse.json({ foods: results });
  } catch (error) {
    console.error('Error fetching food data:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch food data';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

