/*
 # Consolidated Schema for Looped Thrift Shop
 
 This migration combines all previous migrations into a single, clean schema:
 
 1. Core Tables
 - `batches` - For managing batches of items
 - `items` - For individual items
 - `operational_costs` - For tracking costs
 - `budgets` - For managing user budgets
 - `budget_transactions` - For tracking budget-related activities
 
 2. Features
 - Image support with storage bucket
 - Soft delete functionality
 - Budget management system
 - Transaction support
 - Row Level Security (RLS)
 
 3. Functions
 - Budget management
 - Batch creation and management
 - Item management
 - Operational cost management
 - Sale and refund handling
 */
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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
    deleted_at timestamptz,
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
    image_url text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    deleted_at timestamptz,
    user_id uuid NOT NULL REFERENCES auth.users(id)
);

-- Create operational_costs table
CREATE TABLE operational_costs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id uuid REFERENCES batches(id) ON DELETE CASCADE,
    name text NOT NULL,
    amount numeric NOT NULL,
    date timestamptz NOT NULL,
    category text NOT NULL DEFAULT 'general',
    created_at timestamptz NOT NULL DEFAULT now(),
    deleted_at timestamptz,
    user_id uuid NOT NULL REFERENCES auth.users(id)
);

-- Create budgets table
CREATE TABLE budgets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id),
    current_amount numeric NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    deleted_at timestamptz,
    CONSTRAINT unique_user_budget UNIQUE (user_id)
);

-- Create budget_transactions table
CREATE TABLE budget_transactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id),
    amount numeric NOT NULL,
    transaction_type text NOT NULL CHECK (
        transaction_type IN (
            'top_up',
            'batch_purchase',
            'operational_cost',
            'operational_cost_refund',
            'item_sale',
            'item_sale_reversal',
            'other'
        )
    ),
    description text,
    reference_id uuid,
    created_at timestamptz NOT NULL DEFAULT now(),
    deleted_at timestamptz
);

-- Create storage bucket for item images
DO $$ BEGIN
INSERT INTO
    storage.buckets (id, name, public)
VALUES
    ('item-images', 'item-images', true);

EXCEPTION
WHEN unique_violation THEN NULL;

END $$;

-- Create storage policy to allow public access to item images
CREATE POLICY "Public Access" ON storage.objects FOR
SELECT
    TO public USING (bucket_id = 'item-images');

-- Enable Row Level Security
ALTER TABLE
    batches ENABLE ROW LEVEL SECURITY;

ALTER TABLE
    items ENABLE ROW LEVEL SECURITY;

ALTER TABLE
    operational_costs ENABLE ROW LEVEL SECURITY;

ALTER TABLE
    budgets ENABLE ROW LEVEL SECURITY;

ALTER TABLE
    budget_transactions ENABLE ROW LEVEL SECURITY;

-- Create indexes for better query performance
CREATE INDEX idx_batches_user_id ON batches(user_id);

CREATE INDEX idx_items_batch_id ON items(batch_id);

CREATE INDEX idx_items_user_id ON items(user_id);

CREATE INDEX idx_operational_costs_batch_id ON operational_costs(batch_id);

CREATE INDEX idx_operational_costs_user_id ON operational_costs(user_id);

CREATE INDEX idx_operational_costs_category ON operational_costs(category);

CREATE INDEX idx_budgets_user_id ON budgets(user_id);

CREATE INDEX idx_budget_transactions_user_id ON budget_transactions(user_id);

CREATE INDEX idx_budget_transactions_reference_id ON budget_transactions(reference_id);

CREATE INDEX idx_budget_transactions_type ON budget_transactions(transaction_type);

-- Create RLS policies for batches
CREATE POLICY "Users can view their non-deleted batches" ON batches FOR
SELECT
    TO authenticated USING (
        auth.uid() = user_id
        AND deleted_at IS NULL
    );

CREATE POLICY "Users can insert their own batches" ON batches FOR
INSERT
    TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own batches" ON batches FOR
UPDATE
    TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own batches" ON batches FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Create RLS policies for items
CREATE POLICY "Users can view their non-deleted items" ON items FOR
SELECT
    TO authenticated USING (
        auth.uid() = user_id
        AND deleted_at IS NULL
    );

CREATE POLICY "Users can insert their own items" ON items FOR
INSERT
    TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own items" ON items FOR
UPDATE
    TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own items" ON items FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Create RLS policies for operational_costs
CREATE POLICY "Users can view their non-deleted operational costs" ON operational_costs FOR
SELECT
    TO authenticated USING (
        auth.uid() = user_id
        AND deleted_at IS NULL
    );

