export type InventoryCategory =
  | 'spices'
  | 'condiments'
  | 'proteins'
  | 'fruits'
  | 'vegetables'
  | 'carbs'
  | 'dairy'
  | 'pantry'
  | 'beverages'
  | 'frozen'
  | 'other';

export type ApplianceCategory =
  | 'cooking'
  | 'baking'
  | 'prep'
  | 'small_appliance'
  | 'other';

export interface InventoryItem {
  id: string;
  name: string;
  category: InventoryCategory;
  quantity: number | null;
  unit: string | null;
  notes: string | null;
  in_stock: boolean;
  created_at: string;
  updated_at: string;
}

export interface Appliance {
  id: string;
  name: string;
  category: ApplianceCategory;
  notes: string | null;
  created_at: string;
}

export interface RecipeIngredient {
  name: string;
  amount: number;
  unit: string;
}

export interface Recipe {
  id: string;
  name: string;
  description: string | null;
  ingredients: RecipeIngredient[];
  instructions: string[];
  servings: number;
  prep_time: number | null;
  cook_time: number | null;
  tags: string[] | null;
  appliances_used: string[] | null;
  ai_generated: boolean;
  created_at: string;
  updated_at: string;
}

export const CATEGORY_LABELS: Record<InventoryCategory, string> = {
  spices: 'Spices & Herbs',
  condiments: 'Condiments & Sauces',
  proteins: 'Proteins',
  fruits: 'Fruits',
  vegetables: 'Vegetables',
  carbs: 'Carbs & Grains',
  dairy: 'Dairy & Eggs',
  pantry: 'Pantry Staples',
  beverages: 'Beverages',
  frozen: 'Frozen',
  other: 'Other',
};

export const CATEGORY_EMOJIS: Record<InventoryCategory, string> = {
  spices: '🌶️',
  condiments: '🫙',
  proteins: '🥩',
  fruits: '🍓',
  vegetables: '🥦',
  carbs: '🍞',
  dairy: '🥚',
  pantry: '🫘',
  beverages: '🧃',
  frozen: '🧊',
  other: '📦',
};

export const APPLIANCE_CATEGORY_LABELS: Record<ApplianceCategory, string> = {
  cooking: 'Cooking',
  baking: 'Baking',
  prep: 'Prep Tools',
  small_appliance: 'Small Appliances',
  other: 'Other',
};

export const APPLIANCE_EMOJIS: Record<ApplianceCategory, string> = {
  cooking: '🍳',
  baking: '🥧',
  prep: '🔪',
  small_appliance: '⚡',
  other: '🛠️',
};

export const COMMON_UNITS = [
  'count',
  'oz',
  'lbs',
  'g',
  'kg',
  'cups',
  'tbsp',
  'tsp',
  'liters',
  'ml',
  'gallons',
  'quarts',
  'pints',
  'bunch',
  'bag',
  'can',
  'bottle',
  'jar',
  'box',
  'package',
];
