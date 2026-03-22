-- Add chef's notes field to recipes
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS notes TEXT[];
