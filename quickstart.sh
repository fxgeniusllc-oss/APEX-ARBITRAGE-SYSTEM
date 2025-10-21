#!/bin/bash

# APEX Arbitrage System - Quick Start Script

echo "╔════════════════════════════════════════════════════════════╗"
echo "║         APEX ARBITRAGE SYSTEM - QUICK START               ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Check Node.js
echo -e "${CYAN}Checking Node.js installation...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    echo "Please install Node.js 18+ from https://nodejs.org"
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
    echo "The system will work without it, but at reduced speed."
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

# Build Rust engine (if Rust is installed)
if [ "$RUST_INSTALLED" = true ]; then
    echo -e "${CYAN}Building Rust engine...${NC}"
    cd src/rust && cargo build --release
    if [ $? -ne 0 ]; then
        echo -e "${YELLOW}⚠️  Failed to build Rust engine${NC}"
        echo "System will continue without Rust acceleration"
    else
        echo -e "${GREEN}✅ Rust engine built successfully${NC}"
    fi
    cd ../..
    echo ""
fi

# Check for .env file
echo -e "${CYAN}Checking configuration...${NC}"
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  .env file not found${NC}"
    echo "Copying .env.example to .env..."
    cp .env.example .env
    echo -e "${GREEN}✅ .env file created${NC}"
    echo ""
    echo -e "${YELLOW}🔧 IMPORTANT: Edit .env file with your configuration:${NC}"
    echo "   - Add your RPC URLs (Alchemy, Infura, etc.)"
    echo "   - Add your private key"
    echo "   - Configure execution parameters"
    echo ""
    echo -e "${RED}Press Enter after editing .env to continue...${NC}"
    read
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
echo "2️⃣  Deploy the smart contract (optional for mainnet):"
echo "   yarn deploy"
echo ""
echo "3️⃣  Start the arbitrage system:"
echo "   yarn start"
echo ""
echo "4️⃣  Monitor performance:"
echo "   - Watch the live dashboard"
echo "   - Check logs/ directory"
echo "   - Query data/apex.db for historical data"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANT REMINDERS:${NC}"
echo "   • Start with small amounts in testnet"
echo "   • Monitor the first 24 hours closely"
echo "   • Keep your private keys secure"
echo "   • Never commit .env to version control"
echo ""
echo -e "${GREEN}🚀 Ready to start? Run: yarn start${NC}"
echo ""
