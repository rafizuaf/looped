/*
 # Initial Schema Setup for Looped Thrift Shop
 
 1. New Tables
 - `batches`
 - `id` (uuid, primary key)
 - `name` (text)
 - `description` (text)
 - `purchase_date` (timestamptz)
 - `total_items` (integer)
 - `total_cost` (numeric)
 - `total_sold` (integer)
 - `total_revenue` (numeric)
 - `created_at` (timestamptz)
 - `updated_at` (timestamptz)
 - `user_id` (uuid, foreign key)
 
 - `items`
 - `id` (uuid, primary key)
 - `batch_id` (uuid, foreign key)
 - `name` (text)
 - `category` (text)
 - `purchase_price` (numeric)
 - `selling_price` (numeric)
 - `margin_percentage` (numeric)
 - `margin_value` (numeric)
 - `sold_status` (text)
 - `total_cost` (numeric)
 - `created_at` (timestamptz)
 - `updated_at` (timestamptz)
 - `user_id` (uuid, foreign key)
 
 - `operational_costs`
 - `id` (uuid, primary key)
 - `batch_id` (uuid, foreign key)
 - `name` (text)
 - `amount` (numeric)
 - `date` (timestamptz)
 - `created_at` (timestamptz)
 - `user_id` (uuid, foreign key)
 
 2. Security
 - Enable RLS on all tables
 - Add policies for authenticated users to manage their own data
 */
-- Create batches table
CREATE TABLE batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  purchase_date timestamptz NOT NULL,
  total_items integer NOT NULL DEFAULT 0,
  total_cost numeric NOT NULL DEFAULT 0,
  total_sold integer NOT NULL DEFAULT 0,
  total_revenue numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid NOT NULL REFERENCES auth.users(id)
);

-- Create items table
CREATE TABLE items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text NOT NULL,
  purchase_price numeric NOT NULL,
  selling_price numeric NOT NULL,
  margin_percentage numeric NOT NULL,
  margin_value numeric NOT NULL,
  sold_status text NOT NULL CHECK (sold_status IN ('sold', 'unsold')),
  total_cost numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid NOT NULL REFERENCES auth.users(id)
);

-- Create operational_costs table
CREATE TABLE operational_costs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  name text NOT NULL,
  amount numeric NOT NULL,
  date timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid NOT NULL REFERENCES auth.users(id)
);

-- Enable Row Level Security
ALTER TABLE
  batches ENABLE ROW LEVEL SECURITY;

ALTER TABLE
  items ENABLE ROW LEVEL SECURITY;

ALTER TABLE
  operational_costs ENABLE ROW LEVEL SECURITY;

-- Create policies for batches
CREATE POLICY "Users can view their own batches" ON batches FOR
SELECT
  TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own batches" ON batches FOR
INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own batches" ON batches FOR
UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own batches" ON batches FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Create policies for items
CREATE POLICY "Users can view their own items" ON items FOR
SELECT
  TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own items" ON items FOR
INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own items" ON items FOR
UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own items" ON items FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Create policies for operational_costs
CREATE POLICY "Users can view their own operational costs" ON operational_costs FOR
SELECT
  TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own operational costs" ON operational_costs FOR
INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own operational costs" ON operational_costs FOR
UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own operational costs" ON operational_costs FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Create indexes for better query performance
CREATE INDEX idx_batches_user_id ON batches(user_id);

CREATE INDEX idx_items_batch_id ON items(batch_id);

CREATE INDEX idx_items_user_id ON items(user_id);

CREATE INDEX idx_operational_costs_batch_id ON operational_costs(batch_id);

CREATE INDEX idx_operational_costs_user_id ON operational_costs(user_id);