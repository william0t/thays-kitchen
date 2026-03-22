import OpenAI from 'openai';
import { NextRequest, NextResponse } from 'next/server';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(request: NextRequest) {
  try {
    const { seedIngredients } = await request.json();

    const prompt = `You are a knowledgeable chef helping a home cook find recipe inspiration. Their star ingredient is: ${seedIngredients}

Give them 5 distinct, real-world recipe ideas where "${seedIngredients}" is the hero ingredient. These should be actual dishes people cook and love — not invented mashups or bizarre fusions. Shopping for extra ingredients is fine; this is about inspiration, not pantry limits.

Rules:
- Every idea must be a recognizable dish (or a clear, well-established variation). No made-up ingredient combos.
- The star ingredient must be central to the dish, not just a garnish.
- Vary the cuisine and cooking style across the 5 ideas (e.g. don't suggest 5 stir-fries).
- Be specific with dish names: "Miso-Glazed Salmon with Bok Choy" beats "Salmon Dish".
- The dish name must not include the word "${seedIngredients}" used in a nonsensical way (e.g. "${seedIngredients} spaghetti" is only acceptable if that is a real dish).

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
