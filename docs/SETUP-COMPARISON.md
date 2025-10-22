# Setup Script Comparison

## Overview

This document compares the two setup approaches for the APEX Arbitrage System.

## Scripts Comparison

| Feature | quickstart.sh | setup-apex.sh |
|---------|--------------|---------------|
| **Purpose** | Quick dependency installation | Complete APEX system build |
| **Time** | 2-5 minutes | 5-15 minutes |
| **Scope** | Existing installations | New installations |
| **Rust Install** | Skipped if missing | Auto-installs if missing |
| **Directory Creation** | Minimal (data, logs) | Complete structure (10+ dirs) |
| **Rust Engine** | Builds if present | Creates and builds from scratch |
| **Scripts Creation** | No | Yes (verify, monitor, benchmark) |
| **Python Setup** | Uses root requirements.txt | Creates python/requirements.txt |
| **Node.js Config** | Uses existing package.json | Creates APEX package.json |
| **Production Runner** | No | Creates apex-production-runner.js |
| **Verification** | Manual | Automated verification step |

## When to Use Each Script

### Use `quickstart.sh` when:
- ✅ You have an existing APEX installation
- ✅ You need to update dependencies
- ✅ You're setting up a development environment
- ✅ You want a quick setup without full rebuild
- ✅ You're familiar with the system structure

### Use `setup-apex.sh` when:
- ✅ Fresh installation on new server
- ✅ Need complete APEX build from scratch
- ✅ Want all APEX features configured
- ✅ Setting up production environment
- ✅ Need Rust engine with NAPI bindings
- ✅ Want verification and monitoring scripts
- ✅ Following APEX specification exactly

## Feature Comparison

### `quickstart.sh` Features

**Checks:**
- ✅ Node.js 18+ presence
- ✅ Python 3.8+ presence
- ✅ Rust presence (optional)

**Installs:**
- ✅ Node.js dependencies (yarn install)
- ✅ Python dependencies (from root requirements.txt)

**Builds:**
- ✅ Legacy Rust engine (src/rust) if present
- ✅ APEX Rust engine (rust-engine) if present

**Creates:**
- ✅ data/models directory
- ✅ logs directory
- ✅ .env from .env.example if missing

**Scripts Available After:**
- `yarn start` - Uses existing entry point
- `yarn run dev` - Development mode
- `yarn run deploy` - Deploy contracts
- `yarn run verify` - Verify (if script exists)

### `setup-apex.sh` Features

**Step 1: Prerequisites Check**
- ✅ Node.js 18+ validation
- ✅ npm validation
- ✅ Python 3 validation
- ✅ Rust auto-installation

**Step 2: Project Structure**
- ✅ contracts/{interfaces,libraries}
- ✅ scripts/
- ✅ src/{config,core,integrations,monitoring,utils}
- ✅ python/{models,utils}
- ✅ rust-engine/src
- ✅ test/{unit,integration,fixtures}
- ✅ logs/
- ✅ data/
- ✅ docs/

**Step 3: Node.js Initialization**
- ✅ Creates APEX-specific package.json v2.0.0
- ✅ Installs dependencies: web3, ethers, dotenv, winston, express, etc.
- ✅ Installs dev dependencies: hardhat, eslint, prettier, mocha, chai
- ✅ Configures 12+ npm scripts

**Step 4: Python Environment**
- ✅ Creates python/requirements.txt
- ✅ Installs: numpy, pandas, xgboost, scikit-learn, joblib
- ✅ Installs: onnxruntime, asyncio, aiohttp, web3
- ✅ Upgrades pip first

**Step 5: Rust Engine**
- ✅ Creates Cargo.toml with NAPI bindings
- ✅ Creates lib.rs with 3 core functions:
  - `calculate_flashloan_amount()` - Binary search optimization
  - `calculate_market_impact()` - Price impact calculation
  - `calculate_multihop_slippage()` - Multi-pool analysis
- ✅ Builds release binary with optimizations

**Step 6: Verification Script**
- ✅ Creates scripts/verify-setup.js
- ✅ Checks Node dependencies
- ✅ Checks Rust engine build
- ✅ Checks Python environment
- ✅ Validates directory structure
- ✅ Checks .env configuration

**Step 7: Monitoring Script**
- ✅ Creates scripts/monitor.js
- ✅ Live system monitoring (5s refresh)
- ✅ Displays uptime, memory, Node version
- ✅ Shows log files and latest entries
- ✅ Auto-refreshing dashboard

**Step 8: Benchmark Script**
- ✅ Creates scripts/benchmark.js
- ✅ Tests math operations (10,000 iterations)
- ✅ Tests array operations (1,000 iterations)
- ✅ Tests object creation (10,000 iterations)
- ✅ Reports throughput and timing

