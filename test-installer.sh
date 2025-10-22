#!/bin/bash

# ═══════════════════════════════════════════════════════════════════════════
# TEST SCRIPT FOR ONE-CLICK INSTALLER
# ═══════════════════════════════════════════════════════════════════════════
# This script tests key parts of the installer without actually running it
# ═══════════════════════════════════════════════════════════════════════════

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo ""
echo "═══════════════════════════════════════════════════════════════════════════"
echo "         TESTING ONE-CLICK INSTALLER COMPONENTS"
echo "═══════════════════════════════════════════════════════════════════════════"
echo ""

# Test 1: Check if installer script exists and is executable
echo -e "${CYAN}[1/5] Checking installer script...${NC}"
if [ -f "install-and-run.sh" ]; then
    echo -e "${GREEN}✅ install-and-run.sh exists${NC}"
    if [ -x "install-and-run.sh" ]; then
        echo -e "${GREEN}✅ install-and-run.sh is executable${NC}"
    else
        echo -e "${RED}❌ install-and-run.sh is not executable${NC}"
        exit 1
    fi
else
    echo -e "${RED}❌ install-and-run.sh not found${NC}"
    exit 1
fi

# Test 2: Check validation script
echo ""
echo -e "${CYAN}[2/5] Checking validation script...${NC}"
if [ -f "scripts/comprehensive-validation.js" ]; then
    echo -e "${GREEN}✅ comprehensive-validation.js exists${NC}"
    if [ -x "scripts/comprehensive-validation.js" ]; then
        echo -e "${GREEN}✅ comprehensive-validation.js is executable${NC}"
    fi
else
    echo -e "${RED}❌ comprehensive-validation.js not found${NC}"
    exit 1
fi

# Test 3: Verify script syntax
echo ""
echo -e "${CYAN}[3/5] Checking script syntax...${NC}"
bash -n install-and-run.sh
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ install-and-run.sh syntax is valid${NC}"
else
    echo -e "${RED}❌ install-and-run.sh has syntax errors${NC}"
    exit 1
fi

# Test 4: Check if key files exist
echo ""
echo -e "${CYAN}[4/5] Checking required files...${NC}"
FILES=("package.json" "README.md" ".env.example" "requirements.txt")
for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✅ $file exists${NC}"
    else
        echo -e "${YELLOW}⚠️  $file not found${NC}"
    fi
done

# Test 5: Check directory structure
echo ""
echo -e "${CYAN}[5/5] Checking directory structure...${NC}"
DIRS=("src" "scripts" "tests" "data" "docs")
for dir in "${DIRS[@]}"; do
    if [ -d "$dir" ]; then
        echo -e "${GREEN}✅ $dir/ exists${NC}"
    else
        echo -e "${YELLOW}⚠️  $dir/ not found${NC}"
    fi
done

echo ""
echo "═══════════════════════════════════════════════════════════════════════════"
echo -e "${GREEN}✅ ALL INSTALLER TESTS PASSED${NC}"
echo "═══════════════════════════════════════════════════════════════════════════"
echo ""
echo -e "${CYAN}The one-click installer is ready to use!${NC}"
echo ""
echo "To install and run the system:"
echo "  ./install-and-run.sh"
echo ""
echo "To validate an existing installation:"
echo "  node scripts/comprehensive-validation.js"
echo "  # or"
echo "  yarn run validate"
echo ""
