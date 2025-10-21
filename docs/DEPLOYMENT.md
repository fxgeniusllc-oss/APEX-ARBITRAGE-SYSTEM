# APEX Arbitrage System - Deployment Guide

## 📋 Prerequisites

### System Requirements
- **OS:** Linux, macOS, or Windows with WSL2
- **CPU:** 4+ cores recommended (8+ for optimal performance)
- **RAM:** 8GB minimum, 16GB recommended
- **Storage:** 50GB+ available space
- **Network:** Stable internet connection with low latency

### Software Requirements
- **Node.js:** v18.0.0 or higher
- **Python:** v3.8 or higher
- **Rust:** Latest stable (optional but highly recommended)
- **Git:** For version control

## 🚀 Quick Start

### 1. Clone and Setup

```bash
# Clone the repository
git clone https://github.com/fxgeniusllc-oss/APEX-ARBITRAGE-SYSTEM.git
cd APEX-ARBITRAGE-SYSTEM

# Run quick start script
chmod +x quickstart.sh
./quickstart.sh
```

The quickstart script will:
- Check all dependencies
- Install Node.js packages
- Install Python packages
- Build Rust engine (if Rust is installed)
- Create configuration files
- Set up data directories

### 2. Configuration

#### Create .env File

Copy the example configuration:
```bash
cp .env.example .env
```

#### Configure RPC URLs

**Recommended:** Use premium RPC providers for best performance

**Alchemy (Recommended):**
```bash
# Get API keys from https://alchemy.com
POLYGON_RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/YOUR_API_KEY
ETHEREUM_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY
ARBITRUM_RPC_URL=https://arb-mainnet.g.alchemy.com/v2/YOUR_API_KEY
OPTIMISM_RPC_URL=https://opt-mainnet.g.alchemy.com/v2/YOUR_API_KEY
BASE_RPC_URL=https://base-mainnet.g.alchemy.com/v2/YOUR_API_KEY
```

**Alternative Providers:**
- Infura: https://infura.io
- QuickNode: https://quicknode.com
- Ankr: https://ankr.com

#### Configure Private Key

**⚠️ SECURITY WARNING:** Never commit your private key to version control!

```bash
# Export from MetaMask or other wallet
# Remove '0x' prefix
PRIVATE_KEY=your_64_character_hex_private_key_here
```

**Best Practices:**
- Use a dedicated wallet for the bot
- Start with a small amount for testing
- Never reuse keys across multiple services
- Consider using a hardware wallet for large amounts

#### Configure Execution Parameters

```bash
# Minimum profit to execute (USD)
MIN_PROFIT_USD=5

# Maximum gas price (Gwei) - won't trade if gas is higher
MAX_GAS_PRICE_GWEI=100

# Slippage tolerance (basis points, 50 = 0.5%)
SLIPPAGE_BPS=50

# Scan interval (milliseconds)
SCAN_INTERVAL=60000
```

#### Configure Safety Limits

```bash
# Stop if daily loss exceeds this amount
MAX_DAILY_LOSS=50

# Stop after this many consecutive failures
MAX_CONSECUTIVE_FAILURES=5

# Minimum time between trades (milliseconds)
MIN_TIME_BETWEEN_TRADES=30000
```

### 3. Deploy Smart Contract (Mainnet)

**Note:** Skip this step for testing. The system can run without deploying contracts.

```bash
# Compile contracts
yarn hardhat compile

# Deploy to Polygon
yarn hardhat run scripts/deploy.js --network polygon

# Save the contract address
CONTRACT_ADDRESS=0x... # From deployment output
```

Add the contract address to your .env:
```bash
echo "CONTRACT_ADDRESS=0x..." >> .env
```

### 4. Fund Your Wallet

#### Minimum Recommended Amounts

**Polygon (Primary Chain):**
- **MATIC for gas:** 10-20 MATIC (~$10-20)
- **Starting capital:** $100+ in stablecoins (USDC/USDT)

**Other Chains:**
- **Arbitrum:** 0.01-0.02 ETH for gas
- **Optimism:** 0.01-0.02 ETH for gas
- **Base:** 0.01-0.02 ETH for gas

**⚠️ Important:** Start small! Test with $100-500 before scaling up.

### 5. Start the System

```bash
# Start in foreground (for testing)
yarn start

# Or start in background with logs
nohup yarn start > logs/apex.log 2>&1 &
```

## 🔧 Advanced Configuration

### ML Model Configuration

```bash
# Enable ML filtering
ENABLE_ML_FILTERING=true

# Confidence threshold (0-1, higher = more selective)
ML_CONFIDENCE_THRESHOLD=0.8

# Model paths
XGBOOST_MODEL_PATH=data/models/xgboost_model.json
ONNX_MODEL_PATH=data/models/onnx_model.onnx
```

