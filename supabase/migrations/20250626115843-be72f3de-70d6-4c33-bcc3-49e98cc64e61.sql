
-- Fix the user_pins table schema and RLS policies
ALTER TABLE public.user_pins 
ALTER COLUMN user_id SET NOT NULL;

-- Drop the conflicting RLS policy that's causing issues
DROP POLICY IF EXISTS "Users can manage their own PINs" ON public.user_pins;

-- Ensure we have the correct specific policies
DROP POLICY IF EXISTS "Users can view their own pins" ON public.user_pins;
DROP POLICY IF EXISTS "Users can create their own pins" ON public.user_pins;
DROP POLICY IF EXISTS "Users can update their own pins" ON public.user_pins;
DROP POLICY IF EXISTS "Users can delete their own pins" ON public.user_pins;

-- Create clear, specific RLS policies
CREATE POLICY "Users can view their own pins" 
ON public.user_pins 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own pins" 
ON public.user_pins 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pins" 
ON public.user_pins 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own pins" 
ON public.user_pins 
FOR DELETE 
USING (auth.uid() = user_id);
