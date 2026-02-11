import { NextRequest, NextResponse } from 'next/server';

interface NormalizedFood {
  id: string;
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  water: number;
  servingSize: number;
  servingSizeUnit: string;
  source: 'USDA';
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

      return {
        id: `usda-${food.fdcId}`,
        description: food.description,
        calories: getNutrient(1008),
        protein: getNutrient(1003),
        carbs: getNutrient(1005),
        fat: getNutrient(1004),
        fiber: getNutrient(1079),
        water: 0,
        servingSize: food.servingSize || 100,
        servingSizeUnit: food.servingSizeUnit || 'g',
        source: 'USDA' as const,
      };
    });
  } catch {
    return [];
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('query');

  if (!query) {
    return NextResponse.json({ error: 'Query is required' }, { status: 400 });
  }

  const apiKey = process.env.USDA_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
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
