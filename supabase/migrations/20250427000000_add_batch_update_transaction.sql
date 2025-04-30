-- Add batch update transaction functionality
-- This migration adds a function to handle batch updates with transaction support

-- Function to update batch with related data and budget check
CREATE OR REPLACE FUNCTION update_batch_with_transaction(
    p_batch_id uuid,
    p_name text,
    p_description text,
    p_purchase_date timestamptz,
    p_total_items integer,
    p_total_cost numeric,
    p_user_id uuid,
    p_items jsonb,
    p_operational_costs jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER AS $$
DECLARE
    v_batch jsonb;
    v_old_batch record;
    v_budget_transaction jsonb;
    v_cost_difference numeric;
BEGIN
    -- Start transaction
    BEGIN
        -- Get old batch data
        SELECT * INTO v_old_batch
        FROM batches
        WHERE id = p_batch_id AND user_id = p_user_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Batch not found or unauthorized';
        END IF;

        -- Calculate cost difference
        v_cost_difference := p_total_cost - v_old_batch.total_cost;

        -- If cost increased, check budget
        IF v_cost_difference > 0 THEN
            -- Check budget via the transaction function
            SELECT create_budget_transaction(
                p_user_id,
                -v_cost_difference,
                'batch_purchase',
                'Batch update: ' || p_name,
                p_batch_id
            ) INTO v_budget_transaction;
        END IF;

        -- Update the batch
        UPDATE batches
        SET 
            name = p_name,
            description = p_description,
            purchase_date = p_purchase_date,
            total_items = p_total_items,
            total_cost = p_total_cost,
            updated_at = now()
        WHERE id = p_batch_id
        RETURNING to_jsonb(batches.*) INTO v_batch;

        -- Update items
        FOR i IN 0..jsonb_array_length(p_items) - 1 LOOP
            DECLARE
                v_item jsonb := p_items->i;
                v_purchase_price numeric := (v_item->>'purchase_price')::numeric;
                v_selling_price numeric := (v_item->>'selling_price')::numeric;
                v_margin_value numeric := v_selling_price - v_purchase_price;
                v_margin_percentage numeric := (v_margin_value / v_purchase_price) * 100;
            BEGIN
                IF v_item->>'id' IS NOT NULL THEN
                    -- Update existing item
                    UPDATE items
                    SET 
                        name = v_item->>'name',
                        category = v_item->>'category',
                        purchase_price = v_purchase_price,
                        selling_price = v_selling_price,
                        margin_percentage = v_margin_percentage,
                        margin_value = v_margin_value,
                        sold_status = v_item->>'sold_status',
                        total_cost = v_purchase_price,
                        updated_at = now()
                    WHERE id = (v_item->>'id')::uuid;
                ELSE
                    -- Insert new item
                    INSERT INTO items (
                        batch_id,
                        name,
                        category,
                        purchase_price,
                        selling_price,
                        margin_percentage,
                        margin_value,
                        sold_status,
                        total_cost,
                        user_id
                    ) VALUES (
                        p_batch_id,
                        v_item->>'name',
                        v_item->>'category',
                        v_purchase_price,
                        v_selling_price,
                        v_margin_percentage,
                        v_margin_value,
                        v_item->>'sold_status',
                        v_purchase_price,
                        p_user_id
                    );
                END IF;
            END;
        END LOOP;

        -- Update operational costs
        FOR i IN 0..jsonb_array_length(p_operational_costs) - 1 LOOP
            DECLARE
                v_cost jsonb := p_operational_costs->i;
            BEGIN
                IF v_cost->>'id' IS NOT NULL THEN
                    -- Update existing cost
                    UPDATE operational_costs
                    SET 
                        name = v_cost->>'name',
                        amount = (v_cost->>'amount')::numeric,
                        date = p_purchase_date,
                        category = v_cost->>'category',
                        updated_at = now()
                    WHERE id = (v_cost->>'id')::uuid;
                ELSE
                    -- Insert new cost
                    INSERT INTO operational_costs (
                        batch_id,
                        name,
                        amount,
                        date,
                        category,
                        user_id
                    ) VALUES (
                        p_batch_id,
                        v_cost->>'name',
                        (v_cost->>'amount')::numeric,
                        p_purchase_date,
                        v_cost->>'category',
                        p_user_id
                    );
                END IF;
            END;
        END LOOP;

        RETURN jsonb_build_object(
            'batch', v_batch,
            'budget_transaction', v_budget_transaction
        );

    EXCEPTION
        WHEN OTHERS THEN
            RAISE EXCEPTION 'Batch update failed: %', SQLERRM;
    END;
END;
$$; 