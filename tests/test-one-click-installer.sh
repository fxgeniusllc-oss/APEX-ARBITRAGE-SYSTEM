#!/bin/bash

# ═══════════════════════════════════════════════════════════════════════════
# COMPREHENSIVE TEST SCRIPT FOR ONE-CLICK INSTALLER
# ═══════════════════════════════════════════════════════════════════════════
# This script performs comprehensive testing of the one-click install and run
# command without actually running the full installation.
# ═══════════════════════════════════════════════════════════════════════════

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

# Test results
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_WARNED=0

echo ""
echo "═══════════════════════════════════════════════════════════════════════════"
echo "     COMPREHENSIVE ONE-CLICK INSTALLER TEST SUITE"
echo "═══════════════════════════════════════════════════════════════════════════"
echo ""
echo -e "${CYAN}This test verifies all components of the one-click installer${NC}"
echo ""

# Helper function for test results
function test_result() {
    local test_name="$1"
    local status="$2"
    local message="$3"
    
    if [ "$status" = "pass" ]; then
        echo -e "${GREEN}✅ PASS${NC} - $test_name"
        if [ -n "$message" ]; then
            echo -e "   ${CYAN}$message${NC}"
        fi
        ((TESTS_PASSED++))
    elif [ "$status" = "fail" ]; then
        echo -e "${RED}❌ FAIL${NC} - $test_name"
        if [ -n "$message" ]; then
            echo -e "   ${RED}$message${NC}"
        fi
        ((TESTS_FAILED++))
    else
        echo -e "${YELLOW}⚠️  WARN${NC} - $test_name"
        if [ -n "$message" ]; then
            echo -e "   ${YELLOW}$message${NC}"
        fi
        ((TESTS_WARNED++))
    fi
}

# ═══════════════════════════════════════════════════════════════════════════
# TEST CATEGORY 1: INSTALLER SCRIPT VALIDATION
# ═══════════════════════════════════════════════════════════════════════════

echo -e "${BLUE}[1/8] INSTALLER SCRIPT VALIDATION${NC}"
echo "─────────────────────────────────────────────────────────────────────────"

# Test 1.1: Check installer exists
if [ -f "install-and-run.sh" ]; then
    test_result "install-and-run.sh exists" "pass"
else
    test_result "install-and-run.sh exists" "fail" "File not found"
fi

# Test 1.2: Check installer is executable
if [ -x "install-and-run.sh" ]; then
    test_result "install-and-run.sh is executable" "pass"
else
    test_result "install-and-run.sh is executable" "fail" "File is not executable"
fi

# Test 1.3: Check Windows installer exists
if [ -f "install-and-run.bat" ]; then
    test_result "install-and-run.bat exists" "pass"
else
    test_result "install-and-run.bat exists" "warn" "Windows installer not found"
fi

# Test 1.4: Check syntax validity
bash -n install-and-run.sh 2>&1 > /dev/null
if [ $? -eq 0 ]; then
    test_result "install-and-run.sh syntax" "pass"
else
    test_result "install-and-run.sh syntax" "fail" "Syntax errors detected"
fi

# Test 1.5: Check for error handling
if grep -q "trap.*ERR" install-and-run.sh; then
    test_result "Error handling present" "pass"
else
    test_result "Error handling present" "warn" "No error trap found"
fi

# Test 1.6: Check for color output
if grep -q "GREEN=" install-and-run.sh && grep -q "RED=" install-and-run.sh; then
    test_result "Color output configured" "pass"
else
    test_result "Color output configured" "warn" "No color variables found"
fi

echo ""

# ═══════════════════════════════════════════════════════════════════════════
# TEST CATEGORY 2: REQUIRED FILES VALIDATION
# ═══════════════════════════════════════════════════════════════════════════

echo -e "${BLUE}[2/8] REQUIRED FILES VALIDATION${NC}"
echo "─────────────────────────────────────────────────────────────────────────"

# Test 2.1: package.json
if [ -f "package.json" ]; then
    if node -e "require('./package.json')" 2>/dev/null; then
        test_result "package.json valid" "pass"
    else
        test_result "package.json valid" "fail" "Invalid JSON format"
    fi
