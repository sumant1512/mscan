#!/bin/bash

# Quick Test Fix Script
# This script applies the necessary fixes to make tests pass

echo "🔧 MSCAN Test Fix Script"
echo "========================"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Must be run from mscan-server directory"
    exit 1
fi

echo "📋 Fixes to apply:"
echo "  1. ✅ .env.test file (already created)"
echo "  2. ⚠️  OTP test assertions (manual fix required)"
echo "  3. ⚠️  E2E database schema (manual fix required)"
echo ""

# Create backup
echo "📦 Creating backup of test files..."
mkdir -p .test-backups
cp src/__tests__/otp.service.test.js .test-backups/ 2>/dev/null || true
cp src/__tests__/e2e.test.js .test-backups/ 2>/dev/null || true
echo "✅ Backup created in .test-backups/"
echo ""

# Check environment
echo "🔍 Checking test environment..."
if [ -f ".env.test" ]; then
    echo "✅ .env.test file exists"
else
    echo "❌ .env.test file missing!"
    echo "   Run: cp .env.example .env.test"
    echo "   Then edit with test values"
fi
echo ""

# Check database
echo "🗄️  Checking database..."
echo "⚠️  Manual check required:"
echo "   - Ensure test database 'mscan_test_db' exists"
echo "   - Verify users table schema (no 'status' column)"
echo "   - Run migrations if needed"
echo ""

# Display manual fixes needed
echo "🛠️  Manual Fixes Required:"
echo ""
echo "Fix 1: Update OTP Test Assertions"
echo "--------------------------------"
echo "File: src/__tests__/otp.service.test.js"
echo "Lines: ~48, 100, 124, 144, 158, 214, 241, 294, 312"
echo ""
echo "Find:"
echo "  expect(result).toBe(true);"
echo "  expect(result).toBe(false);"
echo ""
echo "Replace with:"
echo "  expect(result.valid).toBe(true);"
echo "  expect(result.valid).toBe(false);"
echo ""
echo "Also update:"
echo "  expect(result).toBe('712268');  →  const otp = await createOTP(...); expect(otp).toBe('712268');"
echo ""

echo "Fix 2: Update E2E Database Schema"
echo "----------------------------------"
echo "File: src/__tests__/e2e.test.js"
echo "Line: ~37-40"
echo ""
echo "Find:"
echo "  INSERT INTO users (email, full_name, role, status, created_by)"
echo "  VALUES (\$1, \$2, \$3, \$4, \$5)"
echo ""
echo "Replace with:"
echo "  INSERT INTO users (email, full_name, role, created_by)"
echo "  VALUES (\$1, \$2, \$3, \$4)"
echo ""
echo "And remove 'ACTIVE' from the values array"
echo ""

# Test runner helper
echo "🧪 Test Commands:"
echo ""
echo "  Run all tests:          npm test"
echo "  With coverage:          npm test -- --coverage"
echo "  Watch mode:             npm test -- --watch"
echo "  Single file:            npm test otp.service.test.js"
echo "  Verbose output:         npm test -- --verbose"
echo ""

# Check if user wants to run tests
read -p "Would you like to run tests now? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "🧪 Running tests..."
    npm test
else
    echo ""
    echo "✅ Setup complete!"
    echo "   Apply manual fixes above, then run: npm test"
fi

echo ""
echo "📚 Documentation:"
echo "  - Full report: ../TEST_COMPLETION_REPORT.md"
echo "  - Test details: src/__tests__/README.md (if exists)"
echo ""
echo "💡 Tip: Fix one test file at a time and verify with:"
echo "   npm test <filename>"
echo ""
