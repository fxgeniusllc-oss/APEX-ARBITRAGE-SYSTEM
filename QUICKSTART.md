# ⚡ APEX Arbitrage System - Quick Start Guide

Get up and running in under 15 minutes with the one-click installer!

## 🎯 TL;DR - Fastest Way to Start

```bash
git clone https://github.com/fxgeniusllc-oss/APEX-ARBITRAGE-SYSTEM.git
cd APEX-ARBITRAGE-SYSTEM
chmod +x install-and-run.sh
./install-and-run.sh
```

That's it! The script handles everything automatically.

---

## 📋 Step-by-Step Quick Start

### Step 1: Clone the Repository (30 seconds)

```bash
git clone https://github.com/fxgeniusllc-oss/APEX-ARBITRAGE-SYSTEM.git
cd APEX-ARBITRAGE-SYSTEM
```

### Step 2: Run One-Click Installer (5-15 minutes)

```bash
chmod +x install-and-run.sh
./install-and-run.sh
```

The installer will:
- ✅ Check prerequisites (Node.js, Python, Rust)
- ✅ Auto-install anything missing
- ✅ Install all dependencies
- ✅ Build Rust engine
- ✅ Create configuration files
- ✅ Validate installation
- ✅ Optionally run tests
- ✅ Optionally start the system

**Interactive prompts**: You'll only be asked twice:
1. Whether to run tests (optional)
2. Whether to start the system (optional)

### Step 3: Configure (2 minutes)

Edit the `.env` file with your settings:

```bash
nano .env
```

**Minimum required settings:**
```bash
POLYGON_RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/YOUR_KEY
PRIVATE_KEY=your_private_key_without_0x
```

**Recommended settings:**
```bash
MIN_PROFIT_USD=5                    # Minimum profit threshold
MAX_GAS_PRICE_GWEI=100              # Maximum gas price
SLIPPAGE_BPS=50                     # 0.5% slippage tolerance
```

### Step 4: Verify Installation (30 seconds)

```bash
npm run validate
```

Expected output:
```
✅ ALL CHECKS PASSED - System is ready!
```

### Step 5: Start Trading (1 second)

```bash
npm start
```

The system will begin monitoring for arbitrage opportunities!

---

## 🚀 What Happens Next?

Once the system starts, it will:

1. **Connect to Blockchain** - Establishes connection via your RPC URL
2. **Load Configuration** - Reads trading parameters from .env
3. **Initialize AI Engine** - Loads ML models for opportunity prediction
4. **Start Monitoring** - Begins scanning DEX pairs for arbitrage
5. **Display Dashboard** - Shows live status and statistics

### Live Dashboard

You'll see something like this:

```
═══════════════════════════════════════════════════════════════
         APEX ARBITRAGE SYSTEM - LIVE STATUS
═══════════════════════════════════════════════════════════════

📊 EXECUTION STATS
   Total Executions: 0
   Successful: 0
   Success Rate: N/A
   Consecutive Failures: 0

💰 PROFIT/LOSS (24h)
   Total Profit: $0.00
   Total Loss: $0.00
   Net P/L: $0.00

⛽ MARKET CONDITIONS
   Gas Price: 45.2 Gwei
   MATIC Price: $0.847
   Max Gas: 100 Gwei

🎯 SCANNING ROUTES
   Monitoring 12 arbitrage routes...

⏰ LAST SCAN: Just started
💾 Next scan in: 60s
═══════════════════════════════════════════════════════════════
```

---

## 🔧 Common Commands

After installation, use these commands:

```bash
# Start the system
npm start

# Start with AI engine
npm run start:all

# Run in development mode
npm run dev

# Verify installation
npm run validate

# Check system health
npm run health

# View logs
npm run logs

# Run tests
npm test

# Deploy contracts
npm run deploy

# Dry run (no execution)
npm run dryrun
```

---

## ⚡ Advanced Quick Start

For experienced users:

```bash
# Clone and navigate
git clone https://github.com/fxgeniusllc-oss/APEX-ARBITRAGE-SYSTEM.git && cd APEX-ARBITRAGE-SYSTEM

# Install and configure in one go
chmod +x install-and-run.sh && \
./install-and-run.sh && \
cp .env.example .env && \
nano .env

# Validate and start
npm run validate && npm start
```

---

## 🛑 Stopping the System

To stop the system safely:

1. Press `Ctrl+C` in the terminal
2. Wait for graceful shutdown message
3. System will save all data and exit cleanly

Emergency stop:
```bash
touch EMERGENCY_STOP
```

---

## 📊 Monitoring Your System

### Real-time Monitoring

```bash
npm run monitor
```

### View Logs

```bash
# Follow live logs
npm run logs

# View specific log file
tail -f logs/$(date +%Y-%m-%d).log
```

### Check Performance

```bash
# Run benchmarks
npm run benchmark

# System health check
npm run health
```

---

## 🎓 Next Steps

Now that your system is running:

1. **Monitor Performance** - Watch for the first 24 hours
2. **Read Documentation** - Check [README.md](README.md) for details
3. **Optimize Settings** - Tune parameters based on results
4. **Enable Notifications** - Set up Telegram alerts (optional)
5. **Scale Up** - Increase trading amounts gradually

---

## ❓ Troubleshooting

### Installation Issues

If installation fails, try:

```bash
# Run validation to see what's wrong
npm run validate

# Check test script
./test-installer.sh

# Review full installation guide
# See INSTALLATION-GUIDE.md
```

### System Won't Start

Common fixes:

```bash
# Check .env configuration
cat .env

# Verify all dependencies
npm run validate

# Check for missing directories
ls -la data logs

# Review error logs
cat logs/error.log
```

### No Opportunities Found

This is normal if:
- Market is not volatile
- Gas prices are high
- Competition is intense

Solutions:
- Lower `MIN_PROFIT_USD` (carefully)
- Wait for better market conditions
- Check your RPC connection

---

## 🆘 Getting Help

- **Documentation**: [README.md](README.md)
- **Installation**: [INSTALLATION-GUIDE.md](INSTALLATION-GUIDE.md)
- **Troubleshooting**: [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)
- **GitHub Issues**: Open an issue with details

---

## ✅ Success Indicators

You'll know the system is working when you see:

- ✅ Dashboard updates every minute
- ✅ Gas price monitoring active
- ✅ Route scanning in progress
- ✅ No error messages in logs
- ✅ Validation passes (`npm run validate`)

---

## 🎉 You're Ready!

Congratulations! Your APEX Arbitrage System is now running and monitoring for profitable opportunities.

**Important Reminders:**
- Start with testnet for practice
- Monitor closely for the first 24 hours
- Keep your private keys secure
- Never commit .env to version control
- Start with small amounts

Happy Trading! 🚀💰

---

**Total Time to Get Running**: 10-20 minutes  
**Difficulty**: Easy (automated installation)  
**Prerequisites**: None (auto-installed)
