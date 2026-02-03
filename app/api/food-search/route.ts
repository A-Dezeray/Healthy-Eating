import { NextRequest, NextResponse } from 'next/server';

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
    console.log('Making request to USDA API with query:', query);
    const response = await fetch(
      `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(query)}&pageSize=10&api_key=${apiKey}`
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('USDA API error:', response.status, errorText);
      throw new Error(`USDA API returned ${response.status}: ${errorText}`);
    }

    const data = await response.json();

    // Transform the data to a simpler format
    const foods = data.foods?.map((food: any) => {
      const nutrients = food.foodNutrients || [];

      const getNutrient = (nutrientId: number) => {
        const nutrient = nutrients.find((n: any) => n.nutrientId === nutrientId);
        return nutrient?.value || 0;
      };

      return {
        fdcId: food.fdcId,
        description: food.description,
        calories: getNutrient(1008), // Energy (kcal)
        protein: getNutrient(1003), // Protein
        carbs: getNutrient(1005), // Carbohydrate
        fat: getNutrient(1004), // Total lipid (fat)
        fiber: getNutrient(1079), // Fiber
        servingSize: food.servingSize || 100,
        servingSizeUnit: food.servingSizeUnit || 'g',
      };
    }) || [];

    return NextResponse.json({ foods });
  } catch (error) {
    console.error('Error fetching from USDA API:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch food data';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
