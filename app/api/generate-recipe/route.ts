import OpenAI from 'openai';
import { NextRequest, NextResponse } from 'next/server';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { ingredients, appliances, preferences, servings, useAll } = await request.json();

    const ingredientList = ingredients
      .filter((i: { in_stock: boolean }) => i.in_stock)
      .map((i: { name: string; quantity?: number; unit?: string }) =>
        `${i.name}${i.quantity ? ` (${i.quantity} ${i.unit || ''})` : ''}`
      )
      .join(', ');

    const applianceList = appliances
      .map((a: { name: string }) => a.name)
      .join(', ');

    const ingredientInstruction = useAll
      ? `AVAILABLE INGREDIENTS (choose a sensible subset that naturally go together — do NOT use all of them, pick the ones that make a coherent, real-world dish): ${ingredientList || 'Basic pantry staples'}`
      : `INGREDIENTS TO USE: ${ingredientList || 'Basic pantry staples'}`;

    const prompt = `You are a professional chef and recipe creator. Create a delicious, detailed recipe.

${ingredientInstruction}
AVAILABLE APPLIANCES: ${applianceList || 'Standard stovetop and oven'}
SERVINGS: ${servings || 4}
PREFERENCES/NOTES: ${preferences || 'None specified'}

${useAll ? 'IMPORTANT: You are not required to use every ingredient listed. Pick a natural, well-known combination that results in a great dish. Ignore ingredients that would make the dish weird or incoherent.' : 'Use the provided ingredients as the base for the recipe.'}

Return ONLY a valid JSON object with this exact structure (no markdown, no explanation):
{
  "name": "Recipe Name",
  "description": "1-2 sentence appetizing description",
  "prep_time": <number in minutes>,
  "cook_time": <number in minutes>,
  "servings": <number>,
  "tags": ["tag1", "tag2", "tag3"],
  "appliances_used": ["appliance1", "appliance2"],
  "ingredients": [
    { "name": "ingredient name", "amount": <number>, "unit": "unit" }
  ],
  "instructions": [
    "Step 1: detailed instruction",
    "Step 2: detailed instruction"
  ]
}

Make the recipe practical, delicious, and achievable with the listed appliances. Instructions should be detailed and clear. Include 6-12 steps.`;

    const message = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    });

    const jsonText = (message.choices[0].message.content ?? '')
      .trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '');
    const recipe = JSON.parse(jsonText);

    return NextResponse.json({ recipe });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Recipe generation error:', message);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
