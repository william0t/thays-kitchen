import OpenAI from 'openai';
import { NextRequest, NextResponse } from 'next/server';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(request: NextRequest) {
  try {
    const { sideDish, mainRecipeName, mainRecipeTags } = await request.json();

    const cuisineContext = [mainRecipeName, ...(mainRecipeTags ?? [])].join(', ');

    const storeBoughtInstructions = sideDish.isStoreBought
      ? `IMPORTANT: This is a store-bought item. Generate a "recipe" that is simple, practical, and honest. Steps should be things like "Go to the grocery store and pick up X", "Open the package", "Serve alongside the main dish". Keep it 2-4 steps. Make it friendly and slightly humorous — it's OK to be casual. Still fill in all recipe fields (prep_time: 5, cook_time: 0, ingredients with the item as a single ingredient with amount: 1 unit: "package/bag/loaf/etc").`
      : `Generate a full, proper recipe for this side dish. It should be calibrated to ${sideDish.difficulty} skill level and take approximately ${sideDish.estimatedMinutes} minutes.`;

    const skillInstructions: Record<string, string> = {
      novice: `SKILL LEVEL — NOVICE: Steps must be extremely clear and detailed. Explain visual cues (what "golden" looks like), use shortcuts (pre-made, packaged items), keep ingredients to 5-8, total steps to 4-6. No specialized techniques.`,
      home_cook: `SKILL LEVEL — HOME COOK: Intermediate recipe. Can include sautéing, roasting, simple sauces. 6-10 steps. Explain the "why" behind key steps. 8-12 ingredients ok.`,
      pro: `SKILL LEVEL — PRO: Full technique expected. Use professional terminology. Multi-step, precise instructions. House-made elements preferred. No hand-holding needed.`,
    };

    const prompt = `You are a professional chef creating a side dish recipe.

SIDE DISH: ${sideDish.name}
DESCRIPTION: ${sideDish.description}
PAIRS WITH: ${cuisineContext}
ESTIMATED TIME: ${sideDish.estimatedMinutes} minutes

${storeBoughtInstructions}

${skillInstructions[sideDish.difficulty] ?? skillInstructions.home_cook}

Return ONLY a valid JSON object (no markdown, no explanation):
{
  "name": "${sideDish.name}",
  "description": "1-2 sentence appetizing description that mentions it pairs well with ${mainRecipeName}",
  "prep_time": <number in minutes>,
  "cook_time": <number in minutes>,
  "servings": 4,
  "tags": ["tag1", "tag2"],
  "appliances_used": ["appliance1"],
  "ingredients": [
    { "name": "ingredient name", "amount": <number>, "unit": "unit" }
  ],
  "instructions": [
    "Step 1: ...",
    "Step 2: ..."
  ],
  "notes": [
    "Tip 1",
    "Tip 2"
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
    const recipe = JSON.parse(jsonText);

    return NextResponse.json({ recipe });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Side dish recipe error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
