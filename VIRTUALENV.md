# Python Virtual Environment Guide

## Overview

The APEX Arbitrage System uses a Python virtual environment (`.venv/`) to manage Python dependencies. This ensures:

- **Isolated Dependencies**: Python packages don't conflict with system packages
- **Maturin Compatibility**: Tools like maturin (for Rust-Python bindings) require a virtual environment
- **Reproducible Environment**: Consistent dependencies across different machines
- **Clean System**: No pollution of global Python environment

## Automatic Setup

All installation scripts automatically create and use the virtual environment:

- `./install-and-run.sh` - One-click installer
- `./setup-apex.sh` - Complete APEX build
- `./quickstart.sh` - Quick dependency update

You don't need to do anything manually - the virtual environment is created and activated automatically when needed.

## Manual Activation

If you need to run Python commands manually (outside of yarn scripts), activate the virtual environment:

### Method 1: Using the helper script (Recommended)

```bash
source activate-venv.sh
```

### Method 2: Direct activation

```bash
source .venv/bin/activate
```

### Verification

After activation, verify it's working:

```bash
which python
# Should output: /path/to/project/.venv/bin/python

echo $VIRTUAL_ENV
# Should output: /path/to/project/.venv
```

### Deactivation

When you're done:

```bash
deactivate
```

## Yarn Scripts

All yarn scripts that run Python code automatically activate the virtual environment. No manual activation needed:

```bash
yarn start:python      # Automatically activates venv
yarn ai:start         # Automatically activates venv
yarn dryrun           # Automatically activates venv
yarn health           # Automatically activates venv
```

## Testing the Virtual Environment

Run the validation test to ensure everything is set up correctly:

```bash
./test-venv.sh
```

This will check:
- ✅ Virtual environment exists
- ✅ Can be activated
- ✅ VIRTUAL_ENV variable is set
- ✅ Python is from the virtual environment
- ✅ pip is from the virtual environment
- ✅ Package installation works

## Troubleshooting

### Virtual Environment Not Found

If you get an error about the virtual environment not existing:

```bash
# Recreate it
python3 -m venv .venv

# Install dependencies
source .venv/bin/activate
pip install -r requirements.txt
deactivate
```

### Maturin Error

If you still get a maturin error about virtual environment:

1. Make sure the virtual environment is activated:
   ```bash
   source .venv/bin/activate
   echo $VIRTUAL_ENV  # Should not be empty
   ```

2. Try building with maturin explicitly using the virtual environment:
   ```bash
   source .venv/bin/activate
   cd src/rust
   maturin develop  # or maturin build
   ```

3. Ensure maturin is installed in the virtual environment:
   ```bash
   source .venv/bin/activate
   pip install maturin
   ```

### Permission Issues

If you get permission errors:

```bash
# Remove and recreate the virtual environment
rm -rf .venv
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Installing Additional Python Packages

Always activate the virtual environment first:

```bash
source .venv/bin/activate
pip install package-name
deactivate
```

Or use the requirements.txt file:

```bash
# Add package to requirements.txt
echo "package-name>=1.0.0" >> requirements.txt

# Install
source .venv/bin/activate
pip install -r requirements.txt
deactivate
```

## IDE Configuration

### VS Code

Add to `.vscode/settings.json`:

```json
{
  "python.defaultInterpreterPath": "${workspaceFolder}/.venv/bin/python",
  "python.terminal.activateEnvironment": true
}
```

### PyCharm

1. Go to Settings → Project → Python Interpreter
2. Click gear icon → Add
3. Select "Existing environment"
4. Browse to `.venv/bin/python`

## CI/CD Integration

For GitHub Actions or other CI/CD:

```yaml
- name: Set up Python virtual environment
  run: |
    python3 -m venv .venv
    source .venv/bin/activate
    pip install -r requirements.txt

- name: Run Python scripts
  run: |
    source .venv/bin/activate
    python your_script.py
```

## Best Practices

1. **Never commit** the `.venv/` directory (it's already in `.gitignore`)
2. **Always use** the virtual environment for Python commands
3. **Update requirements.txt** when adding new packages
4. **Recreate** the virtual environment if you encounter issues
5. **Test** with `./test-venv.sh` after setup changes

## See Also

- [Installation Guide](INSTALLATION-GUIDE.md) - Complete installation instructions
- [README](README.md) - Main project documentation
- [QUICKSTART](QUICKSTART.md) - Quick start guide
