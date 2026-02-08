-- Add variant-list and structured-list data types to template_attributes check constraint

-- Drop the existing check constraint
ALTER TABLE template_attributes DROP CONSTRAINT check_data_type;

-- Add the updated check constraint with new data types
ALTER TABLE template_attributes ADD CONSTRAINT check_data_type CHECK (
  data_type IN (
    'string',
    'number',
    'boolean',
    'date',
    'select',
    'multi-select',
    'url',
    'email',
    'variant-list',
    'structured-list'
  )
);

-- Verify the constraint was updated
SELECT conname, consrc
FROM pg_constraint
WHERE conname = 'check_data_type';
