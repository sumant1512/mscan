#!/bin/bash

# MScan Documentation Cleanup Script
# Moves old implementation summaries to archive folder

set -e

ARCHIVE_DIR="docs-archive"
mkdir -p "$ARCHIVE_DIR"

echo "📦 Archiving old documentation files..."

# List of outdated implementation summary files to archive
OLD_DOCS=(
    "ADDITIONAL_COMPILATION_FIXES.md"
    "AGENTS.md"
    "ARCHITECTURE.md"
    "AUTO_COUPON_REFERENCES_IMPLEMENTATION.md"
    "BACKEND_API_TESTING_GUIDE.md"
    "CATALOGUE_MANAGEMENT_GUIDE.md"
    "CHANGES_VERIFICATION.md"
    "COMPILATION_ERRORS_FIXED.md"
    "COMPLETE_FIXES_SUMMARY.md"
    "COUPON_WORKFLOW_IMPLEMENTATION.md"
    "DATABASE_MIGRATION_FIXED.md"
    "DATABASE_MIGRATION_GUIDE.md"
    "DATABASE_RESET_COMPLETE.md"
    "DATABASE_SCHEMA.md"
    "DATABASE_UTILITIES_UPDATE.md"
    "DEPLOYMENT.md"
    "DYNAMIC_ATTRIBUTES_IMPLEMENTATION.md"
    "DYNAMIC_PRODUCT_FORM_IMPLEMENTATION_COMPLETE.md"
    "E2E_SUPER_ADMIN_TEST_STATUS.md"
    "E2E_TEST_FIX.md"
    "E2E_TESTING.md"
    "FRONTEND_IMPLEMENTATION_COMPLETE.md"
    "IMPLEMENTATION_PROGRESS.md"
    "IMPLEMENTATION_SUMMARY.md"
    "MOBILE_API_AVAILABLE.md"
    "MOBILE_SCAN_API_IMPLEMENTATION_COMPLETE.md"
    "MULTI_APP_IMPLEMENTATION_COMPLETE.md"
    "MULTI_APP_USER_GUIDE.md"
    "NGRX_TENANTS_IMPLEMENTATION_COMPLETE.md"
    "OPENSPEC_AUDIT_REPORT.md"
    "OPENSPEC_IMPLEMENTATION_STATUS.md"
    "PERMISSION_BASED_AUTH_IMPLEMENTATION.md"
    "PHASE11_TESTING_COMPLETE.md"
    "QUICK_START.md"
    "RECENT_IMPLEMENTATIONS.md"
    "SUBDOMAIN_IMPLEMENTATION_COMPLETE.md"
    "SUBDOMAIN_MIGRATION_GUIDE.md"
    "SUBDOMAIN_TROUBLESHOOTING.md"
    "SUPER_ADMIN_TENANT_ADMIN_IMPLEMENTATION.md"
    "TESTING.md"
    "TESTING_GUIDE.md"
    "TEST_COMPLETION_REPORT.md"
    "TEST_COVERAGE_COMPLETION_REPORT.md"
    "TEST_GUIDE.md"
    "VERIFICATION_APP_ID_STANDARDIZATION.md"
)

# Move files to archive
count=0
for file in "${OLD_DOCS[@]}"; do
    if [ -f "$file" ]; then
        mv "$file" "$ARCHIVE_DIR/"
        echo "  ✓ Archived: $file"
        ((count++))
    fi
done

echo ""
echo "✅ Cleanup complete!"
echo "  - Archived $count old documentation files"
echo "  - Archive location: $ARCHIVE_DIR/"
echo ""
echo "📚 Current documentation structure:"
echo "  - README.md (Main project readme)"
echo "  - CLAUDE.md (AI assistant instructions)"
echo "  - docs/ (Comprehensive documentation)"
echo "    ├── SETUP.md"
echo "    ├── SUPER_ADMIN_FEATURES.md"
echo "    ├── TENANT_ADMIN_FEATURES.md"
echo "    ├── DATABASE_DESIGN.md"
echo "    ├── API_REFERENCE.md"
echo "    ├── COMPONENTS_GUIDE.md"
echo "    └── ARCHITECTURE.md"
echo ""
echo "  - docs-archive/ (Archived implementation summaries)"
