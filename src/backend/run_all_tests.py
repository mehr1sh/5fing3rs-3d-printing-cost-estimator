#!/usr/bin/env python3
"""
Test Runner Script for 3D Printing Service
Runs all test scripts and shows a summary of results
"""

import subprocess
import sys
import os

def main():
    print("=" * 50)
    print("Running All Tests for 3D Printing Service")
    print("=" * 50)
    print()
    
    # Set environment variables for testing
    os.environ["LOG_DIR"] = "./logs"
    os.environ["TESTING"] = "true"
    
    # Run pytest with verbose output and summary
    print("Running pytest...")
    print()
    
    result = subprocess.run(
        [sys.executable, "-m", "pytest", "tests/", "-v", "--tb=short", "--maxfail=5"],
        cwd="/home/mehi-rizz/IIITH/2-2/DASS/final_c/src/backend",
        env=os.environ
    )
    
    print()
    print("=" * 50)
    print("Test Run Complete")
    print("=" * 50)
    
    if result.returncode == 0:
        print("✓ All tests passed!")
    else:
        print(f"✗ Some tests failed. Exit code: {result.returncode}")
    
    print()
    print("To run individual test files:")
    print("  python -m pytest tests/test_uc01_authentication.py -v")
    print("  python -m pytest tests/test_uc02_upload.py -v")
    print("  python -m pytest tests/test_uc03_04_05_slicing.py -v")
    print("  ... etc")
    print()
    print("To run specific tests:")
    print("  python -m pytest tests/test_uc01_authentication.py::test_uc01_tc01_login_valid_credentials -v")
    print()
    print("To see detailed output for failed tests:")
    print("  python -m pytest tests/ -v --tb=long")
    print()
    
    sys.exit(result.returncode)

if __name__ == "__main__":
    main()
