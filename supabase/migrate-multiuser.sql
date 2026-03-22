-- Multi-user migration for Thay's Kitchen
-- Run this in your Supabase SQL editor (Dashboard → SQL Editor → New query)

-- Step 1: Add user_id column to all tables
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE appliances ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Step 2: Drop the old open-access policies
DROP POLICY IF EXISTS "Allow all on inventory_items" ON inventory_items;
DROP POLICY IF EXISTS "Allow all on appliances" ON appliances;
DROP POLICY IF EXISTS "Allow all on recipes" ON recipes;

-- Step 3: Create user-scoped policies (each user only sees their own data)
CREATE POLICY "Users manage own inventory" ON inventory_items
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own appliances" ON appliances
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own recipes" ON recipes
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- -------------------------------------------------------
-- Step 4: Assign existing data to Thay's account
-- Run this AFTER Thay has signed up and you have her user ID.
-- To find her user ID: Dashboard → Authentication → Users → click her email
--
-- Replace 'PASTE-THAYNA-USER-ID-HERE' with her actual UUID, then run:
-- -------------------------------------------------------

-- UPDATE inventory_items SET user_id = 'PASTE-THAYNA-USER-ID-HERE' WHERE user_id IS NULL;
-- UPDATE appliances SET user_id = 'PASTE-THAYNA-USER-ID-HERE' WHERE user_id IS NULL;
-- UPDATE recipes SET user_id = 'PASTE-THAYNA-USER-ID-HERE' WHERE user_id IS NULL;
