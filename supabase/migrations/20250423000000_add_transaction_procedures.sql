-- Create function for creating items with transaction
CREATE
OR REPLACE FUNCTION create_item_with_transaction(
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
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$ DECLARE v_image_url text;

v_item jsonb;

BEGIN -- Start transaction
BEGIN -- Upload image if provided
IF p_image IS NOT NULL
AND p_image_name IS NOT NULL THEN
INSERT INTO
    storage.objects (bucket_id, name, owner, metadata)
VALUES
    (
        'item-images',
        p_image_name,
        p_user_id,
        jsonb_build_object('mimetype', 'image/jpeg')
    ) RETURNING name INTO v_image_url;

END IF;

-- Create item
INSERT INTO
    items (
        batch_id,
        name,
        category,
        purchase_price,
        selling_price,
        margin_percentage,
        margin_value,
        sold_status,
        total_cost,
        user_id,
        image_url
    )
VALUES
    (
        p_batch_id,
        p_name,
        p_category,
        p_purchase_price,
        p_selling_price,
        p_margin_percentage,
        p_margin_value,
        p_sold_status,
        p_total_cost,
        p_user_id,
        v_image_url
    ) RETURNING to_jsonb(items.*) INTO v_item;

RETURN v_item;

EXCEPTION
WHEN OTHERS THEN -- Rollback transaction
RAISE EXCEPTION 'Transaction failed: %',
SQLERRM;

END;

END;

$$;

-- Create function for updating items with transaction
CREATE
OR REPLACE FUNCTION update_item_with_transaction(
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
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$ DECLARE v_image_url text;

v_item jsonb;

BEGIN -- Start transaction
BEGIN -- Upload new image if provided
IF p_image IS NOT NULL
AND p_image_name IS NOT NULL THEN
INSERT INTO
    storage.objects (bucket_id, name, owner, metadata)
VALUES
    (
        'item-images',
        p_image_name,
        p_user_id,
        jsonb_build_object('mimetype', 'image/jpeg')
    ) RETURNING name INTO v_image_url;

END IF;

-- Update item
UPDATE
    items
SET
    batch_id = p_batch_id,
    name = p_name,
    category = p_category,
    purchase_price = p_purchase_price,
    selling_price = p_selling_price,
    margin_percentage = p_margin_percentage,
    margin_value = p_margin_value,
    sold_status = p_sold_status,
    total_cost = p_total_cost,
    user_id = p_user_id,
    image_url = COALESCE(v_image_url, image_url)
WHERE
    id = p_id RETURNING to_jsonb(items.*) INTO v_item;

RETURN v_item;

EXCEPTION
WHEN OTHERS THEN -- Rollback transaction
RAISE EXCEPTION 'Transaction failed: %',
SQLERRM;

END;

END;

$$;