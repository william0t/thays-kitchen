import OpenAI from 'openai';
import { NextRequest, NextResponse } from 'next/server';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const VALID_CATEGORIES = [
  'spices', 'condiments', 'proteins', 'fruits',
  'vegetables', 'carbs', 'dairy', 'pantry', 'beverages', 'frozen', 'other',
] as const;

export async function POST(request: NextRequest) {
  try {
    const { transcript } = await request.json();

    if (!transcript?.trim()) {
      return NextResponse.json({ items: [] });
    }

    const prompt = `You are a smart grocery list parser for a pantry tracking app.

The user spoke the following text to add food items to their pantry:
"${transcript}"

Extract every food or grocery item mentioned. Ignore non-food words, filler phrases ("um", "and", "also", "some", "a bit of", "maybe"), quantities, and units — just extract the food item names.

For each item, assign the most appropriate category from this exact list:
- spices (herbs, spices, seasonings, salt, pepper)
- condiments (sauces, dressings, mayo, ketchup, soy sauce, vinegar, oils)
- proteins (meat, fish, eggs, tofu, beans, legumes, nuts)
- fruits (all fruits, including tomatoes if used as fruit)
- vegetables (all vegetables, including tomatoes if used as veg — default to vegetables)
- carbs (bread, pasta, rice, grains, flour, oats, cereals, crackers)
- dairy (milk, cheese, yogurt, butter, cream, ice cream)
- pantry (canned goods, dried goods, baking ingredients, stocks, broths, sugar)
- beverages (drinks, juices, coffee, tea, alcohol)
- frozen (frozen meals, frozen vegetables, ice cream)
- other (anything that doesn't fit above)

Rules:
- Normalise names to their common form (e.g. "chicken breasts" → "Chicken breast", "toms" → "Tomatoes")
- Capitalise the first letter of each item
- If the same item is mentioned twice, include it only once
- If no food items are found, return an empty array
- Be generous — if it sounds like food, include it

Return ONLY valid JSON (no markdown):
{
  "items": [
    { "name": "Item Name", "category": "category_from_list" }
  ]
}`;

    const message = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 600,
      messages: [{ role: 'user', content: prompt }],
    });

    const jsonText = (message.choices[0].message.content ?? '')
      .trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '');
    const parsed = JSON.parse(jsonText);

    // Validate categories
    const items = (parsed.items || []).map((item: { name: string; category: string }) => ({
      name: item.name,
      category: VALID_CATEGORIES.includes(item.category as typeof VALID_CATEGORIES[number])
        ? item.category
        : 'other',
    }));

    return NextResponse.json({ items });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Voice parse error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
