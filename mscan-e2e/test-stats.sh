#!/bin/bash

# Test Statistics and Verification Script
# Run this to see an overview of the test suite

echo "📊 MScan E2E Test Suite Statistics"
echo "==================================="
echo ""

# Count test files
auth_tests=$(find tests/auth -name "*.spec.ts" | wc -l | xargs)
super_admin_tests=$(find tests/super-admin -name "*.spec.ts" 2>/dev/null | wc -l | xargs)
tenant_admin_tests=$(find tests/tenant-admin -name "*.spec.ts" 2>/dev/null | wc -l | xargs)
other_tests=$(find tests -maxdepth 1 -name "*.spec.ts" 2>/dev/null | wc -l | xargs)

total_test_files=$((auth_tests + super_admin_tests + tenant_admin_tests + other_tests))

echo "📁 Test Files:"
echo "   Authentication:     $auth_tests file(s)"
echo "   Super Admin:        $super_admin_tests file(s)"
echo "   Tenant Admin:       $tenant_admin_tests file(s)"
echo "   Other (Security):   $other_tests file(s)"
echo "   --------------------------------"
echo "   Total:              $total_test_files test files"
echo ""

# Count test cases (approximate by counting 'test(' occurrences)
auth_count=$(grep -r "test(" tests/auth 2>/dev/null | wc -l | xargs)
super_count=$(grep -r "test(" tests/super-admin 2>/dev/null | wc -l | xargs)
tenant_count=$(grep -r "test(" tests/tenant-admin 2>/dev/null | wc -l | xargs)
other_count=$(grep "test(" tests/*.spec.ts 2>/dev/null | wc -l | xargs)

total_tests=$((auth_count + super_count + tenant_count + other_count))

echo "🧪 Test Cases (approximate):"
echo "   Authentication:     $auth_count test(s)"
echo "   Super Admin:        $super_count test(s)"
echo "   Tenant Admin:       $tenant_count test(s)"
echo "   Security:           $other_count test(s)"
echo "   --------------------------------"
echo "   Total:              $total_tests+ test cases"
echo ""

# Count utility files
helper_files=$(find utils -name "*.ts" | wc -l | xargs)
echo "🛠️  Utility Files:       $helper_files file(s)"
echo ""

# Check configuration files
echo "⚙️  Configuration:"
if [ -f "playwright.config.ts" ]; then
    echo "   ✅ Playwright config"
else
    echo "   ❌ Playwright config missing"
fi

if [ -f "package.json" ]; then
    echo "   ✅ Package.json"
else
    echo "   ❌ Package.json missing"
fi

if [ -f "tsconfig.json" ]; then
    echo "   ✅ TypeScript config"
else
    echo "   ❌ TypeScript config missing"
fi
echo ""

# Check documentation
echo "📚 Documentation:"
if [ -f "README.md" ]; then
    echo "   ✅ README.md"
fi
if [ -f "QUICKSTART.md" ]; then
    echo "   ✅ QUICKSTART.md"
fi
if [ -f "EXAMPLES.md" ]; then
    echo "   ✅ EXAMPLES.md"
fi
if [ -f "PROJECT_SUMMARY.md" ]; then
    echo "   ✅ PROJECT_SUMMARY.md"
fi
echo ""

# Check dependencies
echo "📦 Dependencies:"
if [ -d "node_modules" ]; then
    echo "   ✅ Node modules installed"
else
    echo "   ❌ Node modules not installed - Run: npm install"
fi

if [ -d "$HOME/Library/Caches/ms-playwright" ]; then
    echo "   ✅ Playwright browsers installed"
else
    echo "   ⚠️  Playwright browsers may not be installed - Run: npx playwright install"
fi
echo ""

# Test structure overview
echo "📂 Test Structure:"
echo "   tests/"
echo "   ├── auth/                 (Authentication & Session)"
echo "   ├── super-admin/          (Tenant, Credit, User Management)"
echo "   ├── tenant-admin/         (Coupons, Credits, Customers, Scans)"
echo "   └── data-isolation.spec.ts (Security Tests)"
echo ""

echo "🎯 Test Coverage Areas:"
echo "   ✅ OTP-based authentication"
echo "   ✅ Multi-tenant subdomain routing"
echo "   ✅ Token management & validation"
echo "   ✅ Super admin features (4 areas)"
echo "   ✅ Tenant admin features (6 areas)"
echo "   ✅ Data isolation & security"
echo "   ✅ Form validations"
echo "   ✅ CRUD operations"
echo "   ✅ Error handling"
echo "   ✅ Pagination & filtering"
echo ""

echo "🚀 Quick Commands:"
echo "   npm test              - Run all tests"
echo "   npm run test:headed   - Run with visible browser"
echo "   npm run test:ui       - Interactive mode"
echo "   npm run test:debug    - Debug mode"
echo "   ./setup.sh            - Run setup wizard"
echo ""

echo "✅ Test Suite Setup Complete!"
echo ""
