#!/bin/bash

echo ""
echo "=========================================="
echo "SERENITY TEST SUITE"
echo "=========================================="
echo ""

cd "$(dirname "$0")" || exit 1

echo "Step 1: Cleaning up old test data..."
echo "======================================"
python3 scripts/cleanup_user.py
echo ""

echo "Step 2: Running fullproof test..."
echo "===================================="
python3 test_fullproof.py
TEST_RESULT=$?
echo ""

if [ $TEST_RESULT -eq 0 ]; then
    echo "✅ All tests passed!"
    echo ""
    echo "Next steps:"
    echo "1. Frontend should be running on http://localhost:5173"
    echo "2. Navigate to login page"
    echo "3. Use credentials from test output above"
    echo "4. Verify journal entries, emotion tracking, and AI summaries"
else
    echo "❌ Tests failed!"
    exit 1
fi
