# APEX Arbitrage System - Complete Setup Guide

## Overview

The APEX Arbitrage System now includes two setup scripts:

1. **`setup-apex.sh`** - Complete APEX build with all features (10-step process)
2. **`quickstart.sh`** - Quick setup for existing installations (simplified)

## Complete APEX Build (`setup-apex.sh`)

### What It Does

The `setup-apex.sh` script performs a comprehensive 10-step build process:

1. **Prerequisites Check**
   - Validates Node.js v18+
   - Validates npm
   - Validates Python 3
   - Installs Rust if not present

2. **Project Structure Creation**
   - Creates complete directory hierarchy
   - Sets up contracts/, python/, rust-engine/, test/, logs/, data/, docs/

3. **Node.js Initialization**
   - Creates APEX-specific package.json
   - Installs all Node.js dependencies
   - Configures scripts for production, development, testing

4. **Python Environment Setup**
   - Creates python/requirements.txt
   - Installs ML dependencies (XGBoost, ONNX Runtime, scikit-learn)
   - Sets up async libraries (aiohttp, asyncio)

5. **Rust Engine Build**
   - Creates Cargo.toml with NAPI bindings
   - Implements ultra-fast calculation engine
   - Functions: calculate_flashloan_amount, calculate_market_impact, calculate_multihop_slippage
   - Builds optimized release binary

6. **Verification Script**
   - Creates scripts/verify-setup.js
   - Validates all dependencies
   - Checks directory structure
   - Verifies configuration

7. **Monitoring Script**
   - Creates scripts/monitor.js
   - Live system monitoring
   - Memory usage tracking
   - Log file monitoring

8. **Benchmark Script**
   - Creates scripts/benchmark.js
   - Performance testing
   - Throughput measurements
   - Operation timing

9. **Production Runner**
   - Creates src/apex-production-runner.js
   - Main execution entry point
   - Environment validation
   - Graceful shutdown handling

10. **Final Verification**
    - Runs complete system check
    - Validates all components
    - Reports setup status

### Usage

```bash
# Make executable (if not already)
chmod +x setup-apex.sh

# Run the complete build
./setup-apex.sh
```

### Prerequisites

- Node.js 18+ (will be checked)
- Python 3.8+ (will be checked)
- Rust (will be installed if missing)
- Internet connection for package downloads

### Time Estimate

- Full build: 5-15 minutes (depending on connection speed)
- Rust compilation: 2-5 minutes
- Node.js dependencies: 2-5 minutes
- Python dependencies: 1-3 minutes

## Quick Setup (`quickstart.sh`)

### What It Does

The `quickstart.sh` script provides a simplified setup for:
- Existing installations
- Quick dependency updates
- Development environment setup

### Usage

```bash
# Make executable (if not already)
chmod +x quickstart.sh

# Run quick setup
./quickstart.sh
```

## Post-Installation Steps

### 1. Configure Environment

```bash
# Copy example environment file
cp .env.example .env

# Edit with your credentials
nano .env
```

Required configuration:
- `RPC_URL` - Your blockchain RPC endpoint
- `PRIVATE_KEY` - Your wallet private key
- `FLASHLOAN_PROVIDER` - Flash loan provider address
- Execution parameters (gas limits, profit thresholds)

### 2. Verify Setup

```bash
yarn run verify
```

This will check:
- ✅ All dependencies installed
- ✅ Rust engine built
- ✅ Python libraries available
- ✅ Directory structure correct
- ✅ Configuration file present

### 3. Run Tests

```bash
yarn test
```

### 4. Deploy Contracts (Optional)

```bash
yarn run deploy
```

### 5. Start the System

```bash
# Production mode
yarn start

# Development mode
yarn run dev
```

## Available Commands

After setup, you have access to:

```bash
yarn start           # Start production system
yarn run dev         # Start development mode
yarn run legacy      # Run legacy system
yarn test            # Run integration tests
yarn run deploy      # Deploy smart contracts
yarn run verify      # Verify setup
yarn run monitor     # Live monitoring dashboard
yarn run benchmark   # Performance benchmarks
yarn run build:rust  # Build APEX Rust engine
yarn run build:all   # Build all components
yarn run lint        # Lint code
yarn run format      # Format code
```

