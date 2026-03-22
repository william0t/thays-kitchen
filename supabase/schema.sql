-- Thay's Kitchen Database Schema
-- Run this in your Supabase SQL editor

-- Inventory Items Table
CREATE TABLE IF NOT EXISTS inventory_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other',
  quantity DECIMAL,
  unit TEXT,
  notes TEXT,
  in_stock BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Appliances Table
CREATE TABLE IF NOT EXISTS appliances (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Recipes Table
CREATE TABLE IF NOT EXISTS recipes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  ingredients JSONB NOT NULL DEFAULT '[]',
  instructions TEXT[] NOT NULL DEFAULT '{}',
  servings INTEGER DEFAULT 4,
  prep_time INTEGER,
  cook_time INTEGER,
  tags TEXT[],
  appliances_used TEXT[],
  ai_generated BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_inventory_items_updated_at
  BEFORE UPDATE ON inventory_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_recipes_updated_at
  BEFORE UPDATE ON recipes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (open access since single-user app)
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE appliances ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;

-- Open policies for single-user app (no auth)
CREATE POLICY "Allow all on inventory_items" ON inventory_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on appliances" ON appliances FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on recipes" ON recipes FOR ALL USING (true) WITH CHECK (true);

-- Sample data to get started
INSERT INTO appliances (name, category) VALUES
  ('Instant Pot', 'small_appliance'),
  ('Air Fryer', 'small_appliance'),
  ('Microwave', 'small_appliance'),
  ('Stand Mixer', 'small_appliance'),
  ('Cast Iron Skillet', 'cooking'),
  ('Non-stick Pan', 'cooking'),
  ('Stock Pot', 'cooking'),
  ('Sheet Pan', 'baking'),
  ('Dutch Oven', 'cooking'),
  ('Chef''s Knife', 'prep')
ON CONFLICT DO NOTHING;
