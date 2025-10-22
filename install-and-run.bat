@echo off
REM ═══════════════════════════════════════════════════════════════════════════
REM APEX ARBITRAGE SYSTEM - ONE CLICK INSTALL AND RUN (WINDOWS)
REM ═══════════════════════════════════════════════════════════════════════════
REM This batch file will:
REM 1. Check and install all prerequisites
REM 2. Install all dependencies
REM 3. Build all components
REM 4. Set up configuration
REM 5. Validate installation
REM 6. Start the system
REM ═══════════════════════════════════════════════════════════════════════════

SETLOCAL EnableDelayedExpansion

echo.
echo ═══════════════════════════════════════════════════════════════════════════
echo          APEX ARBITRAGE SYSTEM - ONE CLICK INSTALL ^& RUN (WINDOWS)
echo ═══════════════════════════════════════════════════════════════════════════
echo.
echo This script will install all prerequisites, dependencies, build all
echo components, configure the system, and start it running.
echo.

REM ═══════════════════════════════════════════════════════════════════════════
REM STEP 1: CHECK AND INSTALL PREREQUISITES
REM ═══════════════════════════════════════════════════════════════════════════

echo [1/9] Checking and installing prerequisites...
echo.

REM Check Node.js
echo Checking Node.js...
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js not found!
    echo.
    echo Please install Node.js v18 or higher from https://nodejs.org/
    echo.
    echo After installation, restart this script.
    pause
    exit /b 1
)

REM Get Node.js version
for /f "tokens=1" %%i in ('node -v') do set NODE_VERSION=%%i
echo [OK] Node.js %NODE_VERSION%

REM Check if Node.js version is 18+
set NODE_MAJOR=%NODE_VERSION:v=%
for /f "tokens=1 delims=." %%i in ("%NODE_MAJOR%") do set NODE_MAJOR=%%i
if %NODE_MAJOR% LSS 18 (
    echo [ERROR] Node.js v18+ required. Current: %NODE_VERSION%
    echo Please upgrade Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Check yarn
where yarn >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [OK] yarn already installed
    goto :yarn_ready
)

REM If yarn not found, try to enable corepack
echo [INFO] yarn not found, enabling corepack...
call corepack enable
call corepack prepare yarn@stable --activate

:yarn_ready
echo [OK] yarn



REM Check Python
echo.
echo Checking Python...
where python >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [WARN] Python not found!
    echo.
    echo Python 3.8+ is recommended for ML features.
    echo Download from: https://www.python.org/downloads/
    echo.
    echo You can continue without Python, but ML features will be disabled.
    choice /C YN /M "Continue without Python"
    if errorlevel 2 exit /b 1
    set SKIP_PYTHON=1
) else (
    for /f "tokens=2" %%i in ('python --version 2^>^&1') do set PYTHON_VERSION=%%i
    echo [OK] Python !PYTHON_VERSION!
    set SKIP_PYTHON=0
)

REM Check Git
echo.
echo Checking Git...
where git >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [WARN] Git not found!
    echo Git is recommended but not required.
    echo Download from: https://git-scm.com/download/win
) else (
    for /f "tokens=3" %%i in ('git --version') do set GIT_VERSION=%%i
    echo [OK] Git !GIT_VERSION!
)

echo.
echo [OK] All required prerequisites are installed!
echo.
timeout /t 2 >nul

REM ═══════════════════════════════════════════════════════════════════════════
REM STEP 2: INSTALL NODE.JS DEPENDENCIES
REM ═══════════════════════════════════════════════════════════════════════════

echo [2/9] Installing Node.js dependencies...
echo.

if not exist package.json (
    echo [ERROR] package.json not found!
    echo Please run this script from the APEX-ARBITRAGE-SYSTEM directory.
    pause
    exit /b 1
)

echo Installing Node.js packages (this may take a few minutes)...
call yarn install --network-timeout 600000
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to install Node.js dependencies with yarn
    pause
    exit /b 1
)

echo.
echo [OK] Node.js dependencies installed successfully!
echo.
timeout /t 2 >nul

REM ═══════════════════════════════════════════════════════════════════════════
REM STEP 3: INSTALL PYTHON DEPENDENCIES
REM ═══════════════════════════════════════════════════════════════════════════

if %SKIP_PYTHON% EQU 0 (
    echo [3/9] Installing Python dependencies...
    echo.
    
    if not exist requirements.txt (
        echo [WARN] requirements.txt not found. Skipping Python dependencies.
    ) else (
        echo Installing Python packages...
        call python -m pip install --upgrade pip
        call python -m pip install -r requirements.txt
        if %ERRORLEVEL% NEQ 0 (
            echo [WARN] Failed to install some Python dependencies
            echo ML features may not work correctly.
            echo You can continue, but functionality will be limited.
        ) else (
            echo [OK] Python dependencies installed successfully!
        )
    )
    echo.
    timeout /t 2 >nul
) else (
    echo [3/9] Skipping Python dependencies (Python not installed)...
    echo.
)

REM ═══════════════════════════════════════════════════════════════════════════
REM STEP 4: BUILD RUST ENGINE (OPTIONAL)
REM ═══════════════════════════════════════════════════════════════════════════

echo [4/9] Building Rust calculation engine (optional)...
echo.

