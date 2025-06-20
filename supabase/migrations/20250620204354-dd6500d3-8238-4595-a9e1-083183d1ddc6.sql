
-- Add email field to user_pins table for user lookup without session
ALTER TABLE public.user_pins 
ADD COLUMN user_email TEXT;

-- Add email field to biometric_credentials table for user lookup without session  
ALTER TABLE public.biometric_credentials 
ADD COLUMN user_email TEXT;

-- Add device_info column if it doesn't exist (for better biometric management)
ALTER TABLE public.biometric_credentials 
ADD COLUMN IF NOT EXISTS device_info JSONB;

-- Create index on email fields for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_pins_email ON public.user_pins(user_email);
CREATE INDEX IF NOT EXISTS idx_biometric_credentials_email ON public.biometric_credentials(user_email);

-- Update existing records to populate email field (this will need to be done manually or via a data migration)
-- Users will need to re-setup their PIN/biometric if they have existing ones without email
