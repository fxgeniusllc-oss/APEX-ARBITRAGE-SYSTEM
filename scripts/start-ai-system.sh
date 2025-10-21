#!/bin/bash

# ===================================================================
# APEX Arbitrage System - AI Engine Startup Script
# ===================================================================
# This script starts both the AI engine and the enhanced orchestrator
# ===================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "=========================================="
echo "APEX AI System Startup"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Python3 is not installed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Python3 found: $(python3 --version)${NC}"

# Check if pip is installed
if ! command -v pip3 &> /dev/null; then
    echo -e "${RED}❌ pip3 is not installed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ pip3 found${NC}"

# Check if virtual environment exists
if [ ! -d "$PROJECT_ROOT/venv" ]; then
    echo -e "${YELLOW}⚠️  Virtual environment not found, creating...${NC}"
    cd "$PROJECT_ROOT"
    python3 -m venv venv
    echo -e "${GREEN}✅ Virtual environment created${NC}"
fi

# Activate virtual environment
echo "🔄 Activating virtual environment..."
source "$PROJECT_ROOT/venv/bin/activate"

# Check if dependencies are installed
if ! python3 -c "import fastapi" 2>/dev/null; then
    echo -e "${YELLOW}⚠️  Dependencies not installed, installing...${NC}"
    cd "$PROJECT_ROOT"
    pip3 install -r requirements.txt
    echo -e "${GREEN}✅ Dependencies installed${NC}"
else
    echo -e "${GREEN}✅ Dependencies already installed${NC}"
fi

# Check if .env file exists
if [ ! -f "$PROJECT_ROOT/.env" ]; then
    echo -e "${YELLOW}⚠️  .env file not found${NC}"
    if [ -f "$PROJECT_ROOT/.env.example" ]; then
        echo "📋 Creating .env from .env.example..."
        cp "$PROJECT_ROOT/.env.example" "$PROJECT_ROOT/.env"
        echo -e "${GREEN}✅ .env file created${NC}"
        echo -e "${YELLOW}⚠️  Please configure your .env file before proceeding${NC}"
        exit 1
    else
        echo -e "${RED}❌ .env.example not found${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✅ .env file found${NC}"
fi

# Create logs directory if it doesn't exist
mkdir -p "$PROJECT_ROOT/logs"

# Create data/models directory if it doesn't exist
mkdir -p "$PROJECT_ROOT/data/models"

echo ""
echo "=========================================="
echo "Starting Services"
echo "=========================================="
echo ""

# Function to handle cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down services..."
    
    if [ ! -z "$AI_ENGINE_PID" ]; then
        kill $AI_ENGINE_PID 2>/dev/null || true
        echo "   AI Engine stopped"
    fi
    
    if [ ! -z "$ORCHESTRATOR_PID" ]; then
        kill $ORCHESTRATOR_PID 2>/dev/null || true
        echo "   Orchestrator stopped"
    fi
    
    echo "✅ Cleanup complete"
    exit 0
}

# Set up trap to catch SIGINT (Ctrl+C) and SIGTERM
trap cleanup SIGINT SIGTERM

# Start AI Engine
echo "🤖 Starting AI Engine..."
cd "$PROJECT_ROOT"
python3 src/python/omni_mev_ai_engine.py > logs/ai_engine.log 2>&1 &
AI_ENGINE_PID=$!

# Wait a moment for AI engine to start
sleep 3

# Check if AI engine is running
if ! ps -p $AI_ENGINE_PID > /dev/null; then
    echo -e "${RED}❌ AI Engine failed to start${NC}"
    echo "Check logs/ai_engine.log for details"
    exit 1
fi

echo -e "${GREEN}✅ AI Engine started (PID: $AI_ENGINE_PID)${NC}"
echo "   Logs: logs/ai_engine.log"
echo "   API: http://localhost:8001"
echo "   Metrics: http://localhost:9090"

# Optional: Start enhanced orchestrator
if [ "$1" == "--with-orchestrator" ]; then
    echo ""
    echo "🚀 Starting Enhanced Orchestrator..."
    python3 src/python/integration_example.py > logs/orchestrator.log 2>&1 &
    ORCHESTRATOR_PID=$!
    
    sleep 2
    
    if ! ps -p $ORCHESTRATOR_PID > /dev/null; then
        echo -e "${RED}❌ Orchestrator failed to start${NC}"
        echo "Check logs/orchestrator.log for details"
        cleanup
        exit 1
    fi
    
    echo -e "${GREEN}✅ Orchestrator started (PID: $ORCHESTRATOR_PID)${NC}"
    echo "   Logs: logs/orchestrator.log"
fi

echo ""
echo "=========================================="
echo "System Status"
echo "=========================================="
echo -e "${GREEN}✅ All services running${NC}"
echo ""
echo "Services:"
echo "  • AI Engine (PID: $AI_ENGINE_PID)"
if [ ! -z "$ORCHESTRATOR_PID" ]; then
    echo "  • Orchestrator (PID: $ORCHESTRATOR_PID)"
fi
echo ""
echo "Endpoints:"
echo "  • AI Status: http://localhost:8001/status"
echo "  • Health Check: http://localhost:8001/health"
echo "  • Metrics: http://localhost:8001/metrics_summary"
echo "  • Prometheus: http://localhost:9090/metrics"
echo ""
echo "Logs:"
echo "  • AI Engine: tail -f logs/ai_engine.log"
if [ ! -z "$ORCHESTRATOR_PID" ]; then
    echo "  • Orchestrator: tail -f logs/orchestrator.log"
fi
echo ""
echo "Press Ctrl+C to stop all services"
echo "=========================================="
echo ""

# Wait for services to finish
wait