**Step 9: Production Runner**
- ✅ Creates src/apex-production-runner.js
- ✅ Validates environment configuration
- ✅ Connects to blockchain
- ✅ Graceful shutdown handling
- ✅ Main execution entry point

**Step 10: Final Verification**
- ✅ Runs complete system check
- ✅ Reports errors and warnings
- ✅ Confirms readiness for deployment

**Scripts Available After:**
- `yarn start` - Production runner
- `yarn run dev` - Development mode
- `yarn test` - Integration tests
- `yarn run deploy` - Deploy contracts
- `yarn run verify` - System verification
- `yarn run monitor` - Live monitoring
- `yarn run benchmark` - Performance tests
- `yarn run build:rust` - Build Rust engine
- `yarn run build:all` - Build all components
- `yarn run lint` - ESLint
- `yarn run format` - Prettier

## Technical Differences

### Package.json

**quickstart.sh:**
- Uses existing package.json
- Keeps current version number
- Preserves existing scripts
- Maintains current dependencies

**setup-apex.sh:**
- Creates new package.json v2.0.0
- Sets main to `apex-production-runner.js`
- Changes type to `commonjs`
- Adds APEX-specific dependencies:
  - web3 ^4.3.0
  - @openzeppelin/contracts ^5.0.1
  - sqlite3 ^5.1.6
  - winston ^3.11.0
  - express ^4.18.2
  - cors ^2.8.5

### Python Requirements

**quickstart.sh:**
- Uses root requirements.txt
- Exact versions (e.g., web3==6.11.3)
- Includes lightgbm, prometheus-client, psutil

**setup-apex.sh:**
- Creates python/requirements.txt
- Minimum versions (e.g., numpy>=1.24.0)
- Focused on core ML libraries
- Excludes monitoring libraries (can be added)

### Rust Engine

**quickstart.sh:**
- Builds existing Rust code if present
- No modifications to Cargo.toml or source
- Supports both src/rust and rust-engine locations

**setup-apex.sh:**
- Creates complete Rust engine from scratch
- Uses NAPI bindings for Node.js integration
- Package name: `math-engine`
- Library name: `math_engine`
- Includes 3 optimized functions
- Release profile with LTO, single codegen unit

## Migration Path

### From quickstart.sh to setup-apex.sh

If you've been using `quickstart.sh` and want to migrate to full APEX:

1. **Backup your current setup:**
   ```bash
   tar -czf apex-backup-$(date +%Y%m%d).tar.gz .
   ```

2. **Save your .env file:**
   ```bash
   cp .env .env.backup
   ```

3. **Run APEX setup:**
   ```bash
   ./setup-apex.sh
   ```

4. **Restore your .env:**
   ```bash
   cp .env.backup .env
   ```

5. **Verify everything works:**
   ```bash
   yarn run verify
   ```

### Coexistence

Both scripts can coexist:
- `quickstart.sh` - For quick updates
- `setup-apex.sh` - For complete rebuilds

The APEX setup doesn't remove legacy components, so you can still:
- Run legacy system: `yarn run legacy`
- Build legacy Rust: `yarn run build:rust-legacy`
- Use existing contracts and scripts

## Recommendations

### For Development:
- Use `quickstart.sh` for daily development
- Use `setup-apex.sh` when setting up new dev environments

### For Production:
- Use `setup-apex.sh` for initial deployment
- Use `quickstart.sh` for minor updates
- Re-run `setup-apex.sh` for major upgrades

### For CI/CD:
- Use `setup-apex.sh` in Docker builds
- Use `quickstart.sh` for dependency updates
- Run `yarn run verify` after either script

## Performance Impact

### Build Time Comparison

| Task | quickstart.sh | setup-apex.sh |
|------|--------------|---------------|
| Prerequisite checks | 5s | 10s |
| Directory creation | 1s | 5s |
| Node.js install | 60-120s | 60-120s |
| Python install | 30-60s | 30-60s |
| Rust build | 120-180s | 150-240s |
| Script creation | 0s | 10s |
| Verification | 0s | 15s |
| **Total** | **3-7 min** | **5-15 min** |

### Runtime Performance

Both scripts produce identical runtime performance:
- Rust engine speed: Same (optimized release build)
- Node.js performance: Same dependencies
- Python ML: Same libraries

The difference is only in setup convenience and completeness.

## Conclusion

Choose based on your needs:
- **Quick updates?** → `quickstart.sh`
- **Complete APEX build?** → `setup-apex.sh`
- **Production deployment?** → `setup-apex.sh`
- **Development iteration?** → `quickstart.sh`

Both scripts are maintained and supported. The APEX build provides additional tools and verification that are valuable for production deployments.
