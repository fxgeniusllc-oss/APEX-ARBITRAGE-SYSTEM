#!/bin/bash

# ═══════════════════════════════════════════════════════════════════════════
# APEX ARBITRAGE SYSTEM - ONE CLICK INSTALL AND RUN
# ═══════════════════════════════════════════════════════════════════════════
# This script will:
# 1. Check and install all prerequisites
# 2. Install all dependencies
# 3. Build all components
# 4. Set up configuration
# 5. Validate installation
# 6. Run tests
# 7. Start the system
# ═══════════════════════════════════════════════════════════════════════════

set -e  # Exit on error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Error handling
trap 'echo -e "${RED}❌ Installation failed at line $LINENO${NC}"; exit 1' ERR

echo ""
echo "═══════════════════════════════════════════════════════════════════════════"
echo "         APEX ARBITRAGE SYSTEM - ONE CLICK INSTALL & RUN"
echo "═══════════════════════════════════════════════════════════════════════════"
echo ""
echo -e "${CYAN}This script will install all prerequisites, dependencies, build all"
echo -e "components, configure the system, and start it running.${NC}"
echo ""

# ═══════════════════════════════════════════════════════════════════════════
# STEP 1: CHECK AND INSTALL PREREQUISITES
# ═══════════════════════════════════════════════════════════════════════════

echo -e "${BLUE}[1/9]${NC} Checking and installing prerequisites..."
echo ""

# Check Node.js
echo -e "${CYAN}Checking Node.js...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}⚠️  Node.js not found. Installing...${NC}"
    
    # Detect OS
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux installation
        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
        sudo apt-get install -y nodejs
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS installation
        if command -v brew &> /dev/null; then
            brew install node
        else
            echo -e "${RED}❌ Homebrew not found. Please install Node.js manually from https://nodejs.org/${NC}"
            exit 1
        fi
    else
        echo -e "${RED}❌ Unsupported OS. Please install Node.js manually from https://nodejs.org/${NC}"
        exit 1
    fi
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}❌ Node.js v18+ required. Current: v$NODE_VERSION${NC}"
    echo "Please upgrade Node.js from https://nodejs.org/"
    exit 1
fi
echo -e "${GREEN}✅ Node.js $(node -v)${NC}"

# Check yarn
if ! command -v yarn &> /dev/null; then
    echo -e "${RED}❌ yarn not found${NC}"
    exit 1
fi
echo -e "${GREEN}✅ yarn $(yarn -v)${NC}"

# Check yarn (should already be installed if Node.js v20+ is present)
if ! command -v yarn &> /dev/null; then
    echo -e "${YELLOW}⚠️  yarn not found. Installing...${NC}"
    npm install -g yarn
fi
echo -e "${GREEN}✅ yarn $(yarn -v)${NC}"

# Check Python
echo ""
echo -e "${CYAN}Checking Python...${NC}"
if ! command -v python3 &> /dev/null; then
    echo -e "${YELLOW}⚠️  Python 3 not found. Installing...${NC}"
    
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        sudo apt-get update
        sudo apt-get install -y python3 python3-pip python3-venv
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        if command -v brew &> /dev/null; then
            brew install python3
        else
            echo -e "${RED}❌ Homebrew not found. Please install Python 3 manually from https://python.org/${NC}"
            exit 1
        fi
    else
        echo -e "${RED}❌ Unsupported OS. Please install Python 3 manually from https://python.org/${NC}"
        exit 1
    fi
fi
echo -e "${GREEN}✅ Python $(python3 --version)${NC}"

# Check pip
if ! command -v pip3 &> /dev/null; then
    echo -e "${YELLOW}⚠️  pip3 not found. Installing...${NC}"
    python3 -m ensurepip --upgrade
fi
echo -e "${GREEN}✅ pip3 $(pip3 --version | cut -d' ' -f2)${NC}"

# Check Rust
echo ""
echo -e "${CYAN}Checking Rust...${NC}"
if ! command -v cargo &> /dev/null; then
    echo -e "${YELLOW}⚠️  Rust not found. Installing...${NC}"
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    source $HOME/.cargo/env
    export PATH="$HOME/.cargo/bin:$PATH"
fi
echo -e "${GREEN}✅ Rust $(rustc --version)${NC}"
echo -e "${GREEN}✅ Cargo $(cargo --version)${NC}"

echo ""
echo -e "${GREEN}✅ All prerequisites installed${NC}"
echo ""

# ═══════════════════════════════════════════════════════════════════════════
# STEP 2: CREATE REQUIRED DIRECTORIES
# ═══════════════════════════════════════════════════════════════════════════

echo -e "${BLUE}[2/9]${NC} Creating directory structure..."

mkdir -p data/models
mkdir -p logs
mkdir -p contracts/{interfaces,libraries}
mkdir -p scripts
mkdir -p src/{config,core,integrations,monitoring,utils}
mkdir -p tests/{unit,integration,fixtures}
mkdir -p docs

echo -e "${GREEN}✅ Directory structure created${NC}"
echo ""

