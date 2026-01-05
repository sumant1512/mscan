#!/bin/bash

# MScan E2E Test Setup Script
# This script helps set up the E2E testing environment

echo "🚀 MScan E2E Test Setup"
echo "======================="
echo ""

# Check Node.js version
echo "📦 Checking Node.js version..."
node_version=$(node -v)
echo "✅ Node.js version: $node_version"
echo ""

# Install dependencies
echo "📥 Installing npm dependencies..."
npm install
echo ""

# Install Playwright browsers
echo "🌐 Installing Playwright browsers..."
npx playwright install chromium
echo ""

# Check if backend is running
echo "🔍 Checking if backend is running..."
if curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
    echo "✅ Backend is running"
else
    echo "⚠️  Backend is not running on http://localhost:3000"
    echo "   Please start the backend server before running tests"
fi
echo ""

# Check if frontend is running
echo "🔍 Checking if frontend is running..."
if curl -s http://localhost:4200 > /dev/null 2>&1; then
    echo "✅ Frontend is running"
else
    echo "⚠️  Frontend is not running on http://localhost:4200"
    echo "   Please start the frontend server before running tests"
fi
echo ""

# Check /etc/hosts for subdomains
echo "🔍 Checking /etc/hosts for subdomain entries..."
if grep -q "harsh.localhost" /etc/hosts && grep -q "test-tenant.localhost" /etc/hosts; then
    echo "✅ Subdomain entries found in /etc/hosts"
else
    echo "⚠️  Subdomain entries not found in /etc/hosts"
    echo "   Add these lines to /etc/hosts:"
    echo "   127.0.0.1 harsh.localhost"
    echo "   127.0.0.1 test-tenant.localhost"
    echo ""
    echo "   On macOS/Linux: sudo nano /etc/hosts"
    echo "   On Windows: notepad C:\\Windows\\System32\\drivers\\etc\\hosts (as Administrator)"
fi
echo ""

echo "✅ Setup complete!"
echo ""
echo "🧪 Run tests with:"
echo "   npm test              - Run all tests"
echo "   npm run test:headed   - Run with visible browser"
echo "   npm run test:ui       - Run in interactive mode"
echo "   npm run test:debug    - Run in debug mode"
echo ""
