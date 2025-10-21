# APEX Arbitrage System - Troubleshooting Guide

## 🔍 Common Issues and Solutions

### Installation Issues

#### Issue: "Node.js not found"
**Symptoms:**
```
bash: node: command not found
```

**Solution:**
1. Install Node.js 18+:
```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# macOS
brew install node

# Windows
# Download from https://nodejs.org
```

2. Verify installation:
```bash
node --version  # Should show v18.x.x or higher
```

#### Issue: "Python 3 not found"
**Symptoms:**
```
python3: command not found
```

**Solution:**
```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install python3 python3-pip

# macOS
brew install python3

# Verify
python3 --version  # Should show 3.8 or higher
```

#### Issue: "Rust not installed"
**Symptoms:**
```
cargo: command not found
```

**Solution:**
```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Add to PATH
source $HOME/.cargo/env

# Verify
cargo --version
```

#### Issue: "npm install fails"
**Symptoms:**
```
npm ERR! code EACCES
npm ERR! syscall access
```

**Solution:**
1. Fix npm permissions:
```bash
# Create npm directory
mkdir ~/.npm-global

# Configure npm
npm config set prefix '~/.npm-global'

# Add to PATH
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc

# Try again
npm install
```

2. Or use sudo (not recommended):
```bash
sudo npm install --unsafe-perm=true
```

---

### Configuration Issues

#### Issue: "Invalid RPC URL"
**Symptoms:**
```
Error: could not detect network
Error: invalid url
```

**Solution:**
1. Check .env file has correct RPC URLs:
```bash
cat .env | grep RPC_URL
```

2. Test RPC connection:
```bash
curl -X POST \
  -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
  $POLYGON_RPC_URL
```

3. Get new RPC URLs:
- **Alchemy:** https://alchemy.com (recommended)
- **Infura:** https://infura.io
- **Public RPCs:** https://chainlist.org

#### Issue: "Private key error"
**Symptoms:**
```
Error: invalid private key
Error: invalid hex string
```

**Solution:**
1. Check private key format:
   - Must be 64 hex characters
   - NO "0x" prefix
   - Example: `abcd1234...` (not `0xabcd1234...`)

2. Export from MetaMask:
   - Account Details → Export Private Key
   - Remove "0x" prefix when adding to .env

3. Verify .env format:
```bash
PRIVATE_KEY=your64characterhexprivatekeyhere
```

#### Issue: "Permission denied: .env"
**Symptoms:**
```
Error: EACCES: permission denied, open '.env'
```

**Solution:**
```bash
# Set correct permissions
chmod 600 .env

# Verify
ls -la .env
# Should show: -rw------- (only owner can read/write)
```

---

### Execution Issues

#### Issue: "No profitable opportunities found"
**Symptoms:**
- Dashboard shows 0 opportunities
- No executions happening

**Possible Causes & Solutions:**

1. **Gas prices too high**
   ```bash
   # Check current gas price
   # Increase MAX_GAS_PRICE_GWEI in .env
   MAX_GAS_PRICE_GWEI=150
   ```

2. **Profit threshold too high**
   ```bash
   # Lower minimum profit
   MIN_PROFIT_USD=3
   ```

3. **Low market volatility**
   - Normal during low-volume periods
   - Wait for market activity
   - Consider other chains

4. **RPC rate limiting**
   - Upgrade to paid RPC plan
   - Add multiple RPC endpoints
   - Increase SCAN_INTERVAL

#### Issue: "Transaction reverted"
**Symptoms:**
```
Error: execution reverted
Transaction failed with status 0
```

**Causes & Solutions:**

1. **Price moved (slippage)**
   ```bash
   # Increase slippage tolerance
   SLIPPAGE_BPS=100  # 1% instead of 0.5%
   ```

2. **Insufficient liquidity**
   - Reduce trade size
   - Focus on high-liquidity pools
   - Avoid low-volume pairs

3. **Gas estimation error**
   ```bash
   # Increase gas limit buffer
   # In contract: increase gasEstimate by 20%
   ```

4. **Frontrun by MEV bot**
   - Enable private relay:
   ```bash
   USE_PRIVATE_RELAY=true
   ```

#### Issue: "Insufficient funds for gas"
**Symptoms:**
```
Error: insufficient funds for intrinsic transaction cost
```

**Solution:**
1. Check wallet balance:
```bash
# Run verification script
npm run verify
```

2. Add more gas tokens:
   - Polygon: Need 10+ MATIC
   - Ethereum: Need 0.1+ ETH
   - Arbitrum: Need 0.05+ ETH

3. Calculate required amount:
```
Required MATIC = (avg gas * avg gas price * trades per day) / 1e9
Example: (400000 * 30 * 100) / 1e9 = 1.2 MATIC/day
```

#### Issue: "Nonce too low"
**Symptoms:**
```
Error: nonce has already been used
Error: replacement transaction underpriced
```

**Solution:**
1. Wait for pending transactions to confirm
2. Reset nonce (if stuck):
```bash
# In ethers.js
const nonce = await provider.getTransactionCount(wallet.address, 'pending');
```

3. Clear transaction queue:
```bash
# Send 0 ETH to yourself with higher gas
```

---

### Performance Issues

#### Issue: "Slow scanning"
**Symptoms:**
- Scans taking > 1 second
- Missing opportunities

**Solutions:**

1. **Build Rust engine:**
   ```bash
   cd src/rust
   cargo build --release
   cd ../..
   ```

2. **Use better RPC:**
   - Switch to Alchemy or QuickNode
   - Enable WebSocket connections
   - Use geographically closer RPC

3. **Optimize system:**
   ```bash
   # Increase file descriptors
   ulimit -n 65535
   
   # Check CPU usage
   htop
   ```

