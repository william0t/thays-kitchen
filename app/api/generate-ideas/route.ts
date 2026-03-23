import OpenAI from 'openai';
import { NextRequest, NextResponse } from 'next/server';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(request: NextRequest) {
  try {
    const {
      ingredients, appliances, preferences, servings,
      useAll, skillLevel, lazy, adventurous, mealType, healthy,
    } = await request.json();

    const ingredientList = ingredients
      .filter((i: { in_stock: boolean }) => i.in_stock)
      .map((i: { name: string }) => i.name)
      .join(', ');

    const applianceList = appliances.map((a: { name: string }) => a.name).join(', ');

    const skillLabels: Record<string, string> = {
      novice: 'Novice (can fry an egg, cook packet pasta)',
      home_cook: 'Home Cook (can follow a recipe confidently)',
      pro: 'Pro (makes gnocchi from scratch, professional techniques)',
    };

    const moodText = lazy
      ? 'LAZY — keep it under 15 minutes active time, minimal effort, maximum satisfaction'
      : adventurous
      ? 'ADVENTUROUS — push past their comfort zone, more time and effort expected, something impressive'
      : 'Normal — balanced effort and reward';

    const mealText = mealType && mealType !== 'any'
      ? `This must be a ${mealType} recipe.`
      : 'Any meal type is fine.';

    const healthText = healthy === true
      ? 'HEALTHY: prioritise nutritious, balanced, whole-food recipes. Avoid heavy cream, excess butter, deep frying, or overly indulgent dishes.'
      : healthy === false
      ? 'TREAT YOURSELF: go full comfort food. Rich sauces, cheese, indulgent flavours — this is not the night for salads.'
      : 'No health preference — just make it delicious.';

    const prompt = `You are a creative professional chef. Based on the cook's pantry and criteria below, generate exactly 10 diverse, enticing recipe ideas. These are inspiration cards — NOT full recipes.

AVAILABLE INGREDIENTS: ${ingredientList || 'Basic pantry staples'}
AVAILABLE APPLIANCES: ${applianceList || 'Standard stovetop and oven'}
SERVINGS: ${servings || 4}
SKILL LEVEL: ${skillLabels[skillLevel] || skillLabels.home_cook}
MOOD: ${moodText}
MEAL TYPE: ${mealText}
HEALTH PREFERENCE: ${healthText}
ADDITIONAL PREFERENCES: ${preferences || 'None'}
INGREDIENT MODE: ${useAll ? 'Use available ingredients as inspiration — pick what works' : 'Build from the provided ingredients'}

RULES FOR IDEAS:
- Generate exactly 10 ideas. No more, no less.
- Make them DIVERSE: vary cuisines (Italian, Asian, Mexican, Middle Eastern, American, etc.), cooking methods (roast, stir-fry, soup, raw, bake, grill), and flavour profiles (spicy, umami, bright/acidic, rich, fresh).
- Every idea must be REALISTIC with the available ingredients — don't invent things that require completely unavailable key ingredients.
- Match the skill level precisely: novice ideas should be simple; pro ideas can be technical.
- Match the mood: lazy = fast and minimal; adventurous = challenging and impressive.
- Match the meal type and health preference strictly.
- The "concept" field is the brief that will guide full recipe generation — make it vivid, specific, and helpful. Include the key technique, the flavour goal, and any special notes.

Return ONLY a valid JSON object (no markdown, no explanation):
{
  "ideas": [
    {
      "name": "Dish Name",
      "description": "One punchy, appetising sentence. Make it sound delicious.",
      "emoji": "single relevant food emoji",
      "estimatedMinutes": <realistic total time in minutes>,
      "keyIngredients": ["ingredient1", "ingredient2", "ingredient3", "ingredient4"],
      "concept": "A paragraph (3-5 sentences) describing exactly how to approach this dish: the key technique, the flavour goal, any important tips or variations, and what makes it special. This will be used to generate the full recipe."
    }
  ]
}`;

    const message = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 3000,
      messages: [{ role: 'user', content: prompt }],
    });

    const jsonText = (message.choices[0].message.content ?? '')
      .trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '');
    const { ideas } = JSON.parse(jsonText);

    return NextResponse.json({ ideas });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Generate ideas error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