else
    test_result "package.json valid" "fail" "File not found"
fi

# Test 2.2: requirements.txt
if [ -f "requirements.txt" ]; then
    if [ -s "requirements.txt" ]; then
        test_result "requirements.txt exists and non-empty" "pass"
    else
        test_result "requirements.txt exists and non-empty" "warn" "File is empty"
    fi
else
    test_result "requirements.txt exists and non-empty" "fail" "File not found"
fi

# Test 2.3: .env.example
if [ -f ".env.example" ]; then
    test_result ".env.example exists" "pass"
else
    test_result ".env.example exists" "fail" "File not found"
fi

# Test 2.4: README.md
if [ -f "README.md" ]; then
    if grep -q "ONE-CLICK INSTALL" README.md; then
        test_result "README.md documents installer" "pass"
    else
        test_result "README.md documents installer" "warn" "No installer documentation found"
    fi
else
    test_result "README.md documents installer" "fail" "File not found"
fi

# Test 2.5: quickstart.sh
if [ -f "quickstart.sh" ]; then
    test_result "quickstart.sh exists" "pass"
else
    test_result "quickstart.sh exists" "warn" "Alternative installer not found"
fi

# Test 2.6: setup-apex.sh
if [ -f "setup-apex.sh" ]; then
    test_result "setup-apex.sh exists" "pass"
else
    test_result "setup-apex.sh exists" "warn" "Advanced installer not found"
fi

echo ""

# ═══════════════════════════════════════════════════════════════════════════
# TEST CATEGORY 3: DIRECTORY STRUCTURE VALIDATION
# ═══════════════════════════════════════════════════════════════════════════

echo -e "${BLUE}[3/8] DIRECTORY STRUCTURE VALIDATION${NC}"
echo "─────────────────────────────────────────────────────────────────────────"

# Test 3.1: src directory
if [ -d "src" ]; then
    test_result "src/ directory exists" "pass"
else
    test_result "src/ directory exists" "fail" "Directory not found"
fi

# Test 3.2: scripts directory
if [ -d "scripts" ]; then
    test_result "scripts/ directory exists" "pass"
else
    test_result "scripts/ directory exists" "fail" "Directory not found"
fi

# Test 3.3: tests directory
if [ -d "tests" ]; then
    test_result "tests/ directory exists" "pass"
else
    test_result "tests/ directory exists" "fail" "Directory not found"
fi

# Test 3.4: data directory
if [ -d "data" ]; then
    test_result "data/ directory exists" "pass"
else
    test_result "data/ directory exists" "warn" "Will be created during installation"
fi

# Test 3.5: contracts directory
if [ -d "contracts" ]; then
    test_result "contracts/ directory exists" "pass"
else
    test_result "contracts/ directory exists" "warn" "Smart contract directory not found"
fi

echo ""

# ═══════════════════════════════════════════════════════════════════════════
# TEST CATEGORY 4: VALIDATION SCRIPTS
# ═══════════════════════════════════════════════════════════════════════════

echo -e "${BLUE}[4/8] VALIDATION SCRIPTS${NC}"
echo "─────────────────────────────────────────────────────────────────────────"

# Test 4.1: comprehensive-validation.js
if [ -f "scripts/comprehensive-validation.js" ]; then
    test_result "comprehensive-validation.js exists" "pass"
else
    test_result "comprehensive-validation.js exists" "fail" "File not found"
fi

# Test 4.2: validate-system.js
if [ -f "scripts/validate-system.js" ]; then
    test_result "validate-system.js exists" "pass"
else
    test_result "validate-system.js exists" "warn" "Additional validation script not found"
fi

# Test 4.3: pre-operation-checklist.js
if [ -f "scripts/pre-operation-checklist.js" ]; then
    test_result "pre-operation-checklist.js exists" "pass"
else
    test_result "pre-operation-checklist.js exists" "warn" "Pre-flight check script not found"
fi

# Test 4.4: test-installer.sh
if [ -f "test-installer.sh" ]; then
    test_result "test-installer.sh exists" "pass"
else
    test_result "test-installer.sh exists" "warn" "Installer test script not found"
fi

echo ""

