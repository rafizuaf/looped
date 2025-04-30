-- Add updated_at column to operational_costs table
ALTER TABLE operational_costs 
ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now(); 