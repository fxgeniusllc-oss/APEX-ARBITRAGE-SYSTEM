# Quick Start Guide: Execution Modes

## 🚀 Get Started in 3 Steps

### Step 1: Configure Your Mode

Edit `.env` file:
```bash
# Choose one:
MODE=DEV   # ← Start here (safe, no risk)
MODE=SIM   # For backtesting
MODE=LIVE  # Production (after testing!)
```

### Step 2: Set Your Parameters

```bash
# Basic settings
MIN_PROFIT_USD=5
MAX_GAS_PRICE_GWEI=100
SLIPPAGE_BPS=50

# Add your RPC URLs
POLYGON_RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/YOUR_KEY
PRIVATE_KEY=your_private_key_here
```

### Step 3: Run the System

```bash
# Install dependencies (first time only)
yarn install
pip install -r requirements.txt

# Start the system
yarn start

# Or run Python orchestrator
python src/python/integrated_orchestrator.py
```

## 🎯 Mode Quick Reference

| Need to... | Use Mode | Risk | Command |
|------------|----------|------|---------|
| Test safely | `DEV` | None ✅ | `MODE=DEV yarn start` |
| Backtest strategy | `SIM` | None ✅ | `MODE=SIM yarn start` |
| Trade for real | `LIVE` | High 🔴 | `MODE=LIVE yarn start` |

## 📋 Pre-Launch Checklist

### Before Going LIVE:

- [ ] ✅ Tested in DEV mode for at least 24 hours
- [ ] ✅ Backtested in SIM mode
- [ ] ✅ Verified all RPC connections work
- [ ] ✅ Confirmed wallet has sufficient balance (10+ MATIC recommended)
- [ ] ✅ Set conservative profit thresholds (MIN_PROFIT_USD=10+)
- [ ] ✅ Configured safety limits
- [ ] ✅ Set up monitoring/alerts
- [ ] ✅ Reviewed and understood all logs

## 🔍 Quick Troubleshooting

### "Not executing trades"
→ Check your MODE setting: `grep MODE .env`
→ In DEV/SIM, trades are simulated only

### "Invalid MODE error"
→ Valid modes: LIVE, DEV, SIM (case-insensitive)
→ Check `.env` file has correct spelling

### "Want to test safely"
→ Use: `MODE=DEV yarn start`
→ This is the DEFAULT and safest option

## 🎓 Learning Path

### Day 1-3: Learn in DEV Mode
```bash
MODE=DEV yarn start
```
- Observe opportunities
- Watch simulation logs
- Learn the system behavior
- Experiment freely (no risk!)

### Day 4-7: Validate in SIM Mode
```bash
MODE=SIM yarn start
```
- Backtest your strategies
- Analyze performance metrics
- Review profit potential
- Validate edge cases

### Day 8+: Deploy to LIVE (if ready)
```bash
MODE=LIVE MIN_PROFIT_USD=10 yarn start
```
- Start with high profit threshold
- Monitor very closely
- Keep DEV instance running in parallel
- Scale gradually

## 💡 Pro Tips

1. **Always start with DEV**: No exceptions
2. **Keep a DEV instance running**: Test changes before deploying
3. **Use higher thresholds in LIVE**: Start conservative
4. **Monitor closely**: Check logs and dashboard frequently
5. **Scale gradually**: Small trades first, then increase

## 📊 What You'll See

### DEV Mode Dashboard:
```
🎛️  EXECUTION MODE
   🟡 DEV MODE - Simulates transactions (dry-run)

📊 EXECUTION STATS
   Simulated Executions: 23
   Simulated Profit: $245.50
   (No real funds at risk)
```

### LIVE Mode Dashboard:
```
🎛️  EXECUTION MODE
   🔴 LIVE MODE - Real transactions executed

📊 EXECUTION STATS
   Real Executions: 15
   Real Profit: $127.30
   (Real funds at stake)
```

## 🆘 Need Help?

1. **Review docs**: `docs/MODE_CONFIGURATION_GUIDE.md`
2. **Check logs**: `tail -f logs/system.log`
3. **Test in DEV**: Always safe to experiment
4. **Read features**: `FEATURES_SUMMARY.md`

## ⚡ One-Liners

```bash
# Quick DEV test
MODE=DEV yarn start

# Check current mode
echo $MODE

# Override mode temporarily
MODE=SIM yarn run verify

# See all opportunities (DEV mode)
MODE=DEV yarn start | grep "Opportunity"

# Monitor logs
tail -f logs/system.log | grep -i "mode\|profit\|execute"
```

## 🔒 Safety Reminders

1. ⚠️ LIVE mode uses real money
2. ⚠️ Always test in DEV first
3. ⚠️ Never commit `.env` with real credentials
4. ⚠️ Start with small amounts in LIVE
5. ⚠️ Monitor closely when live

## 🎉 You're Ready!

Start with:
```bash
MODE=DEV yarn start
```

Watch it run, learn the system, then decide when to go LIVE.

**Remember**: There's no rush. Testing thoroughly in DEV/SIM saves money and stress! 

---

**Questions?** Check `docs/MODE_CONFIGURATION_GUIDE.md` for detailed information.
