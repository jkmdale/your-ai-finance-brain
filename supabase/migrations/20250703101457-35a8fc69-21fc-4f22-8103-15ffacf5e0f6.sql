-- Add income_type column to transactions table for better income classification
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS income_type TEXT;