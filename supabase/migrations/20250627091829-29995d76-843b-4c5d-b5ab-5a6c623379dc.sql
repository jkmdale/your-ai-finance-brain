
-- Step 1: Clean up conflicting RLS policies on user_pins table
-- First, drop the conflicting broad policy that covers ALL operations
DROP POLICY IF EXISTS "Users can manage their own PINs" ON public.user_pins;
DROP POLICY IF EXISTS "Users can manage their own pins" ON public.user_pins;

-- Ensure we have clean, specific policies
DROP POLICY IF EXISTS "Users can view their own pins" ON public.user_pins;
DROP POLICY IF EXISTS "Users can create their own pins" ON public.user_pins;
DROP POLICY IF EXISTS "Users can update their own pins" ON public.user_pins;
DROP POLICY IF EXISTS "Users can delete their own pins" ON public.user_pins;

-- Create clean, specific RLS policies with consistent naming
CREATE POLICY "pin_select_policy" 
ON public.user_pins 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "pin_insert_policy" 
ON public.user_pins 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "pin_update_policy" 
ON public.user_pins 
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "pin_delete_policy" 
ON public.user_pins 
FOR DELETE 
TO authenticated
USING (auth.uid() = user_id);

-- Ensure RLS is enabled
ALTER TABLE public.user_pins ENABLE ROW LEVEL SECURITY;
