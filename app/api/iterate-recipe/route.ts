import OpenAI from 'openai';
import { NextRequest, NextResponse } from 'next/server';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export type IterationIntensity = 'tweak' | 'rework' | 'reinvent';

const INTENSITY_INSTRUCTIONS: Record<IterationIntensity, string> = {
  tweak: `CHANGE LEVEL: Small tweak.
Make minimal, surgical changes only — swap one ingredient, adjust a ratio, change a seasoning, or refine one step. Everything else stays identical. The recipe should be recognizably the same dish. Do not change the dish name unless a single word needs to change.`,

  rework: `CHANGE LEVEL: Rework it.
Significantly change the flavour profile, cooking style, or key ingredients to honor the user's request. The dish category and structure can shift (e.g., going Mediterranean means swapping proteins, aromatics, sauces, and herbs). The name should reflect the new direction. Keep the same number of servings and a similar prep/cook time where possible.`,

  reinvent: `CHANGE LEVEL: Reinvent it.
Write a completely new recipe inspired by the user's request. The original recipe is just a loose starting point — take it in a bold new direction. New name, new ingredients, new method. The only constraint is that the result should be a great, coherent dish that honors the user's intent.`,
};

export async function POST(request: NextRequest) {
  try {
    const { recipe, userRequest, intensity } = await request.json() as {
      recipe: {
        name: string;
        description: string;
        prep_time: number | null;
        cook_time: number | null;
        servings: number;
        tags: string[];
        appliances_used: string[];
        ingredients: { name: string; amount: number; unit: string }[];
        instructions: string[];
        notes: string[];
      };
      userRequest: string;
      intensity: IterationIntensity;
    };

    const currentRecipeText = `Name: ${recipe.name}
Description: ${recipe.description ?? ''}
Servings: ${recipe.servings}
Prep: ${recipe.prep_time ?? '?'} min | Cook: ${recipe.cook_time ?? '?'} min

Ingredients:
${recipe.ingredients.map((i) => `- ${i.amount} ${i.unit} ${i.name}`).join('\n')}

Instructions:
${recipe.instructions.map((s, i) => `${i + 1}. ${s}`).join('\n')}

Chef's Notes:
${(recipe.notes ?? []).map((n) => `• ${n}`).join('\n')}`;

    const prompt = `You are an expert chef helping a home cook modify a recipe.

CURRENT RECIPE:
${currentRecipeText}

USER REQUEST: "${userRequest}"

${INTENSITY_INSTRUCTIONS[intensity as IterationIntensity] ?? INTENSITY_INSTRUCTIONS.rework}

Apply the user's request and return the updated recipe. Include beginner-friendly coaching tips woven naturally into the instruction steps (not as separate callouts).

Return ONLY valid JSON with this exact structure (no markdown, no explanation):
{
  "name": "Recipe Name",
  "description": "1-2 sentence appetizing description",
  "prep_time": <number in minutes>,
  "cook_time": <number in minutes>,
  "servings": <number>,
  "tags": ["tag1", "tag2", "tag3"],
  "appliances_used": ["appliance1"],
  "ingredients": [
    { "name": "ingredient name", "amount": <number>, "unit": "unit" }
  ],
  "instructions": [
    "Step 1: detailed instruction",
    "Step 2: detailed instruction"
  ],
  "notes": [
    "Chef tip 1",
    "Chef tip 2",
    "Chef tip 3"
  ]
}`;

    const message = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    });

    const jsonText = (message.choices[0].message.content ?? '')
      .trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '');

    const updatedRecipe = JSON.parse(jsonText);
    return NextResponse.json({ recipe: updatedRecipe });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Iterate recipe error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
