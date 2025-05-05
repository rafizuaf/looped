-- Add item update transaction functionality
-- This migration adds a function to handle item updates with transaction support

CREATE OR REPLACE FUNCTION update_item_with_transaction(
    p_id uuid,
    p_batch_id uuid,
    p_name text,
    p_category text,
    p_purchase_price numeric,
    p_selling_price numeric,
    p_margin_percentage numeric,
    p_margin_value numeric,
    p_sold_status text,
    p_total_cost numeric,
    p_user_id uuid,
    p_image bytea DEFAULT NULL,
    p_image_name text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER AS $$
DECLARE
    v_item jsonb;
    v_old_item record;
    v_budget_transaction jsonb;
    v_cost_difference numeric;
    v_sale_difference numeric;
    v_image_url text;
BEGIN
    -- Start transaction
    BEGIN
        -- Get old item data
        SELECT * INTO v_old_item
        FROM items
        WHERE id = p_id AND user_id = p_user_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Item not found or unauthorized';
        END IF;

        -- Calculate cost difference
        v_cost_difference := p_purchase_price - v_old_item.purchase_price;

        -- If cost increased, check budget
        IF v_cost_difference > 0 THEN
            -- Check budget via the transaction function
            SELECT create_budget_transaction(
                p_user_id,
                -v_cost_difference,
                'batch_purchase',
                'Item update: ' || p_name,
                p_id
            ) INTO v_budget_transaction;
        END IF;

        -- Handle image upload if provided
        IF p_image IS NOT NULL AND p_image_name IS NOT NULL THEN
            -- Delete old image if exists
            IF v_old_item.image_url IS NOT NULL THEN
                DELETE FROM storage.objects
                WHERE bucket_id = 'item-images'
                AND name = v_old_item.image_url;
            END IF;

            -- Upload new image
            INSERT INTO storage.objects (bucket_id, name, owner, metadata)
            VALUES (
                'item-images',
                p_image_name,
                p_user_id,
                jsonb_build_object('mimetype', 'image/jpeg')
            );

            v_image_url := p_image_name;
        END IF;

        -- Handle sale status changes and selling price updates
        IF v_old_item.sold_status = 'sold' THEN
            -- If item is sold and selling price changed, adjust the budget
            IF p_selling_price != v_old_item.selling_price THEN
                v_sale_difference := p_selling_price - v_old_item.selling_price;
                -- Create a transaction to adjust the budget
                SELECT create_budget_transaction(
                    p_user_id,
                    v_sale_difference,
                    'item_sale',
                    'Sale price adjustment for: ' || p_name,
                    p_id
                ) INTO v_budget_transaction;
            END IF;
        ELSIF v_old_item.sold_status != p_sold_status THEN
            -- If changing from unsold to sold, register the sale first
            IF v_old_item.sold_status = 'unsold' AND p_sold_status = 'sold' THEN
                SELECT register_item_sale(p_id, p_user_id) INTO v_budget_transaction;
            -- If changing from sold to unsold, register the reversal first
            ELSIF v_old_item.sold_status = 'sold' AND p_sold_status = 'unsold' THEN
                SELECT register_item_sale_reversal(p_id, p_user_id) INTO v_budget_transaction;
            END IF;
        END IF;

        -- Update the item after handling sale status
        UPDATE items
        SET 
            name = p_name,
            category = p_category,
            purchase_price = p_purchase_price,
            selling_price = p_selling_price,
            margin_percentage = p_margin_percentage,
            margin_value = p_margin_value,
            sold_status = p_sold_status,
            total_cost = p_total_cost,
            image_url = COALESCE(v_image_url, image_url),
            updated_at = now()
        WHERE id = p_id
        RETURNING to_jsonb(items.*) INTO v_item;

        RETURN jsonb_build_object(
            'item', v_item,
            'budget_transaction', v_budget_transaction
        );

    EXCEPTION
        WHEN OTHERS THEN
            RAISE EXCEPTION 'Item update failed: %', SQLERRM;
    END;
END;
$$; 