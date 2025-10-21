#!/bin/bash

# APEX Arbitrage System - Quick Start Script
# For complete APEX build, use: ./setup-apex.sh

echo "╔════════════════════════════════════════════════════════════╗"
echo "║         APEX ARBITRAGE SYSTEM - QUICK START               ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}ℹ️  This is the quick setup for existing installations.${NC}"
echo -e "${BLUE}For complete APEX build with all features, run: ./setup-apex.sh${NC}"
echo ""

# Check Node.js
echo -e "${CYAN}Checking Node.js installation...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    echo "Please install Node.js 18+ from https://nodejs.org"
    echo -e "${YELLOW}Or run ./setup-apex.sh for automated setup${NC}"
    exit 1
fi
NODE_VERSION=$(node -v)
echo -e "${GREEN}✅ Node.js ${NODE_VERSION} found${NC}"
echo ""

# Check Python
echo -e "${CYAN}Checking Python installation...${NC}"
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Python 3 is not installed${NC}"
    echo "Please install Python 3.8+ from https://python.org"
    echo -e "${YELLOW}Or run ./setup-apex.sh for automated setup${NC}"
    exit 1
fi
PYTHON_VERSION=$(python3 --version)
echo -e "${GREEN}✅ ${PYTHON_VERSION} found${NC}"
echo ""

# Check Rust (optional but recommended)
echo -e "${CYAN}Checking Rust installation...${NC}"
if ! command -v cargo &> /dev/null; then
    echo -e "${YELLOW}⚠️  Rust is not installed (optional)${NC}"
    echo "For maximum performance, install Rust from https://rustup.rs"
    echo -e "${YELLOW}Or run ./setup-apex.sh for automated installation${NC}"
    RUST_INSTALLED=false
else
    RUST_VERSION=$(cargo --version)
    echo -e "${GREEN}✅ ${RUST_VERSION} found${NC}"
    RUST_INSTALLED=true
fi
echo ""

# Install Node.js dependencies
echo -e "${CYAN}Installing Node.js dependencies...${NC}"
yarn install
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to install Node.js dependencies${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Node.js dependencies installed${NC}"
echo ""

# Install Python dependencies
echo -e "${CYAN}Installing Python dependencies...${NC}"
python3 -m pip install -r requirements.txt
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to install Python dependencies${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Python dependencies installed${NC}"
echo ""

# Build Rust engines (if Rust is installed)
if [ "$RUST_INSTALLED" = true ]; then
    # Build legacy Rust engine
    if [ -d "src/rust" ]; then
        echo -e "${CYAN}Building legacy Rust engine...${NC}"
        cd src/rust && cargo build --release
        if [ $? -ne 0 ]; then
            echo -e "${YELLOW}⚠️  Failed to build legacy Rust engine${NC}"
        else
            echo -e "${GREEN}✅ Legacy Rust engine built successfully${NC}"
        fi
        cd ../..
        echo ""
    fi
    
    # Build APEX Rust engine if it exists
    if [ -d "rust-engine" ]; then
        echo -e "${CYAN}Building APEX Rust engine...${NC}"
        cd rust-engine
        if [ $? -ne 0 ]; then
            echo -e "${RED}❌ Failed to enter rust-engine directory${NC}"
            echo "Run ./setup-apex.sh for proper APEX build"
        else
            cargo build --release
            if [ $? -ne 0 ]; then
                echo -e "${YELLOW}⚠️  Failed to build APEX Rust engine${NC}"
                echo "Run ./setup-apex.sh for proper APEX build"
            else
                echo -e "${GREEN}✅ APEX Rust engine built successfully${NC}"
            fi
            cd ..
            echo ""
        fi
    fi
fi

# Check for .env file
echo -e "${CYAN}Checking configuration...${NC}"
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  .env file not found${NC}"
    if [ -f .env.example ]; then
        echo "Copying .env.example to .env..."
        cp .env.example .env
        echo -e "${GREEN}✅ .env file created${NC}"
        echo ""
        echo -e "${YELLOW}🔧 IMPORTANT: Edit .env file with your configuration:${NC}"
        echo "   - Add your RPC URLs (Alchemy, Infura, etc.)"
        echo "   - Add your private key"
        echo "   - Configure execution parameters"
        echo ""
    else
        echo -e "${RED}❌ .env.example not found${NC}"
        echo "Please create a .env file manually"
    fi
else
    echo -e "${GREEN}✅ .env file exists${NC}"
fi
echo ""

# Create data directories
echo -e "${CYAN}Creating data directories...${NC}"
mkdir -p data/models
mkdir -p logs
echo -e "${GREEN}✅ Data directories created${NC}"
echo ""

# System check summary
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                   INSTALLATION COMPLETE                    ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo -e "${GREEN}✅ All dependencies installed${NC}"
echo -e "${GREEN}✅ Configuration file ready${NC}"
echo -e "${GREEN}✅ Data directories created${NC}"
echo ""

# Display next steps
echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                        NEXT STEPS                          ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "1️⃣  Configure your .env file:"
echo "   nano .env"
echo ""
echo "2️⃣  Verify setup (recommended):"
echo "   npm run verify"
echo ""
echo "3️⃣  Deploy the smart contract (if needed):"
echo "   npm run deploy"
echo ""
echo "4️⃣  Start the arbitrage system:"
echo "   npm start"
echo ""
echo "5️⃣  Monitor performance:"
echo "   npm run monitor"
echo ""
echo "6️⃣  Run benchmarks:"
echo "   npm run benchmark"
echo ""
echo -e "${BLUE}ℹ️  For complete APEX build with all features:${NC}"
echo "   ./setup-apex.sh"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANT REMINDERS:${NC}"
echo "   • Start with small amounts in testnet"
echo "   • Monitor the first 24 hours closely"
echo "   • Keep your private keys secure"
echo "   • Never commit .env to version control"
echo ""
echo -e "${GREEN}🚀 Ready to start? Run: yarn start${NC}"
echo ""