4. **Reduce scan scope:**
   ```bash
   # Focus on fewer chains initially
   # Disable cross-chain in .env
   ENABLE_CROSS_CHAIN=false
   ```

#### Issue: "High memory usage"
**Symptoms:**
- System slowing down
- OOM errors

**Solutions:**

1. **Limit historical data:**
   ```bash
   # Clean old database entries
   npm run cleanup
   ```

2. **Reduce pool cache:**
   ```javascript
   // In config: reduce cached pools
   MAX_CACHED_POOLS=1000
   ```

3. **Restart periodically:**
   ```bash
   # Use PM2 for auto-restart
   pm2 start src/index.js --name apex-bot --max-memory-restart 1G
   ```

---

### Database Issues

#### Issue: "Database locked"
**Symptoms:**
```
Error: database is locked
SqliteError: SQLITE_BUSY
```

**Solution:**
1. Enable WAL mode (should be automatic):
```bash
sqlite3 data/apex.db "PRAGMA journal_mode=WAL;"
```

2. Increase timeout:
```javascript
const db = new Database('data/apex.db', { timeout: 10000 });
```

3. Check for stuck processes:
```bash
lsof | grep apex.db
```

#### Issue: "Corrupted database"
**Symptoms:**
```
Error: database disk image is malformed
```

**Solution:**
1. Backup current database:
```bash
cp data/apex.db data/apex.db.backup
```

2. Try to recover:
```bash
sqlite3 data/apex.db ".dump" | sqlite3 data/apex_recovered.db
mv data/apex_recovered.db data/apex.db
```

3. If recovery fails, reinitialize:
```bash
rm data/apex.db
npm start  # Will create new database
```

---

### Smart Contract Issues

#### Issue: "Contract deployment failed"
**Symptoms:**
```
Error: transaction failed
Error: insufficient funds
```

**Solutions:**

1. **Check network:**
```bash
# Verify you're on correct network
npx hardhat run scripts/deploy.js --network polygon
```

2. **Ensure sufficient funds:**
   - Need ~0.5 MATIC for deployment
   - Check balance:
   ```bash
   npx hardhat console --network polygon
   > (await ethers.provider.getBalance(deployer.address))
   ```

3. **Increase gas limit:**
```javascript
// In deploy.js
const contract = await ApexFlashArbitrage.deploy({
  gasLimit: 5000000
});
```

#### Issue: "Contract call failed"
**Symptoms:**
```
Error: call revert exception
```

**Solutions:**

1. **Check contract ownership:**
```javascript
const owner = await contract.owner();
console.log('Owner:', owner);
console.log('Caller:', wallet.address);
```

2. **Verify parameters:**
```javascript
// Check min profit
const minProfit = await contract.minProfitBps();
console.log('Min profit (bps):', minProfit.toString());
```

3. **Test with hardhat:**
```bash
npx hardhat test
```

---

### ML Model Issues

#### Issue: "ML models not loading"
**Symptoms:**
```
Warning: Could not load ML models
FileNotFoundError: model file not found
```

**Solution:**
1. This is expected - models not included in repo
2. System works without ML (reduced accuracy)
3. To train models, see [ML_MODELS.md](./ML_MODELS.md)
4. Or disable ML:
```bash
ENABLE_ML_FILTERING=false
```

---

### Network Issues

#### Issue: "Connection timeout"
**Symptoms:**
```
Error: timeout exceeded
Error: network timeout
```

**Solutions:**

1. **Check internet connection:**
```bash
ping 8.8.8.8
```

2. **Test RPC endpoint:**
```bash
curl -v $POLYGON_RPC_URL
```

3. **Use backup RPCs:**
```bash
# Add multiple RPC URLs
POLYGON_RPC_URL=https://primary-rpc.com
POLYGON_RPC_BACKUP=https://backup-rpc.com
```

4. **Increase timeout:**
```javascript
const provider = new ethers.JsonRpcProvider(url, {
  timeout: 30000  // 30 seconds
});
```

---

## 🆘 Getting Help

### Before Asking for Help

1. **Check logs:**
```bash
tail -100 logs/$(date +%Y-%m-%d).log
```

2. **Check system resources:**
```bash
# CPU and memory
htop

# Disk space
df -h

# Network
netstat -an | grep ESTABLISHED
```

3. **Test components individually:**
```bash
# Test Node.js
node -e "console.log('Node works')"

# Test Python
python3 -c "print('Python works')"

# Test Rust
cargo --version
```

### Reporting Issues

When reporting issues, include:

1. **System information:**
```bash
uname -a
node --version
python3 --version
cargo --version
```

2. **Error logs:**
```bash
# Last 50 lines
tail -50 logs/$(date +%Y-%m-%d).log
```

3. **Configuration (sanitized):**
```bash
# Remove private keys!
cat .env | grep -v PRIVATE_KEY
```

4. **Steps to reproduce**

5. **Expected vs actual behavior**

### Community Support

- **GitHub Issues:** For bug reports
- **GitHub Discussions:** For questions
- **Discord:** Coming soon

---

## ⚠️ Emergency Procedures

### Emergency Stop

1. **Create stop file:**
```bash
touch EMERGENCY_STOP
```

2. **Kill process:**
```bash
pkill -f "node src/index.js"
# or
pm2 stop apex-bot
```

3. **Withdraw funds:**
```bash
# Use contract function
npx hardhat console --network polygon
> const contract = await ethers.getContractAt('ApexFlashArbitrage', 'ADDRESS')
> await contract.emergencyWithdraw('TOKEN_ADDRESS')
```

### Recovery Checklist

- [ ] Stop the bot
- [ ] Check wallet balances
- [ ] Review last transactions
- [ ] Check logs for errors
- [ ] Verify contract state
- [ ] Test with small amounts before resuming
