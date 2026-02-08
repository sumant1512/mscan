#!/bin/bash

# Run migration 013 - Standardize template_name column

echo "Running migration 013: Standardize template_name column..."

psql -h ${DB_HOST:-localhost} \
     -p ${DB_PORT:-5432} \
     -U ${DB_USER:-postgres} \
     -d ${DB_NAME:-mscan_db} \
     -f database/migrations/013_standardize_template_name_column.sql

if [ $? -eq 0 ]; then
    echo "✅ Migration 013 completed successfully!"
else
    echo "❌ Migration 013 failed!"
    exit 1
fi
