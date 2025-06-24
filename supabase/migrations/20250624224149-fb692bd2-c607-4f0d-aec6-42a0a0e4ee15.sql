
-- Add RLS policies for biometric_credentials table
CREATE POLICY "Users can view their own biometric credentials" 
ON public.biometric_credentials 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own biometric credentials" 
ON public.biometric_credentials 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own biometric credentials" 
ON public.biometric_credentials 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own biometric credentials" 
ON public.biometric_credentials 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add RLS policies for user_pins table
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

-- Enable RLS on both tables if not already enabled
ALTER TABLE public.biometric_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_pins ENABLE ROW LEVEL SECURITY;
