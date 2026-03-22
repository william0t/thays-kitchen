import OpenAI from 'openai';
import { NextRequest, NextResponse } from 'next/server';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(request: NextRequest) {
  try {
    const { seedIngredients, pantryItems } = await request.json();

    const pantryList = (pantryItems as string[]).join(', ') || 'basic pantry staples';

    const prompt = `You are an imaginative chef. A home cook has ${seedIngredients} and wants recipe inspiration.
Their full pantry includes: ${pantryList}

Give them 5 exciting, distinct recipe ideas they could make with these as the star ingredient(s). These can require additional shopping — the point is to inspire, not to limit.

For each idea, be creative and specific (e.g., "Thai Basil Chicken Stir-Fry" not just "Chicken Stir-Fry").

Return ONLY valid JSON, no markdown:
{
  "ideas": [
    {
      "name": "Recipe Name",
      "description": "One punchy sentence that makes them want to cook it.",
      "keyIngredients": ["ingredient1", "ingredient2", "ingredient3", "ingredient4"],
      "tags": ["tag1", "tag2"],
      "concept": "Full concept string to use as a recipe generation prompt, e.g. 'Thai Basil Chicken Stir-Fry with jasmine rice, fish sauce, oyster sauce and Thai chilies'"
    }
  ]
}`;

    const message = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 1200,
      messages: [{ role: 'user', content: prompt }],
    });

    const jsonText = (message.choices[0].message.content ?? '')
      .trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '');

    const result = JSON.parse(jsonText);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Inspire error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
