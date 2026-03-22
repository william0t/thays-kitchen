import OpenAI from 'openai';
import { NextRequest, NextResponse } from 'next/server';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(request: NextRequest) {
  try {
    const { recipe } = await request.json();

    const cuisineCues = [
      recipe.name,
      recipe.description,
      ...(recipe.tags ?? []),
    ].filter(Boolean).join(', ');

    const totalTime = (recipe.prep_time ?? 0) + (recipe.cook_time ?? 0);

    const prompt = `You are a professional chef advising on the perfect side dishes to accompany a main course.

MAIN DISH: ${recipe.name}
DESCRIPTION: ${recipe.description ?? ''}
CUISINE/TAGS: ${cuisineCues}
ESTIMATED TOTAL COOK TIME: ${totalTime} minutes

Your job is to suggest 5 side dish pairings that complement this main dish well. Follow these principles:

CUISINE MATCHING: Side dishes should feel native to the same cuisine or culture as the main dish. A Thai curry gets Thai sides (jasmine rice, cucumber salad, spring rolls). A pasta dish gets Italian sides. A BBQ burger gets classic American sides. Never suggest wildly out-of-place sides.

SKILL CALIBRATION: Infer the skill level required by the main dish's complexity and time. Match or slightly simplify the sides.
- Simple/quick main dish (under 30 min, few steps) → at least 2 store-bought suggestions, rest are simple homemade
- Moderate main dish → mix of easy homemade and store-bought options
- Complex/long main dish → mostly homemade, higher-effort sides are appropriate; store-bought only for very niche items

VARIETY: Include a mix of:
- At least 1-2 store-bought options (honest, zero-shame — e.g. "a bag of kettle chips", "store-bought naan")
- 2-3 homemade options ranging from simple to slightly more involved
- Different categories: starch, vegetable/salad, bread, condiment/dip, soup

STORE-BOUGHT CLARITY: When suggesting a store-bought item, be specific and honest (e.g., "Store-bought pita bread", "A bag of tortilla chips", "Rotisserie chicken" if appropriate as a side).

DIFFICULTY CALIBRATION:
- "novice" = something anyone can do with zero skill (open a bag, make instant rice, slice tomatoes)
- "home_cook" = straightforward recipe, maybe 15-25 min
- "pro" = requires some technique or time investment

TIME CALIBRATION: estimatedMinutes should be honest — store-bought items might be 2 minutes (open and serve), simple sides 10-15 min, more involved sides 20-40 min.

Return ONLY a valid JSON object (no markdown, no explanation):
{
  "sides": [
    {
      "name": "Side dish name",
      "description": "1 sentence — what it is and why it pairs well",
      "emoji": "single relevant emoji",
      "difficulty": "novice" | "home_cook" | "pro",
      "estimatedMinutes": <number>,
      "isStoreBought": <boolean>
    }
  ]
}

Generate exactly 5 side dishes.`;

    const message = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 800,
      messages: [{ role: 'user', content: prompt }],
    });

    const jsonText = (message.choices[0].message.content ?? '')
      .trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '');
    const { sides } = JSON.parse(jsonText);

    return NextResponse.json({ sides });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Side dishes error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
