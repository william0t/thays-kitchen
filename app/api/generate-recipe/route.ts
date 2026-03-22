import OpenAI from 'openai';
import { NextRequest, NextResponse } from 'next/server';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { ingredients, appliances, preferences, servings, useAll, strictStock } = await request.json();

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

    const strictStockInstruction = strictStock
      ? `STRICT PANTRY MODE IS ACTIVE: The ingredients array in your response must contain ONLY ingredients from the list above. Salt is the one universal exception — you may always include salt. Do NOT add any other ingredient not in the list. If a classic addition (e.g. oregano, garlic, lemon) would enhance the dish but is not listed, you may mention it naturally as an optional note within the relevant instruction step (e.g., "Add a pinch of dried oregano if you have it — it adds a lovely warmth here"), but it must NOT appear in the ingredients array.`
      : '';

    const beginnerCoachingInstruction = `BEGINNER COACHING: Weave practical cooking tips naturally into the instruction steps — they should read as part of the step, not as separate callouts. Include tips like:
- After adding seasoning: remind the cook to taste and adjust (e.g., "Give it a taste — it should be just slightly more seasoned than feels right, as it mellows as it finishes cooking")
- During any waiting or simmering step: suggest using that time productively (e.g., "While this simmers, wash and put away your prep bowls and utensils — you'll thank yourself later")
- Before searing or frying: warn not to overcrowd the pan (e.g., "Don't crowd the pan — leave space between pieces. Crowding traps steam and prevents browning")
- After cooking any meat or poultry: remind to rest it before cutting (e.g., "Let it rest for 3–5 minutes before slicing — this lets the juices redistribute and keeps the meat tender and moist")
- During multi-ingredient prep: encourage mise en place (e.g., "Before you start the heat, make sure everything is measured and ready — once things get going, you won't have time to stop and chop")
- When checking doneness: give a real-world test, not just a time (e.g., "Test a piece — it should be fork-tender, not just soft on the outside")
These should feel like guidance from an experienced friend standing next to the cook.`;

    const prompt = `You are a professional chef and recipe creator. Create a delicious, detailed recipe.

${ingredientInstruction}
AVAILABLE APPLIANCES: ${applianceList || 'Standard stovetop and oven'}
SERVINGS: ${servings || 4}
PREFERENCES/NOTES: ${preferences || 'None specified'}

${useAll ? 'IMPORTANT: You are not required to use every ingredient listed. Pick a natural, well-known combination that results in a great dish. Ignore ingredients that would make the dish weird or incoherent.' : 'Use the provided ingredients as the base for the recipe.'}
${strictStockInstruction}

${beginnerCoachingInstruction}

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
