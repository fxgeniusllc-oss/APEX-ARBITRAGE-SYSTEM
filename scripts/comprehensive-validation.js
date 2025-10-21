#!/usr/bin/env node

/**
 * APEX ARBITRAGE SYSTEM - COMPREHENSIVE VALIDATION
 * 
 * This script performs a complete validation of the system installation:
 * - Prerequisites (Node.js, Python, Rust)
 * - Dependencies (npm packages, Python packages, Rust binaries)
 * - Configuration files
 * - Directory structure
 * - Critical files
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Colors
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
};

let totalChecks = 0;
let passedChecks = 0;
let failedChecks = 0;
let warnings = 0;

function printHeader() {
    console.log('');
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║    APEX ARBITRAGE SYSTEM - COMPREHENSIVE VALIDATION       ║');
    console.log('╚═══════════════════════════════════════════════════════════╝');
    console.log('');
}

function printSection(title) {
    console.log('');
    console.log(`${colors.blue}━━━ ${title} ━━━${colors.reset}`);
}

function check(name, test, critical = true) {
    totalChecks++;
    try {
        const result = test();
        if (result) {
            passedChecks++;
            console.log(`${colors.green}✅ ${name}${colors.reset}`);
            return true;
        } else {
            if (critical) {
                failedChecks++;
                console.log(`${colors.red}❌ ${name}${colors.reset}`);
            } else {
                warnings++;
                console.log(`${colors.yellow}⚠️  ${name}${colors.reset}`);
            }
            return false;
        }
    } catch (error) {
        if (critical) {
            failedChecks++;
            console.log(`${colors.red}❌ ${name}: ${error.message}${colors.reset}`);
        } else {
            warnings++;
            console.log(`${colors.yellow}⚠️  ${name}: ${error.message}${colors.reset}`);
        }
        return false;
    }
}

function exec(command, silent = true) {
    try {
        return execSync(command, { 
            encoding: 'utf8', 
            stdio: silent ? 'pipe' : 'inherit',
            timeout: 10000
        });
    } catch (error) {
        return null;
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// VALIDATION CHECKS
// ═══════════════════════════════════════════════════════════════════════════

function validatePrerequisites() {
    printSection('Prerequisites');
    
    check('Node.js installed', () => {
        const version = exec('node --version');
        if (!version) return false;
        const major = parseInt(version.trim().substring(1).split('.')[0]);
        return major >= 18;
    });
    
    check('npm installed', () => exec('npm --version') !== null);
    
    check('Python 3 installed', () => {
        const version = exec('python3 --version');
        if (!version) return false;
        const major = parseInt(version.split(' ')[1].split('.')[0]);
        return major >= 3;
    });
    
    check('pip3 installed', () => exec('pip3 --version') !== null);
    
    check('Rust/Cargo installed', () => exec('cargo --version') !== null, false);
}

function validateNodeDependencies() {
    printSection('Node.js Dependencies');
    
    check('package.json exists', () => fs.existsSync('package.json'));
    
    check('node_modules directory exists', () => fs.existsSync('node_modules'));
    
    const criticalPackages = [
        'ethers',
        'web3',
        'dotenv',
        'axios',
        'concurrently',
    ];
    
    criticalPackages.forEach(pkg => {
        check(`Package '${pkg}' installed`, () => {
            try {
                require.resolve(pkg);
                return true;
            } catch {
                return false;
            }
        });
    });
}

function validatePythonDependencies() {
    printSection('Python Dependencies');
    
    check('requirements.txt exists', () => fs.existsSync('requirements.txt'), false);
    
    const pythonPackages = [
        'numpy',
        'pandas',
        'fastapi',
        'uvicorn',
    ];
    
    pythonPackages.forEach(pkg => {
        check(`Python package '${pkg}' installed`, () => {
            const result = exec(`python3 -c "import ${pkg}"`);
            return result !== null;
        }, false);
    });
}

function validateRustComponents() {
    printSection('Rust Components');
    
    const rustDirs = ['src/rust', 'rust-engine'];
    
    rustDirs.forEach(dir => {
        if (fs.existsSync(dir)) {
            check(`${dir} directory exists`, () => true);
            
            check(`${dir}/Cargo.toml exists`, () => 
                fs.existsSync(path.join(dir, 'Cargo.toml')), false);
            
            check(`${dir} build output exists`, () => 
                fs.existsSync(path.join(dir, 'target', 'release')), false);
        }
    });
}

function validateDirectoryStructure() {
    printSection('Directory Structure');
    
    const requiredDirs = [
        'src',
        'scripts',
        'tests',
        'data',
        'logs',
    ];
    
    requiredDirs.forEach(dir => {
        check(`${dir}/ directory exists`, () => fs.existsSync(dir));
    });
    
    const optionalDirs = [
        'data/models',
        'docs',
        'contracts',
    ];
    
    optionalDirs.forEach(dir => {
        check(`${dir}/ directory exists`, () => fs.existsSync(dir), false);
    });
}

function validateConfiguration() {
    printSection('Configuration Files');
    
    check('.env file exists', () => fs.existsSync('.env'));
    
    if (fs.existsSync('.env')) {
        const envContent = fs.readFileSync('.env', 'utf8');
        
        check('.env contains RPC URL config', () => 
            envContent.includes('RPC_URL') || envContent.includes('POLYGON_RPC_URL'), false);
        
        check('.env contains PRIVATE_KEY config', () => 
            envContent.includes('PRIVATE_KEY'), false);
        
        // Check if using placeholder values
        if (envContent.includes('YOUR_API_KEY') || envContent.includes('your_private_key_here')) {
            warnings++;
            console.log(`${colors.yellow}⚠️  .env contains placeholder values (needs configuration)${colors.reset}`);
        }
    }
    
    check('.env.example exists', () => fs.existsSync('.env.example'), false);
    check('.gitignore exists', () => fs.existsSync('.gitignore'), false);
}

function validateCriticalFiles() {
    printSection('Critical Files');
    
    const criticalFiles = [
        'package.json',
        'README.md',
    ];
    
    criticalFiles.forEach(file => {
        check(`${file} exists`, () => fs.existsSync(file));
    });
    
    const importantFiles = [
        'src/index.js',
        'hardhat.config.js',
        'scripts/deploy.js',
        'scripts/validate-system.js',
    ];
    
    importantFiles.forEach(file => {
        check(`${file} exists`, () => fs.existsSync(file), false);
    });
}

function validateScripts() {
    printSection('NPM Scripts');
    
    if (fs.existsSync('package.json')) {
        const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
        const scripts = pkg.scripts || {};
        
        const requiredScripts = [
            'start',
            'test',
        ];
        
        requiredScripts.forEach(script => {
            check(`npm script '${script}' defined`, () => scripts[script] !== undefined);
        });
        
        const optionalScripts = [
            'deploy',
            'verify',
            'ai:start',
            'build:rust',
        ];
        
        optionalScripts.forEach(script => {
            check(`npm script '${script}' defined`, () => scripts[script] !== undefined, false);
        });
    }
}

function validateTests() {
    printSection('Test Files');
    
    check('tests/ directory exists', () => fs.existsSync('tests'));
    
    if (fs.existsSync('tests')) {
        const testFiles = fs.readdirSync('tests').filter(f => 
            f.endsWith('.test.js') || f.endsWith('.test.py') || f.endsWith('.spec.js')
        );
        
        check(`Test files found (${testFiles.length})`, () => testFiles.length > 0, false);
    }
}

function printSummary() {
    console.log('');
    console.log('═'.repeat(63));
    console.log('                        VALIDATION SUMMARY');
    console.log('═'.repeat(63));
    console.log('');
    console.log(`${colors.cyan}Total Checks:${colors.reset}     ${totalChecks}`);
    console.log(`${colors.green}Passed:${colors.reset}           ${passedChecks}`);
    console.log(`${colors.red}Failed:${colors.reset}           ${failedChecks}`);
    console.log(`${colors.yellow}Warnings:${colors.reset}         ${warnings}`);
    console.log('');
    
    if (failedChecks === 0 && warnings === 0) {
        console.log(`${colors.green}✅ ALL CHECKS PASSED - System is ready!${colors.reset}`);
        console.log('');
        console.log('You can now start the system with:');
        console.log('  npm start');
        return 0;
    } else if (failedChecks === 0) {
        console.log(`${colors.yellow}⚠️  ${warnings} warning(s) found${colors.reset}`);
        console.log('System should work but review warnings before production use.');
        console.log('');
        console.log('You can start the system with:');
        console.log('  npm start');
        return 0;
    } else {
        console.log(`${colors.red}❌ ${failedChecks} critical error(s) found${colors.reset}`);
        console.log('Please fix the errors before starting the system.');
        console.log('');
        console.log('Run the installation script again:');
        console.log('  ./install-and-run.sh');
        return 1;
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN EXECUTION
// ═══════════════════════════════════════════════════════════════════════════

function main() {
    printHeader();
    
    validatePrerequisites();
    validateNodeDependencies();
    validatePythonDependencies();
    validateRustComponents();
    validateDirectoryStructure();
    validateConfiguration();
    validateCriticalFiles();
    validateScripts();
    validateTests();
    
    const exitCode = printSummary();
    process.exit(exitCode);
}

if (require.main === module) {
    main();
}

module.exports = { main };
