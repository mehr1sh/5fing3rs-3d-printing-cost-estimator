# Test Runner Guide

This document explains how to run all test scripts for the 3D Printing Service.

## Quick Start

### Option 1: Using the Shell Script (Linux/Mac)
```bash
cd /home/mehi-rizz/IIITH/2-2/DASS/final_c/src/backend
./run_all_tests.sh
```

### Option 2: Using the Python Script (Cross-platform)
```bash
cd /home/mehi-rizz/IIITH/2-2/DASS/final_c/src/backend
python run_all_tests.py
```

### Option 3: Using pytest directly
```bash
cd /home/mehi-rizz/IIITH/2-2/DASS/final_c/src/backend
python -m pytest tests/ -v
```

## Understanding the Output

When you run the tests, pytest will display:

1. **Test Discovery**: Shows all test files being discovered
2. **Test Execution**: Each test runs with a status indicator:
   - `.` (dot) = Test passed
   - `F` = Test failed
   - `E` = Test error
   - `s` = Test skipped
3. **Summary**: At the end, you'll see:
   - Total tests run
   - Number passed
   - Number failed
   - Number skipped
   - Time taken

Example output:
```
============================= test session starts ==============================
collected 30 items

test_uc01_authentication.py::test_uc01_tc01_login_valid_credentials PASSED
test_uc01_authentication.py::test_uc01_tc02_login_invalid_credentials PASSED
test_uc01_authentication.py::test_uc01_tc03_account_lockout_after_failed_attempts SKIPPED
...

========================= summary ==========================
30 tests collected, 25 passed, 3 skipped, 2 failed in 5.23s ==========================
```

## Running Specific Tests

### Run a specific test file
```bash
python -m pytest tests/test_uc01_authentication.py -v
```

### Run a specific test function
```bash
python -m pytest tests/test_uc01_authentication.py::test_uc01_tc01_login_valid_credentials -v
```

### Run tests for a specific use case
```bash
# All authentication tests
python -m pytest tests/test_uc01_authentication.py -v

# All upload tests
python -m pytest tests/test_uc02_upload.py -v

# All slicing tests
python -m pytest tests/test_uc03_04_05_slicing.py -v
```

### Run only high-priority tests
```bash
python -m pytest tests/test_uc*.py -v
```

### Run only integration/performance/security tests
```bash
python -m pytest tests/test_integration.py tests/test_performance.py tests/test_security.py -v
```

## Test Categories

### High Priority Tests (UC-01 through UC-15)
These test core functionality:
- **UC-01**: Authentication (3 tests)
- **UC-02**: File Upload (3 tests)
- **UC-03**: 3D Viewer (2 tests)
- **UC-04**: Slicing Parameters (2 tests)
- **UC-05**: Slicing Process (3 tests)
- **UC-06**: Cost Calculation (2 tests)
- **UC-07**: Cost Estimate Display (1 test)
- **UC-08**: Error Handling (1 test)
- **UC-09**: Admin Failure Logs (1 test)
- **UC-11**: Material Configuration (3 tests)
- **UC-12**: Machine Time Rate (1 test)
- **UC-13**: Overhead Factors (1 test)
- **UC-14**: Model Validation (1 test)
- **UC-15**: Job History (1 test)

### Medium Priority Tests
These test non-functional requirements:
- **Integration**: Full stack workflow (1 test)
- **Performance**: Upload speed, slicing speed, API response time (3 tests)
- **Security**: Unauthorized access protection (1 test)

## Skipped Tests

Some tests are marked with `pytest.skip()` because they require:
- External services (CURA Docker container)
- Specific test files (non-manifold STL, oversized STL)
- Controlled environment (performance benchmarks)

To run these tests, ensure the required services are available and remove the skip markers.

## Environment Setup

Before running tests, ensure the following:

### 1. Install Dependencies
```bash
cd /home/mehi-rizz/IIITH/2-2/DASS/final_c/src/backend
pip install -r requirements.txt
```

### 2. Create Logs Directory
The application requires a logs directory. Create it locally:
```bash
mkdir -p logs
export LOG_DIR=./logs
```

Or modify `app/main.py` to use a local directory instead of `/app/logs`.

### 3. Set Environment Variables (Optional)
If needed, set environment variables:
```bash
export SECRET_KEY="test-secret-key"
export ALGORITHM="HS256"
export DATABASE_URL="sqlite:///./test.db"
```

## Troubleshooting

### Import errors
If you get import errors, ensure you're in the correct directory:
```bash
cd /home/mehi-rizz/IIITH/2-2/DASS/final_c/src/backend
```

### Permission denied: /app/logs
The app tries to create `/app/logs` which requires root permissions. Either:
1. Run with sudo (not recommended for tests)
2. Create the directory: `sudo mkdir -p /app/logs`
3. Or modify `app/main.py` to use a local logs directory

### Database errors
The tests use an in-memory SQLite database, so no external database is needed.

### Missing dependencies
Install required packages:
```bash
pip install -r requirements.txt
```

### Permission denied (shell script)
Make the script executable:
```bash
chmod +x run_all_tests.sh
```

## Continuous Integration

To run tests in CI/CD pipelines:
```bash
cd /home/mehi-rizz/IIITH/2-2/DASS/final_c/src/backend
python -m pytest tests/ -v --tb=short --junitxml=test-results.xml
```

This generates a JUnit XML report for CI systems.
