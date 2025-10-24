#!/usr/bin/env node

/**
 * APEX ARBITRAGE SYSTEM - SIMPLE INSTALLER VERIFICATION
 * 
 * This script verifies the one-click installer is ready to use.
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Colors
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
};

console.log('\n' + '='.repeat(70));
console.log('APEX ARBITRAGE SYSTEM - INSTALLER VERIFICATION');
console.log('='.repeat(70) + '\n');

let passed = 0;
let failed = 0;

function check(name, condition, errorMsg = '') {
    if (condition) {
        console.log(`${colors.green}✅ ${name}${colors.reset}`);
        passed++;
    } else {
        console.log(`${colors.red}❌ ${name}${colors.reset}`);
        if (errorMsg) console.log(`   ${colors.red}${errorMsg}${colors.reset}`);
        failed++;
    }
}

// Check installer files
console.log(`${colors.blue}Checking installer files...${colors.reset}`);
check('install-and-run.sh exists', existsSync(join(rootDir, 'install-and-run.sh')));
check('install-and-run.bat exists', existsSync(join(rootDir, 'install-and-run.bat')));
check('.env.example exists', existsSync(join(rootDir, '.env.example')));
check('package.json exists', existsSync(join(rootDir, 'package.json')));
check('requirements.txt exists', existsSync(join(rootDir, 'requirements.txt')));
console.log();

// Check scripts
console.log(`${colors.blue}Checking validation scripts...${colors.reset}`);
check('test-installer.sh exists', existsSync(join(rootDir, 'test-installer.sh')));
check('quickstart.sh exists', existsSync(join(rootDir, 'quickstart.sh')));
check('setup-apex.sh exists', existsSync(join(rootDir, 'setup-apex.sh')));
console.log();

// Check directories
console.log(`${colors.blue}Checking directory structure...${colors.reset}`);
check('src/ directory exists', existsSync(join(rootDir, 'src')));
check('scripts/ directory exists', existsSync(join(rootDir, 'scripts')));
check('tests/ directory exists', existsSync(join(rootDir, 'tests')));
console.log();

// Check prerequisites (if available)
console.log(`${colors.blue}Checking prerequisites...${colors.reset}`);
try {
    const nodeVersion = execSync('node --version', { encoding: 'utf8' }).trim();
    check('Node.js installed', true, nodeVersion);
} catch (e) {
    check('Node.js installed', false, 'Not found');
}

try {
    const yarnVersion = execSync('yarn --version', { encoding: 'utf8' }).trim();
    check('yarn installed', true, `v${yarnVersion}`);
} catch (e) {
    check('yarn installed', false, 'Not found');
}

try {
    const pythonVersion = execSync('python3 --version', { encoding: 'utf8' }).trim();
    check('Python 3 installed', true, pythonVersion);
} catch (e) {
    check('Python 3 installed', false, 'Not found (optional)');
}

try {
    const rustVersion = execSync('cargo --version', { encoding: 'utf8' }).trim();
    check('Rust installed', true, rustVersion);
} catch (e) {
    check('Rust installed', false, 'Not found (optional)');
}
console.log();

// Check node_modules
console.log(`${colors.blue}Checking dependencies...${colors.reset}`);
const nodeModulesExists = existsSync(join(rootDir, 'node_modules'));
check('Node.js dependencies installed', nodeModulesExists, 
    !nodeModulesExists ? 'Run: yarn install' : 'All dependencies installed');

const venvExists = existsSync(join(rootDir, '.venv'));
check('Python virtual environment created', venvExists,
    !venvExists ? 'Run: python3 -m venv .venv' : 'Virtual environment ready');
console.log();

// Summary
console.log('='.repeat(70));
console.log('SUMMARY');
console.log('='.repeat(70));
console.log(`${colors.green}✅ Passed: ${passed}${colors.reset}`);
console.log(`${colors.red}❌ Failed: ${failed}${colors.reset}`);
console.log();

if (failed === 0) {
    console.log(`${colors.green}✅ The one-click installer is ready to use!${colors.reset}`);
    console.log();
    console.log('To install and run the system:');
    console.log('  chmod +x install-and-run.sh');
    console.log('  ./install-and-run.sh');
    console.log();
    process.exit(0);
} else {
    console.log(`${colors.yellow}⚠️  Some checks failed. Review the output above.${colors.reset}`);
    console.log();
    process.exit(1);
}