# ═══════════════════════════════════════════════════════════════════════════
# TEST CATEGORY 5: PACKAGE.JSON SCRIPTS
# ═══════════════════════════════════════════════════════════════════════════

echo -e "${BLUE}[5/8] PACKAGE.JSON SCRIPTS${NC}"
echo "─────────────────────────────────────────────────────────────────────────"

# Test 5.1: start script
if grep -q '"start"' package.json; then
    test_result "start script defined" "pass"
else
    test_result "start script defined" "fail" "No start script found"
fi

# Test 5.2: verify script
if grep -q '"verify"' package.json; then
    test_result "verify script defined" "pass"
else
    test_result "verify script defined" "fail" "No verify script found"
fi

# Test 5.3: validate script
if grep -q '"validate"' package.json; then
    test_result "validate script defined" "pass"
else
    test_result "validate script defined" "warn" "No validate script found"
fi

# Test 5.4: test script
if grep -q '"test"' package.json; then
    test_result "test script defined" "pass"
else
    test_result "test script defined" "warn" "No test script found"
fi

# Test 5.5: precheck script
if grep -q '"precheck"' package.json; then
    test_result "precheck script defined" "pass"
else
    test_result "precheck script defined" "warn" "No precheck script found"
fi

echo ""

# ═══════════════════════════════════════════════════════════════════════════
# TEST CATEGORY 6: INSTALLER CONTENT VALIDATION
# ═══════════════════════════════════════════════════════════════════════════

echo -e "${BLUE}[6/8] INSTALLER CONTENT VALIDATION${NC}"
echo "─────────────────────────────────────────────────────────────────────────"

# Test 6.1: Check for Node.js installation
if grep -q "node.*-v\|NODE_VERSION" install-and-run.sh; then
    test_result "Node.js check present" "pass"
else
    test_result "Node.js check present" "fail" "No Node.js version check"
fi

# Test 6.2: Check for Python installation
if grep -q "python3.*--version\|PYTHON_VERSION" install-and-run.sh; then
    test_result "Python check present" "pass"
else
    test_result "Python check present" "fail" "No Python version check"
fi

# Test 6.3: Check for Rust installation
if grep -q "cargo.*--version\|rust" install-and-run.sh; then
    test_result "Rust check present" "pass"
else
    test_result "Rust check present" "warn" "No Rust check found"
fi

# Test 6.4: Check for yarn installation
if grep -q "yarn install" install-and-run.sh; then
    test_result "yarn install command present" "pass"
else
    test_result "yarn install command present" "fail" "No yarn install command"
fi

# Test 6.5: Check for Python venv creation
if grep -q "venv.*\.venv\|python.*-m venv" install-and-run.sh; then
    test_result "Python venv creation present" "pass"
else
    test_result "Python venv creation present" "fail" "No venv creation found"
fi

# Test 6.6: Check for .env setup
if grep -q "\.env" install-and-run.sh; then
    test_result ".env configuration present" "pass"
else
    test_result ".env configuration present" "fail" "No .env setup found"
fi

# Test 6.7: Check for validation step
if grep -q "validate\|validation" install-and-run.sh; then
    test_result "Validation step present" "pass"
else
    test_result "Validation step present" "warn" "No validation step found"
fi

# Test 6.8: Check for system start
if grep -q "yarn start\|npm start" install-and-run.sh; then
    test_result "System start command present" "pass"
else
    test_result "System start command present" "fail" "No start command found"
fi

echo ""

# ═══════════════════════════════════════════════════════════════════════════
# TEST CATEGORY 7: DOCUMENTATION VALIDATION
# ═══════════════════════════════════════════════════════════════════════════

echo -e "${BLUE}[7/8] DOCUMENTATION VALIDATION${NC}"
echo "─────────────────────────────────────────────────────────────────────────"

# Test 7.1: README mentions one-click install
if [ -f "README.md" ]; then
    if grep -qi "one.click\|install-and-run" README.md; then
        test_result "README documents one-click install" "pass"
    else
        test_result "README documents one-click install" "warn" "No mention of one-click install"
    fi
else
    test_result "README documents one-click install" "fail" "README.md not found"
fi

