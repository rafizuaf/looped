/*
  # Add Image Support and Soft Delete

  1. Changes
    - Add image_url column to items table
    - Add deleted_at column to all tables for soft delete
    - Create storage bucket for item images

  2. Security
    - Enable public access to item images bucket
    - Update RLS policies to handle soft delete
*/

-- Add image_url column to items table
ALTER TABLE items ADD COLUMN image_url text;

-- Add deleted_at columns for soft delete
ALTER TABLE batches ADD COLUMN deleted_at timestamptz;
ALTER TABLE items ADD COLUMN deleted_at timestamptz;
ALTER TABLE operational_costs ADD COLUMN deleted_at timestamptz;

-- Create storage bucket for item images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('item-images', 'item-images', true);

-- Create storage policy to allow public access to item images
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'item-images');

-- Update RLS policies to handle soft delete
CREATE POLICY "Users can view their non-deleted batches"
ON batches
FOR SELECT
TO authenticated
USING (auth.uid() = user_id AND deleted_at IS NULL);

CREATE POLICY "Users can view their non-deleted items"
ON items
FOR SELECT
TO authenticated
USING (auth.uid() = user_id AND deleted_at IS NULL);

CREATE POLICY "Users can view their non-deleted operational costs"
ON operational_costs
FOR SELECT
TO authenticated
USING (auth.uid() = user_id AND deleted_at IS NULL);