
-- Check if the pin_salt column exists and fix any naming inconsistencies
-- First, let's ensure the user_pins table has the correct column name
ALTER TABLE public.user_pins 
ADD COLUMN IF NOT EXISTS salt TEXT;

-- If pin_salt exists, copy its data to salt column
UPDATE public.user_pins 
SET salt = pin_salt 
WHERE pin_salt IS NOT NULL AND salt IS NULL;

-- Drop the old pin_salt column if it exists
ALTER TABLE public.user_pins 
DROP COLUMN IF EXISTS pin_salt;

-- Make sure the salt column is properly set up
ALTER TABLE public.user_pins 
ALTER COLUMN salt SET DEFAULT NULL;
