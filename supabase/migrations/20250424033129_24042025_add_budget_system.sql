/*
 # Add Budget System
 
 1. New Tables
 - `budgets` - Stores current budget amounts for each user
 - `budget_transactions` - Records all budget-related activities
 
 2. New Functions
 - `create_budget_transaction` - Creates a budget transaction and updates the budget
 - `top_up_budget` - Adds funds to a user's budget
 - `create_batch_with_budget_check` - Creates a batch while checking and updating the budget
 - `add_operational_cost_with_budget_check` - Adds operational costs while checking the budget
 
 3. Security
 - Enable RLS on new tables
 - Add policies for users to manage their own budget data
 */
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
    -- positive for additions, negative for deductions
    transaction_type text NOT NULL CHECK (
        transaction_type IN (
            'top_up',
            'batch_purchase',
            'operational_cost',
            'item_sale',
            'other'
        )
    ),
    description text,
    reference_id uuid,
    -- Can reference batch_id, operational_cost_id, etc.
    created_at timestamptz NOT NULL DEFAULT now(),
    deleted_at timestamptz
);

-- Enable Row Level Security
ALTER TABLE
    budgets ENABLE ROW LEVEL SECURITY;

ALTER TABLE
    budget_transactions ENABLE ROW LEVEL SECURITY;

-- Create indexes for better query performance
CREATE INDEX idx_budgets_user_id ON budgets(user_id);

CREATE INDEX idx_budget_transactions_user_id ON budget_transactions(user_id);

CREATE INDEX idx_budget_transactions_reference_id ON budget_transactions(reference_id);

CREATE INDEX idx_budget_transactions_type ON budget_transactions(transaction_type);

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
    p_batch_id uuid,
    p_name text,
    p_amount numeric,
    p_date timestamptz,
    p_user_id uuid
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
        'Operational cost: ' || p_name,
        NULL -- Will update this after cost creation
    ) INTO v_budget_transaction;

-- Create the operational cost
INSERT INTO
    operational_costs (
        batch_id,
        name,
        amount,
        date,
        user_id
    )
VALUES
    (
        p_batch_id,
        p_name,
        p_amount,
        p_date,
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

-- Function to modify your existing create_item_with_transaction to work with batches
CREATE
OR REPLACE FUNCTION create_items_for_batch(
    p_batch_id uuid,
    p_items jsonb [],
    -- Array of item objects
    p_user_id uuid
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$ DECLARE v_item jsonb;

v_items_created jsonb [] := '{}';

v_item_data jsonb;

v_batch_update jsonb;

v_total_items integer := 0;

v_total_cost numeric := 0;

BEGIN -- Start transaction
BEGIN -- Process each item
FOREACH v_item_data IN ARRAY p_items LOOP -- Create the item using existing function
SELECT
    create_item_with_transaction(
        p_batch_id,
        v_item_data ->> 'name',
        v_item_data ->> 'category',
        (v_item_data ->> 'purchase_price') :: numeric,
        (v_item_data ->> 'selling_price') :: numeric,
        (v_item_data ->> 'margin_percentage') :: numeric,
        (v_item_data ->> 'margin_value') :: numeric,
        'unsold',
        -- Default status
        (v_item_data ->> 'total_cost') :: numeric,
        p_user_id,
        NULL,
        -- image
        NULL -- image_name
    ) INTO v_item;

v_items_created := v_items_created || v_item;

v_total_items := v_total_items + 1;

v_total_cost := v_total_cost + (v_item_data ->> 'total_cost') :: numeric;

END LOOP;

-- Update batch with item counts and costs
UPDATE
    batches
SET
    total_items = total_items + v_total_items,
    total_cost = total_cost + v_total_cost,
    updated_at = now()
WHERE
    id = p_batch_id RETURNING to_jsonb(batches.*) INTO v_batch_update;

RETURN jsonb_build_object(
    'items_created',
    v_items_created,
    'batch_update',
    v_batch_update
);

EXCEPTION
WHEN OTHERS THEN RAISE EXCEPTION 'Batch items creation failed: %',
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