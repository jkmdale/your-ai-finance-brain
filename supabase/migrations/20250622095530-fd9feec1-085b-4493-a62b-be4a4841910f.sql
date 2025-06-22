
-- Add encryption-related columns to store encrypted data and metadata
ALTER TABLE public.transactions 
ADD COLUMN encrypted_data TEXT,
ADD COLUMN encryption_metadata JSONB;

ALTER TABLE public.bank_accounts 
ADD COLUMN encrypted_data TEXT,
ADD COLUMN encryption_metadata JSONB;

ALTER TABLE public.budgets 
ADD COLUMN encrypted_data TEXT,
ADD COLUMN encryption_metadata JSONB;

ALTER TABLE public.categories 
ADD COLUMN encrypted_data TEXT,
ADD COLUMN encryption_metadata JSONB;

ALTER TABLE public.financial_goals 
ADD COLUMN encrypted_data TEXT,
ADD COLUMN encryption_metadata JSONB;

ALTER TABLE public.user_profiles 
ADD COLUMN encrypted_data TEXT,
ADD COLUMN encryption_metadata JSONB;

-- Create a table to store user encryption keys (encrypted with user's master key)
CREATE TABLE IF NOT EXISTS public.user_encryption_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  encrypted_private_key TEXT NOT NULL,
  public_key TEXT NOT NULL,
  key_derivation_salt TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Enable RLS on the new table
ALTER TABLE public.user_encryption_keys ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for user encryption keys
CREATE POLICY "Users can manage their own encryption keys" 
ON public.user_encryption_keys
FOR ALL 
USING (auth.uid() = user_id);

-- Create function to handle encryption key setup for new users
CREATE OR REPLACE FUNCTION public.setup_user_encryption()
RETURNS TRIGGER AS $$
BEGIN
  -- This will be called when a user signs up
  -- The actual key generation will be done client-side
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the updated_at trigger for encryption keys
CREATE TRIGGER update_user_encryption_keys_updated_at 
BEFORE UPDATE ON public.user_encryption_keys
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