**Note:** Pre-trained models are not included. The system works without them but with reduced accuracy. See [ML_MODELS.md](./ML_MODELS.md) for training instructions.

### Multi-Chain Configuration

```bash
# Enable cross-chain arbitrage
ENABLE_CROSS_CHAIN=true

# Enable bridging protocols
ENABLE_LAYER_ZERO_BRIDGE=true
ENABLE_ACROSS_BRIDGE=true
```

### MEV Protection

```bash
# Use private transaction relays
USE_PRIVATE_RELAY=true

# Relay URLs
FLASHBOTS_RELAY_URL=https://relay.flashbots.net
EDEN_RELAY_URL=https://api.edennetwork.io/v1/rpc
```

### Monitoring & Alerts

#### Telegram Notifications

1. Create a bot with [@BotFather](https://t.me/botfather)
2. Get your chat ID from [@userinfobot](https://t.me/userinfobot)
3. Configure:

```bash
TELEGRAM_BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
TELEGRAM_CHAT_ID=123456789
ENABLE_TELEGRAM_ALERTS=true
```

## 🐳 Docker Deployment (Optional)

### Create Dockerfile

```dockerfile
FROM node:18-alpine

# Install Python
RUN apk add --no-cache python3 py3-pip

# Install Rust (optional)
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
ENV PATH="/root/.cargo/bin:${PATH}"

WORKDIR /app

# Copy package files
COPY package.json yarn.lock requirements.txt ./

# Install dependencies
RUN yarn install --frozen-lockfile
RUN pip3 install -r requirements.txt

# Copy application files
COPY . .

# Build Rust engine
RUN cd src/rust && cargo build --release

EXPOSE 3000

CMD ["yarn", "start"]
```

### Build and Run

```bash
# Build image
docker build -t apex-arbitrage .

# Run container
docker run -d \
  --name apex-bot \
  --env-file .env \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/logs:/app/logs \
  apex-arbitrage
```

## 🔍 Monitoring

### View Dashboard

The system displays a real-time dashboard in the terminal showing:
- Execution statistics
- Profit/loss metrics
- System status
- Active components

### Check Logs

```bash
# View real-time logs
tail -f logs/$(date +%Y-%m-%d).log

# Search for errors
grep ERROR logs/*.log
```

### Query Database

```bash
# Install SQLite CLI
sudo apt-get install sqlite3

# Query executions
sqlite3 data/apex.db "SELECT * FROM executions ORDER BY timestamp DESC LIMIT 10;"

# Get statistics
sqlite3 data/apex.db "SELECT * FROM daily_stats WHERE date = date('now');"
```

## 🛡️ Security Best Practices

### 1. Wallet Security
- Use a dedicated wallet
- Never share private keys
- Enable hardware wallet for large amounts
- Regularly rotate keys

### 2. Server Security
- Use SSH keys (disable password auth)
- Enable firewall (ufw/iptables)
- Keep system updated
- Use fail2ban for intrusion prevention

### 3. Application Security
- Set proper file permissions: `chmod 600 .env`
- Use environment variables, never hardcode secrets
- Enable audit logging
- Regular security updates

### 4. Network Security
- Use VPN for sensitive operations
- Whitelist IP addresses at RPC providers
- Monitor for unusual activity
- Rate limit API access

## 📊 Performance Optimization

### 1. RPC Optimization
- Use premium RPC providers
- Enable connection pooling
- Use WebSocket for mempool monitoring
- Implement retry logic with exponential backoff

### 2. System Optimization
```bash
# Increase file descriptor limits
ulimit -n 65535

# Optimize network settings
sudo sysctl -w net.ipv4.tcp_fin_timeout=30
sudo sysctl -w net.ipv4.tcp_keepalive_time=1200
```

### 3. Database Optimization
- Regular vacuum: `sqlite3 data/apex.db "VACUUM;"`
- Analyze tables: `sqlite3 data/apex.db "ANALYZE;"`
- Archive old data periodically

## 🔄 Updating

```bash
# Pull latest changes
git pull origin main

# Reinstall dependencies
yarn install
pip3 install -r requirements.txt

# Rebuild Rust engine
cd src/rust && cargo build --release && cd ../..

# Restart system
pm2 restart apex-bot
```

## 🆘 Troubleshooting

See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for common issues and solutions.

## 📞 Support

- Documentation: [docs/](./docs/)
- Issues: GitHub Issues
- Community: Discord (coming soon)

## ⚠️ Legal Disclaimer

This software is provided for educational purposes only. Cryptocurrency trading involves substantial risk. Only trade with capital you can afford to lose. The authors are not liable for any financial losses.

**Always comply with local laws and regulations.**
