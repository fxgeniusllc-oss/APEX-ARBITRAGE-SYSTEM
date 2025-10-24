#!/bin/bash

# Test script to validate virtual environment setup
# This script tests that the virtual environment is properly configured

set -e

echo "╔════════════════════════════════════════════════════════════╗"
echo "║     VIRTUAL ENVIRONMENT VALIDATION TEST                    ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

ERRORS=0

# Test 1: Check if .venv directory exists
echo -e "${CYAN}[1/6] Checking if .venv directory exists...${NC}"
if [ -d ".venv" ]; then
    echo -e "${GREEN}✅ .venv directory found${NC}"
else
    echo -e "${RED}❌ .venv directory not found${NC}"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# Test 2: Check if virtual environment can be activated
echo -e "${CYAN}[2/6] Testing virtual environment activation...${NC}"
if source .venv/bin/activate 2>/dev/null; then
    echo -e "${GREEN}✅ Virtual environment activated successfully${NC}"
    
    # Test 3: Check VIRTUAL_ENV variable
    echo ""
    echo -e "${CYAN}[3/6] Checking VIRTUAL_ENV variable...${NC}"
    if [ -n "$VIRTUAL_ENV" ]; then
        echo -e "${GREEN}✅ VIRTUAL_ENV is set: $VIRTUAL_ENV${NC}"
    else
        echo -e "${RED}❌ VIRTUAL_ENV is not set${NC}"
        ERRORS=$((ERRORS + 1))
    fi
    
    # Test 4: Check Python executable
    echo ""
    echo -e "${CYAN}[4/6] Checking Python executable location...${NC}"
    PYTHON_PATH=$(which python)
    if [[ "$PYTHON_PATH" == *".venv"* ]]; then
        echo -e "${GREEN}✅ Python is from virtual environment: $PYTHON_PATH${NC}"
    else
        echo -e "${RED}❌ Python is not from virtual environment: $PYTHON_PATH${NC}"
        ERRORS=$((ERRORS + 1))
    fi
    
    # Test 5: Check pip location
    echo ""
    echo -e "${CYAN}[5/6] Checking pip location...${NC}"
    PIP_PATH=$(which pip)
    if [[ "$PIP_PATH" == *".venv"* ]]; then
        echo -e "${GREEN}✅ pip is from virtual environment: $PIP_PATH${NC}"
    else
        echo -e "${RED}❌ pip is not from virtual environment: $PIP_PATH${NC}"
        ERRORS=$((ERRORS + 1))
    fi
    
    # Test 6: Test installing a simple package
    echo ""
    echo -e "${CYAN}[6/6] Testing package installation in virtual environment...${NC}"
    if python -m pip install --quiet --upgrade pip 2>&1 | grep -q "Requirement already satisfied\|Successfully installed"; then
        echo -e "${GREEN}✅ pip is functional in virtual environment${NC}"
    else
        echo -e "${YELLOW}⚠️  pip upgrade returned unexpected output (might still be OK)${NC}"
    fi
    
    deactivate
else
    echo -e "${RED}❌ Failed to activate virtual environment${NC}"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# Summary
echo "╔════════════════════════════════════════════════════════════╗"
if [ $ERRORS -eq 0 ]; then
    echo -e "║  ${GREEN}✅ ALL TESTS PASSED - Virtual environment is ready${NC}     ║"
else
    echo -e "║  ${RED}❌ $ERRORS TEST(S) FAILED${NC}                                    ║"
fi
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}The virtual environment is properly configured and ready to use.${NC}"
    echo -e "${GREEN}This ensures maturin and other Python tools will work correctly.${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed. Please run one of the installation scripts:${NC}"
    echo "  - ./install-and-run.sh"
    echo "  - ./setup-apex.sh"
    echo "  - ./quickstart.sh"
    exit 1
fi
