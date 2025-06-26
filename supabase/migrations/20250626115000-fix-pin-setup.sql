
-- Fix the user_pins table structure to match what the code expects
ALTER TABLE public.user_pins 
ADD COLUMN IF NOT EXISTS pin_salt TEXT,
ADD COLUMN IF NOT EXISTS user_email TEXT;

-- Create index for better performance on email lookups
CREATE INDEX IF NOT EXISTS idx_user_pins_email ON public.user_pins(user_email);

-- Update the existing trigger to handle updated_at properly
DROP TRIGGER IF EXISTS update_user_pins_updated_at ON public.user_pins;
CREATE TRIGGER update_user_pins_updated_at 
    BEFORE UPDATE ON public.user_pins
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
