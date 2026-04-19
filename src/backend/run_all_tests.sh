#!/bin/bash

# Test Runner Script for 3D Printing Service
# Runs all test scripts and shows a summary of results

echo "=========================================="
echo "Running All Tests for 3D Printing Service"
echo "=========================================="
echo ""

# Change to the backend directory
cd "$(dirname "$0")"

# Set environment variables for testing
export LOG_DIR="./logs"
export TESTING="true"

# Run pytest with verbose output and summary
echo "Running pytest..."
echo ""

python -m pytest tests/ -v --tb=short --maxfail=5

# Capture exit code
EXIT_CODE=$?

echo ""
echo "=========================================="
echo "Test Run Complete"
echo "=========================================="

if [ $EXIT_CODE -eq 0 ]; then
    echo "✓ All tests passed!"
else
    echo "✗ Some tests failed. Exit code: $EXIT_CODE"
fi

echo ""
echo "To run individual test files:"
echo "  python -m pytest tests/test_uc01_authentication.py -v"
echo "  python -m pytest tests/test_uc02_upload.py -v"
echo "  python -m pytest tests/test_uc03_04_05_slicing.py -v"
echo "  ... etc"
echo ""
echo "To run specific tests:"
echo "  python -m pytest tests/test_uc01_authentication.py::test_uc01_tc01_login_valid_credentials -v"
echo ""
echo "To see detailed output for failed tests:"
echo "  python -m pytest tests/ -v --tb=long"
echo ""

exit $EXIT_CODE
