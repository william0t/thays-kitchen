import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { ingredients, appliances, preferences, servings } = await request.json();

    const ingredientList = ingredients
      .filter((i: { in_stock: boolean }) => i.in_stock)
      .map((i: { name: string; quantity?: number; unit?: string }) =>
        `${i.name}${i.quantity ? ` (${i.quantity} ${i.unit || ''})` : ''}`
      )
      .join(', ');

    const applianceList = appliances
      .map((a: { name: string }) => a.name)
      .join(', ');

    const prompt = `You are a professional chef and recipe creator. Create a delicious, detailed recipe using the ingredients and appliances listed below.

AVAILABLE INGREDIENTS: ${ingredientList || 'Basic pantry staples'}
AVAILABLE APPLIANCES: ${applianceList || 'Standard stovetop and oven'}
SERVINGS: ${servings || 4}
PREFERENCES/NOTES: ${preferences || 'None specified'}

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

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    // Parse the JSON response
    const jsonText = content.text.trim();
    const recipe = JSON.parse(jsonText);

    return NextResponse.json({ recipe });
  } catch (error) {
    console.error('Recipe generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate recipe. Please check your API key and try again.' },
      { status: 500 }
    );
  }
}
