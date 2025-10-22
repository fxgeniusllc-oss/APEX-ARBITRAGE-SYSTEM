# 🚀 One-Click Installation

## The Easiest Way to Get Started

Install and run the complete APEX Arbitrage System with **one command**:

```bash
./install-and-run.sh
```

## What This Does

The script automatically:

1. ✅ **Checks** for Node.js, Python, and Rust
2. ✅ **Installs** any missing prerequisites
3. ✅ **Installs** all dependencies (Node + Python)
4. ✅ **Builds** Rust calculation engine
5. ✅ **Creates** configuration files
6. ✅ **Validates** installation
7. ✅ **Tests** (optional - you'll be asked)
8. ✅ **Starts** the system (optional - you'll be asked)

## Installation Time

- **Fresh installation**: 5-15 minutes
- **Existing installation update**: 2-5 minutes
- **User interaction**: Minimal (only 2 optional prompts)

## Supported Platforms

- ✅ Linux (Ubuntu, Debian, CentOS, etc.)
- ✅ macOS (with Homebrew)
- ✅ WSL2 (Windows Subsystem for Linux)

## After Installation

1. **Configure your environment**:
   ```bash
   nano .env
   ```
   Add your RPC URLs and private key

2. **Verify everything works**:
   ```bash
   yarn run validate
   ```

3. **Start trading**:
   ```bash
   yarn start
   ```

## Documentation

- 📖 [Quick Start Guide](../QUICKSTART.md)
- 📥 [Installation Guide](../INSTALLATION-GUIDE.md)
- ✅ [Implementation Summary](../ONE-CLICK-INSTALL-SUMMARY.md)

## Need Help?

- Run `./test-installer.sh` to check installer components
- Run `yarn run validate` to check your installation
- See [INSTALLATION-GUIDE.md](../INSTALLATION-GUIDE.md) for troubleshooting

---

**That's it!** One command installs everything. 🎉