CREATE POLICY "Users can insert their own operational costs" ON operational_costs FOR
INSERT
    TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own operational costs" ON operational_costs FOR
UPDATE
    TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own operational costs" ON operational_costs FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Create RLS policies for budgets
CREATE POLICY "Users can view their own budget" ON budgets FOR
SELECT
    TO authenticated USING (
        auth.uid() = user_id
        AND deleted_at IS NULL
    );

CREATE POLICY "Users can insert their own budget" ON budgets FOR
INSERT
    TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own budget" ON budgets FOR
UPDATE
    TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for budget_transactions
CREATE POLICY "Users can view their own budget transactions" ON budget_transactions FOR
SELECT
    TO authenticated USING (
        auth.uid() = user_id
        AND deleted_at IS NULL
    );

CREATE POLICY "Users can insert their own budget transactions" ON budget_transactions FOR
INSERT
    TO authenticated WITH CHECK (auth.uid() = user_id);

-- Function to create a budget transaction and update the budget
CREATE
OR REPLACE FUNCTION create_budget_transaction(
    p_user_id uuid,
    p_amount numeric,
    p_transaction_type text,
    p_description text,
    p_reference_id uuid DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$ DECLARE v_transaction jsonb;

v_current_budget numeric;

v_updated_budget numeric;

BEGIN -- Start transaction
BEGIN -- Check current budget amount
SELECT
    current_amount INTO v_current_budget
FROM
    budgets
WHERE
    user_id = p_user_id;

IF v_current_budget IS NULL THEN v_current_budget := 0;

END IF;

-- For deductions, ensure sufficient funds are available
IF p_amount < 0
AND (v_current_budget + p_amount) < 0 THEN RAISE EXCEPTION 'Insufficient budget. Current: %, Required: %',
v_current_budget,
ABS(p_amount);

END IF;

-- Insert the transaction
INSERT INTO
    budget_transactions (
        user_id,
        amount,
        transaction_type,
        description,
        reference_id
    )
VALUES
    (
        p_user_id,
        p_amount,
        p_transaction_type,
        p_description,
        p_reference_id
    ) RETURNING to_jsonb(budget_transactions.*) INTO v_transaction;

-- Update the budget amount (inserting if it doesn't exist)
INSERT INTO
    budgets (user_id, current_amount)
VALUES
    (p_user_id, p_amount) ON CONFLICT (user_id) DO
UPDATE
SET
    current_amount = budgets.current_amount + p_amount,
    updated_at = now() RETURNING current_amount INTO v_updated_budget;

-- Return transaction details with updated budget
RETURN jsonb_build_object(
    'transaction',
    v_transaction,
    'previous_budget',
    v_current_budget,
    'updated_budget',
    v_updated_budget
);

EXCEPTION
WHEN OTHERS THEN RAISE EXCEPTION 'Budget transaction failed: %',
SQLERRM;

END;

END;

$$;

-- Function to top up a user's budget
CREATE
OR REPLACE FUNCTION top_up_budget(
    p_user_id uuid,
    p_amount numeric,
    p_description text DEFAULT 'Budget top-up'
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$ DECLARE v_result jsonb;

BEGIN IF p_amount <= 0 THEN RAISE EXCEPTION 'Top-up amount must be positive';

END IF;

SELECT
    create_budget_transaction(
        p_user_id,
        p_amount,
        -- positive amount for top-up
        'top_up',
        p_description,
        NULL
    ) INTO v_result;

RETURN v_result;

END;

$$;

-- Function to create a batch with budget check
CREATE
OR REPLACE FUNCTION create_batch_with_budget_check(
    p_name text,
    p_description text,
    p_purchase_date timestamptz,
    p_total_items integer,
    p_total_cost numeric,
    p_user_id uuid
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$ DECLARE v_batch jsonb;

v_budget_transaction jsonb;

BEGIN -- Start transaction
BEGIN -- Check budget via the transaction function (it will raise an exception if insufficient)
SELECT
    create_budget_transaction(
        p_user_id,
        - p_total_cost,
        -- negative amount for deduction
        'batch_purchase',
        'Batch purchase: ' || p_name,
        NULL -- Will update this after batch creation
    ) INTO v_budget_transaction;

-- Create the batch
INSERT INTO
    batches (
        name,
        description,
        purchase_date,
        total_items,
        total_cost,
        user_id
    )
VALUES
    (
        p_name,
        p_description,
        p_purchase_date,
        p_total_items,
        p_total_cost,
        p_user_id
    ) RETURNING to_jsonb(batches.*) INTO v_batch;

-- Update the budget transaction with the batch reference
UPDATE
    budget_transactions
SET
    reference_id = (v_batch ->> 'id') :: uuid
WHERE
    id = ((v_budget_transaction -> 'transaction') ->> 'id') :: uuid;

RETURN jsonb_build_object(
    'batch',
    v_batch,
    'budget_transaction',
    v_budget_transaction
);

EXCEPTION
WHEN OTHERS THEN RAISE EXCEPTION 'Batch creation failed: %',
SQLERRM;

END;

END;

$$;

-- Function to add operational cost with budget check
CREATE
OR REPLACE FUNCTION add_operational_cost_with_budget_check(
    p_name text,
    p_amount numeric,
    p_date timestamptz,
    p_user_id uuid,
    p_batch_id uuid DEFAULT NULL,
    p_category text DEFAULT 'general'
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$ DECLARE v_cost jsonb;

v_budget_transaction jsonb;

BEGIN -- Start transaction
BEGIN -- Check budget via the transaction function (it will raise an exception if insufficient)
SELECT
    create_budget_transaction(
        p_user_id,
        - p_amount,
        -- negative amount for deduction
        'operational_cost',
        'Operational cost: ' || p_name || ' (' || p_category || ')',
        NULL -- Will update this after cost creation
    ) INTO v_budget_transaction;

-- Create the operational cost
INSERT INTO
    operational_costs (
        batch_id,
        name,
        amount,
        date,
        category,
        user_id
    )
VALUES
    (
        p_batch_id,
        p_name,
        p_amount,
        p_date,
        p_category,
        p_user_id
    ) RETURNING to_jsonb(operational_costs.*) INTO v_cost;

-- Update the budget transaction with the operational cost reference
UPDATE
    budget_transactions
SET
    reference_id = (v_cost ->> 'id') :: uuid
WHERE
    id = ((v_budget_transaction -> 'transaction') ->> 'id') :: uuid;

RETURN jsonb_build_object(
    'operational_cost',
    v_cost,
    'budget_transaction',
    v_budget_transaction
);

EXCEPTION
WHEN OTHERS THEN RAISE EXCEPTION 'Operational cost addition failed: %',
SQLERRM;

END;

END;

$$;

-- Function to register item sale and update budget
CREATE
OR REPLACE FUNCTION register_item_sale(p_item_id uuid, p_user_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$ DECLARE v_item record;

v_batch record;

v_budget_transaction jsonb;

v_updated_item jsonb;

BEGIN -- Start transaction
BEGIN -- Get item and batch details
SELECT
    i.*,
    b.name as batch_name INTO v_item
FROM
    items i
    JOIN batches b ON i.batch_id = b.id
WHERE
    i.id = p_item_id
    AND i.user_id = p_user_id;

IF v_item.sold_status = 'sold' THEN RAISE EXCEPTION 'Item is already marked as sold';

END IF;

-- Update item status to sold
UPDATE
    items
SET
    sold_status = 'sold',
    updated_at = now()
WHERE
    id = p_item_id RETURNING to_jsonb(items.*) INTO v_updated_item;

-- Update batch statistics
UPDATE
    batches
SET
    total_sold = total_sold + 1,
    total_revenue = total_revenue + v_item.selling_price,
    updated_at = now()
WHERE
    id = v_item.batch_id;

-- Create budget transaction for the sale (positive amount)
SELECT
    create_budget_transaction(
        p_user_id,
        v_item.selling_price,
        -- positive amount for sale
        'item_sale',
        'Item sale: ' || v_item.name || ' from batch: ' || v_item.batch_name,
        p_item_id
    ) INTO v_budget_transaction;

RETURN jsonb_build_object(
    'item',
    v_updated_item,
    'budget_transaction',
    v_budget_transaction
);

EXCEPTION
WHEN OTHERS THEN RAISE EXCEPTION 'Item sale registration failed: %',
SQLERRM;

END;

END;

$$;

-- Function to register item sale reversal and update budget
CREATE
OR REPLACE FUNCTION register_item_sale_reversal(p_item_id uuid, p_user_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$ DECLARE v_item record;

v_batch record;

v_budget_transaction jsonb;

v_updated_item jsonb;

v_current_budget numeric;

BEGIN -- Start transaction
BEGIN -- Get item and batch details
SELECT
    i.*,
    b.name as batch_name INTO v_item
FROM
    items i
    JOIN batches b ON i.batch_id = b.id
WHERE
    i.id = p_item_id
    AND i.user_id = p_user_id;

IF v_item.sold_status = 'unsold' THEN RAISE EXCEPTION 'Item is already marked as unsold';

END IF;

-- Check current budget
SELECT
    COALESCE(SUM(amount), 0) INTO v_current_budget
FROM
    budget_transactions
WHERE
    user_id = p_user_id;

-- Check if we have enough budget to cover the reversal
IF v_current_budget < v_item.selling_price THEN RAISE EXCEPTION 'Insufficient budget to reverse sale. Current budget: %, Required: %',
v_current_budget,
v_item.selling_price;

END IF;

-- Update item status to unsold
UPDATE
    items
SET
    sold_status = 'unsold',
    updated_at = now()
WHERE
    id = p_item_id RETURNING to_jsonb(items.*) INTO v_updated_item;

-- Update batch statistics
UPDATE
    batches
SET
    total_sold = total_sold - 1,
    total_revenue = total_revenue - v_item.selling_price,
    updated_at = now()
WHERE
    id = v_item.batch_id;

-- Create budget transaction for the sale reversal (negative amount)
SELECT
    create_budget_transaction(
        p_user_id,
        - v_item.selling_price,
        -- negative amount for reversal
        'item_sale_reversal',
        'Item sale reversal: ' || v_item.name || ' from batch: ' || v_item.batch_name,
        p_item_id
    ) INTO v_budget_transaction;

RETURN jsonb_build_object(
    'item',
    v_updated_item,
    'budget_transaction',
    v_budget_transaction
);

EXCEPTION
WHEN OTHERS THEN RAISE EXCEPTION 'Item sale reversal failed: %',
SQLERRM;

END;

END;

$$;

-- Function to soft delete batch with related data
CREATE
OR REPLACE FUNCTION soft_delete_batch_with_related_data(p_batch_id UUID, p_user_id UUID) RETURNS SETOF batches LANGUAGE plpgsql SECURITY DEFINER AS $$ DECLARE v_batch batches;

BEGIN -- Start a transaction
BEGIN -- Soft delete the batch
UPDATE
    batches
SET
    deleted_at = NOW()
WHERE
    id = p_batch_id
    AND user_id = p_user_id RETURNING * INTO v_batch;

IF NOT FOUND THEN RAISE EXCEPTION 'Batch not found or unauthorized';

END IF;

-- Soft delete all related items
UPDATE
    items
SET
    deleted_at = NOW()
WHERE
    batch_id = p_batch_id;

-- Soft delete all related operational costs
UPDATE
    operational_costs
SET
    deleted_at = NOW()
WHERE
    batch_id = p_batch_id;

-- Return the deleted batch
RETURN NEXT v_batch;

EXCEPTION
WHEN OTHERS THEN RAISE EXCEPTION 'Error deleting batch: %',
SQLERRM;

END;

END;

$$;

-- Function to get budget summary for a user
CREATE
OR REPLACE FUNCTION get_budget_summary(p_user_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$ DECLARE v_budget record;

v_stats jsonb;

BEGIN -- Get current budget
SELECT
    * INTO v_budget
FROM
    budgets
WHERE
    user_id = p_user_id;

-- Get summary statistics
WITH stats AS (
    SELECT
        SUM(
            CASE
                WHEN transaction_type = 'top_up' THEN amount
                ELSE 0
            END
        ) as total_top_ups,
        SUM(
            CASE
                WHEN transaction_type = 'batch_purchase' THEN amount
                ELSE 0
            END
        ) as total_batch_purchases,
        SUM(
            CASE
                WHEN transaction_type = 'operational_cost' THEN amount
                ELSE 0
            END
        ) as total_operational_costs,
        SUM(
            CASE
                WHEN transaction_type = 'item_sale' THEN amount
                ELSE 0
            END
        ) as total_sales,
        COUNT(
            CASE
                WHEN transaction_type = 'top_up' THEN 1
            END
        ) as top_up_count,
        COUNT(
            CASE
                WHEN transaction_type = 'batch_purchase' THEN 1
            END
        ) as batch_purchase_count,
        COUNT(
            CASE
                WHEN transaction_type = 'operational_cost' THEN 1
            END
        ) as operational_cost_count,
        COUNT(
            CASE
                WHEN transaction_type = 'item_sale' THEN 1
            END
        ) as item_sale_count
    FROM
        budget_transactions
    WHERE
        user_id = p_user_id
        AND deleted_at IS NULL
)
SELECT
    to_jsonb(stats.*) INTO v_stats
FROM
    stats;

RETURN jsonb_build_object(
    'current_budget',
    COALESCE(v_budget.current_amount, 0),
    'budget_created_at',
    v_budget.created_at,
    'budget_updated_at',
    v_budget.updated_at,
    'statistics',
    v_stats
);

END;

$$;