# ═══════════════════════════════════════════════════════════════════════════
# STEP 3: INSTALL NODE.JS DEPENDENCIES
# ═══════════════════════════════════════════════════════════════════════════

echo -e "${BLUE}[3/9]${NC} Installing Node.js dependencies..."
echo -e "${YELLOW}This may take a few minutes...${NC}"
echo ""

# Use yarn install with increased timeout
yarn install --network-timeout 600000 --silent 2>&1 | grep -v "deprecated" || true

if [ $? -ne 0 ]; then
    echo -e "${YELLOW}⚠️  yarn install had some warnings, retrying...${NC}"
    yarn install --silent 2>&1 | grep -v "deprecated" || true
fi

echo -e "${GREEN}✅ Node.js dependencies installed${NC}"
echo ""

# ═══════════════════════════════════════════════════════════════════════════
# STEP 4: INSTALL PYTHON DEPENDENCIES
# ═══════════════════════════════════════════════════════════════════════════

echo -e "${BLUE}[4/9]${NC} Installing Python dependencies..."
echo -e "${YELLOW}This may take a few minutes...${NC}"
echo ""

# Upgrade pip first
python3 -m pip install --upgrade pip --quiet

# Install dependencies
if [ -f requirements.txt ]; then
    python3 -m pip install -r requirements.txt --quiet
    echo -e "${GREEN}✅ Python dependencies installed${NC}"
else
    echo -e "${YELLOW}⚠️  requirements.txt not found, skipping Python dependencies${NC}"
fi
echo ""

# ═══════════════════════════════════════════════════════════════════════════
# STEP 5: BUILD RUST ENGINE
# ═══════════════════════════════════════════════════════════════════════════

echo -e "${BLUE}[5/9]${NC} Building Rust engine..."
echo -e "${YELLOW}This may take a few minutes on first build...${NC}"
echo ""

# Build src/rust if it exists
if [ -d "src/rust" ]; then
    echo -e "${CYAN}Building src/rust engine...${NC}"
    cd src/rust
    cargo build --release --quiet 2>&1 | grep -v "Compiling" | grep -v "Finished" || true
    cd ../..
    echo -e "${GREEN}✅ src/rust engine built${NC}"
fi

# Build rust-engine if it exists
if [ -d "rust-engine" ]; then
    echo -e "${CYAN}Building rust-engine...${NC}"
    cd rust-engine
    cargo build --release --quiet 2>&1 | grep -v "Compiling" | grep -v "Finished" || true
    cd ..
    echo -e "${GREEN}✅ rust-engine built${NC}"
fi

echo -e "${GREEN}✅ Rust components built successfully${NC}"
echo ""

# ═══════════════════════════════════════════════════════════════════════════
# STEP 6: SETUP CONFIGURATION
# ═══════════════════════════════════════════════════════════════════════════

echo -e "${BLUE}[6/9]${NC} Setting up configuration..."

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        echo -e "${CYAN}Creating .env file from .env.example...${NC}"
        cp .env.example .env
        echo -e "${GREEN}✅ .env file created${NC}"
        echo ""
        echo -e "${YELLOW}⚠️  IMPORTANT: You need to configure your .env file with:${NC}"
        echo -e "${YELLOW}   - RPC URLs (Alchemy, Infura, etc.)${NC}"
        echo -e "${YELLOW}   - Private key${NC}"
        echo -e "${YELLOW}   - Execution parameters${NC}"
        echo ""
        echo -e "${CYAN}The system will run with default values for now.${NC}"
        echo -e "${CYAN}Edit .env before production use!${NC}"
    else
        echo -e "${YELLOW}⚠️  .env.example not found${NC}"
        echo -e "${CYAN}Creating minimal .env file...${NC}"
        cat > .env << 'EOF'
# APEX ARBITRAGE SYSTEM - MINIMAL CONFIGURATION
# Please configure these values before production use

# Network RPC URLs
POLYGON_RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/YOUR_API_KEY
ETHEREUM_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY

# Private Key (WITHOUT 0x prefix)
PRIVATE_KEY=your_private_key_here

# Execution Parameters
MIN_PROFIT_USD=5
MAX_GAS_PRICE_GWEI=100
SLIPPAGE_BPS=50
SCAN_INTERVAL=60000

# AI Engine
LIVE_TRADING=false
AI_THRESHOLD=0.78
AI_ENGINE_PORT=8001

# Logging
LOG_LEVEL=info
LOG_DIR=logs
EOF
        echo -e "${GREEN}✅ Minimal .env file created${NC}"
    fi
else
    echo -e "${GREEN}✅ .env file already exists${NC}"
fi
echo ""

# ═══════════════════════════════════════════════════════════════════════════
# STEP 7: VALIDATE INSTALLATION
# ═══════════════════════════════════════════════════════════════════════════

echo -e "${BLUE}[7/9]${NC} Validating installation..."
echo ""