where cargo >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [WARN] Rust not found. Skipping Rust engine build.
    echo System will work without Rust, but with reduced performance.
    echo.
    echo To install Rust: https://rustup.rs/
) else (
    if exist src\rust\Cargo.toml (
        echo Building Rust engine...
        cd src\rust
        call cargo build --release
        if %ERRORLEVEL% NEQ 0 (
            echo [WARN] Failed to build Rust engine
            echo System will work without it, but with reduced performance.
        ) else (
            echo [OK] Rust engine built successfully!
        )
        cd ..\..
    ) else (
        echo [WARN] Rust source not found. Skipping build.
    )
)

echo.
timeout /t 2 >nul

REM ═══════════════════════════════════════════════════════════════════════════
REM STEP 5: SETUP CONFIGURATION
REM ═══════════════════════════════════════════════════════════════════════════

echo [5/9] Setting up configuration...
echo.

if not exist .env (
    if exist .env.example (
        echo Creating .env from .env.example...
        copy .env.example .env
        echo.
        echo [IMPORTANT] Please edit .env file with your configuration:
        echo   - Add your RPC URLs
        echo   - Add your private key (for LIVE mode)
        echo   - Configure safety parameters
        echo.
        echo Press any key to open .env in Notepad...
        pause >nul
        start notepad .env
        echo.
        echo After editing, save and close Notepad, then press any key to continue...
        pause >nul
    ) else (
        echo [WARN] .env.example not found. Creating basic .env file...
        (
            echo # APEX Arbitrage System Configuration
            echo MODE=DEV
            echo.
            echo # RPC URLs - REQUIRED
            echo POLYGON_RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/YOUR_API_KEY
            echo.
            echo # Private Key - REQUIRED for LIVE mode
            echo PRIVATE_KEY=your_private_key_without_0x
            echo.
            echo # Safety Parameters
            echo MIN_PROFIT_USD=5
            echo MAX_GAS_PRICE_GWEI=100
            echo MAX_DAILY_LOSS=50
            echo SLIPPAGE_BPS=50
        ) > .env
        echo [OK] Basic .env created. Please edit it with your configuration.
        echo.
        start notepad .env
        echo After editing, save and close Notepad, then press any key to continue...
        pause >nul
    )
) else (
    echo [OK] .env file already exists
)

echo.
timeout /t 2 >nul

REM ═══════════════════════════════════════════════════════════════════════════
REM STEP 6: CREATE DATA DIRECTORIES
REM ═══════════════════════════════════════════════════════════════════════════

echo [6/9] Creating data directories...
echo.

if not exist data mkdir data
if not exist data\models mkdir data\models
if not exist data\logs mkdir data\logs
if not exist logs mkdir logs

echo [OK] Data directories created
echo.
timeout /t 2 >nul

REM ═══════════════════════════════════════════════════════════════════════════
REM STEP 7: VALIDATE INSTALLATION
REM ═══════════════════════════════════════════════════════════════════════════

echo [7/9] Validating installation...
echo.

if exist scripts\comprehensive-validation.js (
    echo Running comprehensive validation...
    call node scripts\comprehensive-validation.js
    if %ERRORLEVEL% NEQ 0 (
        echo [WARN] Some validation checks failed
        echo You can continue, but please review the errors above.
        echo.
        choice /C YN /M "Continue anyway"
        if errorlevel 2 exit /b 1
    )
) else (
    echo [WARN] Validation script not found. Skipping validation.
)

echo.
timeout /t 2 >nul

REM ═══════════════════════════════════════════════════════════════════════════
REM STEP 8: RUN PRE-OPERATION CHECKLIST
REM ═══════════════════════════════════════════════════════════════════════════

echo [8/9] Running pre-operation checklist...
echo.

if exist scripts\pre-operation-checklist.js (
    echo Running pre-operation checklist...
    call node scripts\pre-operation-checklist.js
    if %ERRORLEVEL% NEQ 0 (
        echo.
        echo [WARN] Pre-operation checklist detected issues.
        echo Please review the output above and fix any critical issues.
        echo.
        choice /C YN /M "Continue to start system"
        if errorlevel 2 exit /b 1
    )
) else (
    echo [WARN] Pre-operation checklist not found. Skipping.
)

echo.
timeout /t 2 >nul

REM ═══════════════════════════════════════════════════════════════════════════
REM STEP 9: START THE SYSTEM
REM ═══════════════════════════════════════════════════════════════════════════

echo [9/9] Starting APEX Arbitrage System...
echo.

echo ═══════════════════════════════════════════════════════════════════════════
echo                       INSTALLATION COMPLETE!
echo ═══════════════════════════════════════════════════════════════════════════
echo.
echo The APEX Arbitrage System is ready to start!
echo.
echo IMPORTANT:
echo   - Review your .env configuration
echo   - Make sure you're in DEV mode for testing
echo   - Only use LIVE mode after thorough testing
echo.
echo Press any key to start the system...
pause >nul

echo.
echo Starting system...
echo.
echo To stop: Press Ctrl+C
echo.

REM Start the system
call yarn start

REM If we get here, the system has stopped
echo.
echo.
echo System stopped.
echo.
pause

ENDLOCAL
