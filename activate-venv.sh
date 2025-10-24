#!/bin/bash

# Helper script to activate Python virtual environment
# Usage: source activate-venv.sh

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
VENV_PATH="$SCRIPT_DIR/.venv"

if [ -d "$VENV_PATH" ]; then
    echo "Activating Python virtual environment..."
    source "$VENV_PATH/bin/activate"
    echo "✅ Virtual environment activated"
    echo "Python: $(which python)"
    echo "To deactivate: run 'deactivate'"
else
    echo "❌ Virtual environment not found at $VENV_PATH"
    echo "Run './install-and-run.sh' or './setup-apex.sh' to create it"
    return 1
fi
