UPDATE tasks
SET assigned_to_ids = JSON_ARRAY(assigned_to_id)
WHERE assigned_to_id IS NOT NULL
  AND (assigned_to_ids IS NULL OR JSON_LENGTH(assigned_to_ids) = 0);