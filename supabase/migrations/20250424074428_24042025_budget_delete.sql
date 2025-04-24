-- Create the soft_delete_batch_with_related_data function
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