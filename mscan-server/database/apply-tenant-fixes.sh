#!/bin/bash

# ============================================
# Apply Tenant Schema Fixes
# Simple wrapper script for easy execution
# ============================================

echo "╔════════════════════════════════════════════╗"
echo "║   Tenant Schema Fixes Migration Tool      ║"
echo "╚════════════════════════════════════════════╝"
echo ""

# Check if .env file exists
if [ ! -f "../.env" ]; then
    echo "❌ Error: .env file not found in mscan-server directory"
    echo "Please create .env file with database credentials first."
    exit 1
fi

# Confirm action
echo "⚠️  This will apply the following changes to your database:"
echo "   1. Remove duplicate 'contact_name' column"
echo "   2. Add foreign key constraint for 'created_by'"
echo "   3. Update existing tenants with created_by"
echo "   4. Add index for better performance"
echo ""
echo "📊 Your data will be PRESERVED."
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Migration cancelled."
    exit 0
fi

echo ""
echo "🚀 Starting migration..."
echo ""

# Run the Node.js script
node apply-tenant-fixes.js

# Check exit code
if [ $? -eq 0 ]; then
    echo ""
    echo "╔════════════════════════════════════════════╗"
    echo "║      ✅ Migration completed successfully!   ║"
    echo "╚════════════════════════════════════════════╝"
    echo ""
    echo "📝 Next steps:"
    echo "   1. Restart your server (npm start)"
    echo "   2. Test the API to verify changes"
    echo ""
else
    echo ""
    echo "❌ Migration failed. Please check the error messages above."
    exit 1
fi