## Directory Structure

```
apex-arbitrage-system/
├── contracts/              # Smart contracts
│   ├── interfaces/
│   └── libraries/
├── scripts/               # Utility scripts
│   ├── deploy.js
│   ├── verify-setup.js
│   ├── monitor.js
│   └── benchmark.js
├── src/                   # Main source code
│   ├── config/
│   ├── core/
│   ├── integrations/
│   ├── monitoring/
│   ├── utils/
│   ├── apex-production-runner.js
│   └── index.js (legacy)
├── python/               # Python ML components
│   ├── models/
│   ├── utils/
│   └── requirements.txt
├── rust-engine/          # APEX Rust engine
│   ├── src/
│   │   └── lib.rs
│   └── Cargo.toml
├── test/                 # Test suites
│   ├── unit/
│   ├── integration/
│   └── fixtures/
├── logs/                 # Application logs
├── data/                 # Database and models
│   └── models/
├── docs/                 # Documentation
├── setup-apex.sh         # Complete APEX build
├── quickstart.sh         # Quick setup
├── package.json
└── .env                  # Configuration (create from .env.example)
```

## Rust Engine Features

The APEX Rust engine provides ultra-fast calculations:

### Functions

1. **calculate_flashloan_amount**
   - Binary search optimization
   - Finds optimal flashloan amount
   - Considers fees and gas costs
   - Returns best profitable amount

2. **calculate_market_impact**
   - Calculates price impact percentage
   - AMM pool simulation
   - Slippage estimation

3. **calculate_multihop_slippage**
   - Multi-pool route analysis
   - Cumulative slippage calculation
   - Route optimization support

### Performance

- 100-1000x faster than JavaScript
- Sub-millisecond calculations
- Concurrent processing ready
- Zero-copy optimizations

## Monitoring

### Live Dashboard

```bash
yarn run monitor
```

Displays:
- System uptime
- Memory usage
- Active processes
- Recent logs
- Auto-refresh every 5 seconds

### Logs

Check the `logs/` directory for detailed execution logs:
- Error logs
- Transaction logs
- Performance metrics
- Opportunity detection

## Troubleshooting

### Rust Build Fails

```bash
# Update Rust
rustup update

# Clean and rebuild
cd rust-engine
cargo clean
cargo build --release
cd ..
```

### Python Dependencies Issues

```bash
# Upgrade pip
python3 -m pip install --upgrade pip

# Reinstall dependencies
python3 -m pip install -r python/requirements.txt --force-reinstall
```

### Node.js Module Issues

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
yarn install
```

### Permission Denied

```bash
# Make scripts executable
chmod +x setup-apex.sh quickstart.sh
```

## Performance Optimization

### Recommended Settings

In `.env`:
```
# Gas optimization
MAX_GAS_PRICE=50
GAS_MULTIPLIER=1.1

# Execution
MIN_PROFIT_USD=10
MAX_POSITION_SIZE=1000

# Monitoring
LOG_LEVEL=info
ENABLE_TELEGRAM=true
```

### Hardware Recommendations

Minimum:
- 4 CPU cores
- 8 GB RAM
- 50 GB SSD

Recommended:
- 8+ CPU cores
- 16+ GB RAM
- 100+ GB NVMe SSD
- Low-latency network (<50ms to RPC)

## Security Best Practices

1. **Never commit .env file**
   - Already in .gitignore
   - Contains sensitive keys

2. **Use separate testnet wallet first**
   - Test with small amounts
   - Verify functionality

3. **Monitor closely for 24 hours**
   - Check logs frequently
   - Verify transactions
   - Adjust parameters

4. **Keep private keys secure**
   - Use hardware wallet when possible
   - Rotate keys periodically
   - Limit wallet permissions

5. **Enable monitoring alerts**
   - Telegram notifications
   - Email alerts
   - Profit/loss tracking

## Support

For issues or questions:
1. Check logs in `logs/` directory
2. Run `yarn run verify` to check setup
3. Review troubleshooting section
4. Check GitHub issues

## License

MIT License - See LICENSE file for details