# Test 7.2: README has installation instructions
if [ -f "README.md" ]; then
    if grep -qi "installation\|quick start\|getting started" README.md; then
        test_result "README has installation section" "pass"
    else
        test_result "README has installation section" "warn" "No installation section found"
    fi
fi

# Test 7.3: DOCUMENTATION.md exists
if [ -f "DOCUMENTATION.md" ]; then
    test_result "DOCUMENTATION.md exists" "pass"
else
    test_result "DOCUMENTATION.md exists" "warn" "No detailed documentation found"
fi

# Test 7.4: Installation instructions in README
if [ -f "README.md" ]; then
    if grep -qi "./install-and-run.sh" README.md; then
        test_result "README shows installer command" "pass"
    else
        test_result "README shows installer command" "warn" "Installer command not documented"
    fi
fi

echo ""

# ═══════════════════════════════════════════════════════════════════════════
# TEST CATEGORY 8: PREREQUISITES CHECK
# ═══════════════════════════════════════════════════════════════════════════

echo -e "${BLUE}[8/8] CURRENT ENVIRONMENT PREREQUISITES${NC}"
echo "─────────────────────────────────────────────────────────────────────────"

# Test 8.1: Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    test_result "Node.js available" "pass" "Version: $NODE_VERSION"
else
    test_result "Node.js available" "warn" "Not installed (will be installed)"
fi

# Test 8.2: yarn
if command -v yarn &> /dev/null; then
    YARN_VERSION=$(yarn -v)
    test_result "yarn available" "pass" "Version: $YARN_VERSION"
else
    test_result "yarn available" "warn" "Not installed (will be installed)"
fi

# Test 8.3: Python
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version)
    test_result "Python 3 available" "pass" "$PYTHON_VERSION"
else
    test_result "Python 3 available" "warn" "Not installed (will be installed)"
fi

# Test 8.4: pip
if command -v pip3 &> /dev/null; then
    PIP_VERSION=$(pip3 --version | cut -d' ' -f2)
    test_result "pip3 available" "pass" "Version: $PIP_VERSION"
else
    test_result "pip3 available" "warn" "Not installed (will be installed)"
fi

# Test 8.5: Rust
if command -v cargo &> /dev/null; then
    RUST_VERSION=$(cargo --version)
    test_result "Rust/Cargo available" "pass" "$RUST_VERSION"
else
    test_result "Rust/Cargo available" "warn" "Not installed (optional, will be installed)"
fi

# Test 8.6: Git
if command -v git &> /dev/null; then
    GIT_VERSION=$(git --version)
    test_result "Git available" "pass" "$GIT_VERSION"
else
    test_result "Git available" "warn" "Not installed (recommended)"
fi

echo ""

# ═══════════════════════════════════════════════════════════════════════════
# TEST SUMMARY
# ═══════════════════════════════════════════════════════════════════════════

echo "═══════════════════════════════════════════════════════════════════════════"
echo "                           TEST SUMMARY"
echo "═══════════════════════════════════════════════════════════════════════════"
echo ""
echo -e "${GREEN}✅ Tests Passed:  $TESTS_PASSED${NC}"
echo -e "${YELLOW}⚠️  Tests Warned:  $TESTS_WARNED${NC}"
echo -e "${RED}❌ Tests Failed:  $TESTS_FAILED${NC}"
echo ""

TOTAL_TESTS=$((TESTS_PASSED + TESTS_FAILED + TESTS_WARNED))
echo "Total Tests Run: $TOTAL_TESTS"
echo ""

# Determine overall result
if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}═══════════════════════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}                    ✅ ALL CRITICAL TESTS PASSED!${NC}"
    echo -e "${GREEN}═══════════════════════════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "${CYAN}The one-click installer is ready for use!${NC}"
    echo ""
    echo "To run the installer:"
    echo "  chmod +x install-and-run.sh"
    echo "  ./install-and-run.sh"
    echo ""
    exit 0
else
    echo -e "${RED}═══════════════════════════════════════════════════════════════════════════${NC}"
    echo -e "${RED}                    ❌ SOME TESTS FAILED${NC}"
    echo -e "${RED}═══════════════════════════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "${YELLOW}Please review the failed tests above and fix the issues.${NC}"
    echo ""
    exit 1
fi
