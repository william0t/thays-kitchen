import OpenAI from 'openai';
import { NextRequest, NextResponse } from 'next/server';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { ingredients, appliances, preferences, servings, useAll, strictStock, skillLevel, lazy, adventurous, mealType, healthy } = await request.json();

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

    const skillLevelInstructions: Record<string, string> = {
      novice: `COOKING SKILL LEVEL — NOVICE ("Can fry an egg and cook pasta from the packet"):
This cook is a complete beginner. Calibrate the entire recipe accordingly:
- RECIPE COMPLEXITY: Choose simple, well-known dishes that are forgiving and hard to mess up. No complex timing or multi-component dishes.
- STEPS: 5-8 steps maximum. Every step must be crystal clear. Explain visual cues explicitly ("it should look golden-brown, like the color of toast"), tactile cues ("it should feel firm when you press it gently"), and smell cues ("it should smell nutty and fragrant").
- TECHNIQUES ALLOWED: boil, simmer, fry (simple), stir, combine, chop (basic), roast (set and forget). NO julienne, deglaze, emulsify, beurre blanc, tempering, braising, reduction sauces, folding egg whites, blind baking.
- EQUIPMENT: Standard stovetop and oven only. A single pan or pot is ideal. Avoid mandoline, stand mixer, thermometer, piping bag, or any specialty tools.
- SHORTCUTS ENCOURAGED: Use pre-made stocks instead of homemade, canned beans instead of dried, rotisserie chicken, jarred pasta sauce as a base, pre-cut vegetables, store-bought pastry. These are not cheating — they are smart cooking.
- INGREDIENTS: 5-9 total, widely available at any grocery store, affordable. No specialty items.
- TIME: 15-45 minutes total. No overnight marinades, no multi-hour braises.
- NOTES: Include what can go wrong and exactly how to fix it (e.g., "If your sauce looks greasy, add a splash of water and stir vigorously"). Make the cook feel capable and confident.`,

      home_cook: `COOKING SKILL LEVEL — HOME COOK ("Can read a recipe and follow it confidently"):
This person cooks regularly and can handle most standard kitchen tasks. They know their way around a kitchen but don't have formal training.
- RECIPE COMPLEXITY: Real-world restaurant-quality home cooking. Multi-step dishes with satisfying results. Can handle timing 2 components simultaneously.
- STEPS: 8-14 steps. Instructions should explain the "why" behind key actions (e.g., "Deglaze with wine — this lifts the browned bits stuck to the pan, which are packed with flavor and give the sauce real depth").
- TECHNIQUES ALLOWED: sauté, deglaze, reduce, roast, broil, marinate, caramelize, make pan sauces, basic emulsification (vinaigrette), cook meat to doneness by touch/color, fold gently. Can handle knife work for fresh vegetables and herbs.
- EQUIPMENT: Can use most standard appliances listed. A well-equipped home kitchen is assumed.
- SHORTCUTS: Optional — mention them as alternatives ("You could use store-bought stock here, but homemade adds a noticeable depth"). Don't require specialty homemade components.
- INGREDIENTS: 10-16, mix of fresh and pantry staples. Can include specialty items like fish sauce, tahini, miso, fresh herbs by name.
- TIME: 30-90 minutes. Can suggest a 30-min marinade if it adds real value.
- NOTES: Tips for perfecting the dish — common mistakes, make-ahead options, ingredient substitutions, plating ideas.`,

      pro: `COOKING SKILL LEVEL — PRO ("Makes gnocchi from scratch, understands mise en place instinctively"):
This is an experienced, skilled home cook or professional. They think like a chef.
- RECIPE COMPLEXITY: Restaurant-caliber dishes. Multi-component, elevated, technically demanding. Push the quality ceiling.
- STEPS: 10-20 steps. Be precise and exacting ("Sweat the shallots without browning, 3-4 minutes until translucent", "Cook to 165°F internal temperature", "Season until the sauce 'pops' — it should taste brighter and more alive").
- TECHNIQUES EXPECTED: beurre blanc, hollandaise (or derivative), stock reduction, dry brining, proper searing (Maillard reaction), making fresh pasta, homemade stocks, confit, blooming spices, mounting butter into a sauce. Use professional terminology without explanation. Reference mise en place naturally.
- EQUIPMENT: All available appliances are fair game. Suggest sous vide, blow torch, or specialty tools only if they appear in the appliances list.
- HOUSE-MADE PREFERRED: Fresh pasta, homemade stocks, from-scratch sauces, fermented or cured elements if reasonable. Store-bought is a last resort.
- INGREDIENTS: 15-25+. Use specific ingredient names (shallots not onions, crème fraîche not sour cream, Parmigiano-Reggiano not parmesan, fresh thyme not dried). Specialty and artisan ingredients are appropriate.
- TIME: 45 minutes to several hours. Quality over speed always.
- NOTES: Advanced chef-level tips — precise technique guidance, wine and beverage pairings, professional plating guidance, what separates a good version from a great version.`,
    };

    const moodInstruction = lazy
      ? `MOOD — LAZY ("I just want something quick and easy"):
The cook wants MAXIMUM flavor for MINIMUM effort right now. This is non-negotiable.
- TOTAL ACTIVE COOKING TIME: 15 minutes or less. Passive waiting (oven, simmer) is acceptable if the cook is hands-off.
- COMPLEXITY: One-pan, one-pot, or zero-cook preferred. Assembly dishes, dump-and-heat, pantry raids.
- For a NOVICE feeling lazy: think scrambled eggs with toast, upgraded instant ramen, simple quesadilla, tuna salad sandwich.
- For a HOME COOK feeling lazy: quick stir-fry, grain bowl with pantry toppings, pasta aglio e olio, sheet pan sausages and vegetables.
- For a PRO feeling lazy: high-quality simple preparations where great ingredients shine with minimal cooking (crudo, tartare if appropriate, perfect soft-boiled egg over rice, anchovy toast with good butter, quality charcuterie assembly).
- Embrace store-bought shortcuts without shame. This is not the time for homemade anything unless it takes 5 minutes.
- The recipe should feel like a relief and a treat, not a compromise. Lazy doesn't mean bad — it means smart and satisfying.`
      : adventurous
      ? `MOOD — ADVENTUROUS ("Push me past my comfort zone"):
The cook wants to be challenged, impressed, and proud. This is their moment to level up.
- AMBITION: Push noticeably past what this skill level normally attempts. The recipe should feel exciting and slightly intimidating — in a good way.
- For a NOVICE feeling adventurous: tackle something they'd normally be scared of — maybe homemade pizza dough (simple version), a proper stir-fry with fresh aromatics, shakshuka with spiced tomato sauce, or a simple soup made entirely from scratch.
- For a HOME COOK feeling adventurous: intermediate-challenging techniques — fresh pasta from scratch, a whole roasted fish, a complex braise (short ribs, osso buco), making a proper French sauce (beurre blanc, hollandaise), a multi-component dish with separate elements.
- For a PRO feeling adventurous: highly technical preparations — sous vide with finishing sear, multi-day curing or fermentation, full soufflé, puff pastry from scratch, complex molecular technique, multi-component restaurant-style plating with 3+ elements all made from scratch.
- TIME: Significantly longer than normal — 1.5-4 hours for novice/home cook, 2-8 hours for pro. Quality and learning are the goal.
- NOTES: Include specific encouragement and guidance for the challenging parts. Explain why each hard step is worth it. This is the recipe that changes how someone thinks about cooking.`
      : '';

    const beginnerCoachingInstruction = `BEGINNER COACHING: Weave practical cooking tips naturally into the instruction steps — they should read as part of the step, not as separate callouts. Include tips like:
- After adding seasoning: remind the cook to taste and adjust (e.g., "Give it a taste — it should be just slightly more seasoned than feels right, as it mellows as it finishes cooking")
- During any waiting or simmering step: suggest using that time productively (e.g., "While this simmers, wash and put away your prep bowls and utensils — you'll thank yourself later")
- Before searing or frying: warn not to overcrowd the pan (e.g., "Don't crowd the pan — leave space between pieces. Crowding traps steam and prevents browning")
- After cooking any meat or poultry: remind to rest it before cutting (e.g., "Let it rest for 3–5 minutes before slicing — this lets the juices redistribute and keeps the meat tender and moist")
- During multi-ingredient prep: encourage mise en place (e.g., "Before you start the heat, make sure everything is measured and ready — once things get going, you won't have time to stop and chop")
- When checking doneness: give a real-world test, not just a time (e.g., "Test a piece — it should be fork-tender, not just soft on the outside")
These should feel like guidance from an experienced friend standing next to the cook.`;

    const activeSkillLevel = skillLevel || 'home_cook';
    const skillInstruction = skillLevelInstructions[activeSkillLevel] ?? skillLevelInstructions.home_cook;

    const mealTypeInstruction = mealType && mealType !== 'any'
      ? `MEAL TYPE — ${mealType.toUpperCase()}: This recipe MUST be a ${mealType} dish. Design it specifically for that meal occasion — appropriate portion size, ingredients, timing, and format for ${mealType}.`
      : '';

    const healthInstruction = healthy === true
      ? `HEALTH FOCUS — HEALTHY: Prioritise nutritious, balanced, whole-food cooking. Use lean proteins, plenty of vegetables, whole grains, healthy fats (olive oil, avocado, nuts). Minimise added sugar, heavy cream, and deep frying. The dish should be satisfying AND good for you.`
      : healthy === false
      ? `HEALTH FOCUS — TREAT YOURSELF: This is comfort food night. Go rich, indulgent, and satisfying. Butter, cream, cheese, crispy things — lean into it. This is not the night for calorie counting.`
      : '';

    const prompt = `You are a professional chef and recipe creator. Create a delicious, detailed recipe.

${ingredientInstruction}
AVAILABLE APPLIANCES: ${applianceList || 'Standard stovetop and oven'}
SERVINGS: ${servings || 4}
PREFERENCES/NOTES: ${preferences || 'None specified'}

${useAll ? 'IMPORTANT: You are not required to use every ingredient listed. Pick a natural, well-known combination that results in a great dish. Ignore ingredients that would make the dish weird or incoherent.' : 'Use the provided ingredients as the base for the recipe.'}
${strictStockInstruction}

${skillInstruction}

${moodInstruction}

${mealTypeInstruction}

${healthInstruction}

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
  ],
  "notes": [
    "Chef tip 1 for making it even better",
    "Chef tip 2",
    "Chef tip 3"
  ]
}

Make the recipe practical, delicious, and achievable with the listed appliances. Instructions should be detailed and clear. Include 6-12 steps. The notes array should contain 3-5 chef-level tips for elevating the dish — things like ingredient swaps, make-ahead tricks, common mistakes to avoid, wine pairings, or how to store leftovers. These should feel like advice from a chef who has made this dish hundreds of times.`;

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