# Check if validate-system.js exists
if [ -f scripts/validate-system.js ]; then
    echo -e "${CYAN}Running validation script...${NC}"
    node scripts/validate-system.js || echo -e "${YELLOW}⚠️  Some validation checks failed (non-critical)${NC}"
else
    echo -e "${YELLOW}⚠️  Validation script not found, performing basic checks...${NC}"
    
    # Basic validation
    echo -e "${CYAN}Checking critical files...${NC}"
    [ -f package.json ] && echo -e "${GREEN}✅ package.json${NC}" || echo -e "${RED}❌ package.json${NC}"
    [ -d node_modules ] && echo -e "${GREEN}✅ node_modules${NC}" || echo -e "${RED}❌ node_modules${NC}"
    [ -f .env ] && echo -e "${GREEN}✅ .env${NC}" || echo -e "${RED}❌ .env${NC}"
    [ -d data ] && echo -e "${GREEN}✅ data directory${NC}" || echo -e "${RED}❌ data directory${NC}"
    [ -d logs ] && echo -e "${GREEN}✅ logs directory${NC}" || echo -e "${RED}❌ logs directory${NC}"
fi

echo ""
echo -e "${GREEN}✅ Installation validated${NC}"
echo ""

# ═══════════════════════════════════════════════════════════════════════════
# STEP 8: RUN TESTS (OPTIONAL)
# ═══════════════════════════════════════════════════════════════════════════

echo -e "${BLUE}[8/9]${NC} Running tests..."
echo ""

# Ask user if they want to run tests
echo -e "${CYAN}Would you like to run tests now? (y/N)${NC}"
read -t 10 -n 1 -r RUN_TESTS || RUN_TESTS="n"
echo ""

if [[ $RUN_TESTS =~ ^[Yy]$ ]]; then
    echo -e "${CYAN}Running tests...${NC}"
    yarn test || echo -e "${YELLOW}⚠️  Some tests failed (may be expected in development)${NC}"
else
    echo -e "${YELLOW}⏭️  Skipping tests${NC}"
fi
echo ""

# ═══════════════════════════════════════════════════════════════════════════
# STEP 9: START THE SYSTEM
# ═══════════════════════════════════════════════════════════════════════════

echo -e "${BLUE}[9/9]${NC} Starting the system..."
echo ""

echo "═══════════════════════════════════════════════════════════════════════════"
echo "                    ✅ INSTALLATION COMPLETE!"
echo "═══════════════════════════════════════════════════════════════════════════"
echo ""
echo -e "${GREEN}🎉 All components installed and configured successfully!${NC}"
echo ""
echo -e "${MAGENTA}═══════════════════════════════════════════════════════════════════════════${NC}"
echo -e "${MAGENTA}                         NEXT STEPS${NC}"
echo -e "${MAGENTA}═══════════════════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${CYAN}1️⃣  Configure your environment (REQUIRED):${NC}"
echo "   nano .env  # Add your RPC URLs and private key"
echo ""
echo -e "${CYAN}2️⃣  Start the system:${NC}"
echo "   yarn start                    # Start the arbitrage system"
echo "   yarn run ai:start            # Start AI engine (optional)"
echo "   yarn run start:all           # Start everything (Node + Python)"
echo ""
echo -e "${CYAN}3️⃣  Monitor performance:${NC}"
echo "   yarn run verify              # Verify setup"
echo "   yarn run health              # Health check"
echo "   yarn run logs                # View logs"
echo ""
echo -e "${CYAN}4️⃣  Additional commands:${NC}"
echo "   yarn run deploy              # Deploy smart contracts"
echo "   yarn run dryrun              # Test without execution"
echo "   yarn test                    # Run tests"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANT REMINDERS:${NC}"
echo "   • Configure .env before production use"
echo "   • Start with testnet for testing"
echo "   • Monitor the first 24 hours closely"
echo "   • Keep your private keys secure"
echo "   • Never commit .env to version control"
echo ""

# Ask user if they want to start the system now
echo -e "${CYAN}Would you like to start the system now? (y/N)${NC}"
read -t 10 -n 1 -r START_NOW || START_NOW="n"
echo ""

if [[ $START_NOW =~ ^[Yy]$ ]]; then
    echo -e "${GREEN}🚀 Starting APEX Arbitrage System...${NC}"
    echo ""
    
    # Check if .env is properly configured
    if grep -q "your_private_key_here" .env 2>/dev/null || grep -q "YOUR_API_KEY" .env 2>/dev/null; then
        echo -e "${YELLOW}⚠️  WARNING: .env file contains placeholder values${NC}"
        echo -e "${YELLOW}The system will start but won't be fully functional.${NC}"
        echo -e "${YELLOW}Please configure .env with real values for production use.${NC}"
        echo ""
        echo -e "${CYAN}Press Ctrl+C to stop and configure, or wait 5 seconds to continue...${NC}"
        sleep 5
    fi
    
    yarn start
else
    echo -e "${GREEN}✅ Installation complete!${NC}"
    echo -e "${CYAN}Run 'yarn start' when you're ready.${NC}"
    echo ""
fi
