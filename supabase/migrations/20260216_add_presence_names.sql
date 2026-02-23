-- Add name columns for present entities
ALTER TABLE activities 
ADD COLUMN IF NOT EXISTS minister_name TEXT,
ADD COLUMN IF NOT EXISTS governor_name TEXT,
ADD COLUMN IF NOT EXISTS administrator_name TEXT;
