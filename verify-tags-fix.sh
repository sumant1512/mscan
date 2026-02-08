#!/bin/bash

# Quick verification script for tags API fix
# This tests that app_id filtering works correctly

echo "Tags API Fix Verification"
echo "=========================="
echo ""

# You need to set these values
TOKEN="${TOKEN:-your-token-here}"
APP_ID="${APP_ID:-your-app-id-here}"
BASE_URL="http://sumant.localhost:3000/api"

if [ "$TOKEN" = "your-token-here" ]; then
  echo "⚠️  Set TOKEN and APP_ID environment variables first"
  echo ""
  echo "Example:"
  echo "  export TOKEN='your-jwt-token'"
  echo "  export APP_ID='7a0ff5a2-5f1e-48ae-acca-05f68aa71bbb'"
  echo "  ./verify-tags-fix.sh"
  exit 1
fi

echo "Testing with:"
echo "  Token: ${TOKEN:0:20}..."
echo "  App ID: $APP_ID"
echo ""

echo "Test 1: Get ALL tags (no app_id parameter)"
echo "-------------------------------------------"
echo "Request: GET $BASE_URL/tags"
echo ""
RESPONSE_ALL=$(curl -s -H "Authorization: Bearer $TOKEN" "$BASE_URL/tags")
COUNT_ALL=$(echo "$RESPONSE_ALL" | jq -r '.count')
echo "Result: Found $COUNT_ALL total tags"
echo ""

echo "Test 2: Get tags for SPECIFIC app (with app_id)"
echo "------------------------------------------------"
echo "Request: GET $BASE_URL/tags?app_id=$APP_ID"
echo ""
RESPONSE_APP=$(curl -s -H "Authorization: Bearer $TOKEN" "$BASE_URL/tags?app_id=$APP_ID")
COUNT_APP=$(echo "$RESPONSE_APP" | jq -r '.count')
echo "Result: Found $COUNT_APP tags for app $APP_ID"
echo ""

echo "Test 3: Get tags with empty app_id (should return all)"
echo "-------------------------------------------------------"
echo "Request: GET $BASE_URL/tags?app_id="
echo ""
RESPONSE_EMPTY=$(curl -s -H "Authorization: Bearer $TOKEN" "$BASE_URL/tags?app_id=")
COUNT_EMPTY=$(echo "$RESPONSE_EMPTY" | jq -r '.count')
echo "Result: Found $COUNT_EMPTY tags (should match Test 1)"
echo ""

echo "=========================="
echo "Verification Results:"
echo "=========================="
echo ""

if [ "$COUNT_ALL" -eq "$COUNT_EMPTY" ]; then
  echo "✅ PASS: Empty app_id returns all tags (like no filter)"
else
  echo "❌ FAIL: Empty app_id doesn't match all tags"
  echo "   All: $COUNT_ALL, Empty: $COUNT_EMPTY"
fi

if [ "$COUNT_APP" -le "$COUNT_ALL" ]; then
  echo "✅ PASS: Filtered tags <= total tags"
else
  echo "❌ FAIL: Filtered count greater than total"
  echo "   App: $COUNT_APP, All: $COUNT_ALL"
fi

if [ "$COUNT_APP" -lt "$COUNT_ALL" ] || [ "$COUNT_ALL" -eq 0 ]; then
  echo "✅ PASS: App-specific filtering working (fewer or zero tags)"
else
  echo "⚠️  WARNING: App filter returned same count as all tags"
  echo "   This might be OK if you only have tags for one app"
fi

echo ""
echo "Sample tag from filtered results:"
echo "$RESPONSE_APP" | jq '.data[0] | {name, verification_app_id}' 2>/dev/null || echo "No tags found"
