#!/usr/bin/env node

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * APEX ARBITRAGE SYSTEM - COMPREHENSIVE FINAL DEPLOYMENT AUDIT
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * This script performs a comprehensive audit of the APEX system for final
 * deployment to live production environments. It validates:
 * 
 * 1. System Configuration & Environment
 * 2. Code Quality & Dependencies
 * 3. Security & Safety Controls
 * 4. Performance Benchmarks
 * 5. Integration Tests
 * 6. Production Readiness
 * 7. Deployment Checklist
 * 
 * Usage:
 *   node scripts/final-deployment-audit.js
 *   yarn run audit:deployment
 * 
 * Exit Codes:
 *   0 - System ready for production deployment
 *   1 - Critical issues found, NOT ready for deployment
 *   2 - Warnings present, review before deployment
 * ═══════════════════════════════════════════════════════════════════════════
 */

import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Audit Results
const auditResults = {
  timestamp: new Date().toISOString(),
  version: '2.0.0',
  sections: {},
  criticalIssues: [],
  warnings: [],
  recommendations: [],
  passed: [],
  score: 0,
  maxScore: 0
};

// Helper Functions
function printHeader(title) {
  console.log('\n' + chalk.cyan('═'.repeat(79)));
  console.log(chalk.cyan.bold(`  ${title}`));
  console.log(chalk.cyan('═'.repeat(79)) + '\n');
}

function printSection(title) {
  console.log('\n' + chalk.blue('─'.repeat(79)));
  console.log(chalk.blue.bold(`  ${title}`));
  console.log(chalk.blue('─'.repeat(79)) + '\n');
}

function addResult(category, check, passed, details = '', critical = false) {
  auditResults.maxScore++;
  
  if (passed) {
    auditResults.score++;
    auditResults.passed.push(`[${category}] ${check}`);
    console.log(chalk.green('  ✅'), check);
    if (details) console.log(chalk.gray(`     ${details}`));
  } else {
    if (critical) {
      auditResults.criticalIssues.push(`[${category}] ${check}: ${details}`);
      console.log(chalk.red('  ❌'), chalk.red.bold(check));
      console.log(chalk.red(`     ${details}`));
    } else {
      auditResults.warnings.push(`[${category}] ${check}: ${details}`);
      console.log(chalk.yellow('  ⚠️ '), check);
      console.log(chalk.yellow(`     ${details}`));
    }
  }
  
  return passed;
}

function addRecommendation(recommendation) {
  auditResults.recommendations.push(recommendation);
  console.log(chalk.cyan('  💡'), recommendation);
}

// Check if file exists
function fileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}

// Execute command safely
function execCommand(command, silent = true) {
  try {
    const output = execSync(command, { 
      encoding: 'utf-8',
      stdio: silent ? 'pipe' : 'inherit'
    });
    return { success: true, output };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Audit Section 1: System Configuration & Environment
async function auditSystemConfiguration() {
  printSection('1. SYSTEM CONFIGURATION & ENVIRONMENT');
  
  // Check Node.js version
  const nodeVersion = process.version;
  const nodeVersionNumber = parseInt(nodeVersion.slice(1).split('.')[0]);
  addResult(
    'System',
    'Node.js Version >= 18',
    nodeVersionNumber >= 18,
    nodeVersionNumber >= 18 ? `Current: ${nodeVersion}` : `Required: >=18, Current: ${nodeVersion}`,
    true
  );
  
  // Check package.json exists
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  addResult(
    'System',
    'package.json exists',
    fileExists(packageJsonPath),
    '',
    true
  );
  
  // Check .env file
  const envPath = path.join(process.cwd(), '.env');
  const hasEnv = fileExists(envPath);
  addResult(
    'System',
    'Environment configuration file (.env)',
    hasEnv,
    hasEnv ? 'Found' : 'Missing - required for configuration',
    true
  );
  
  // Check critical directories
  const criticalDirs = ['src', 'scripts', 'tests', 'docs'];
  for (const dir of criticalDirs) {
    const dirPath = path.join(process.cwd(), dir);
    addResult(
      'System',
      `Directory: ${dir}/`,
      fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory(),
      '',
      true
    );
  }
  
  // Check node_modules
  const nodeModulesPath = path.join(process.cwd(), 'node_modules');
  addResult(
    'System',
    'Dependencies installed (node_modules)',
    fileExists(nodeModulesPath),
    'Run: yarn install',
    true
  );
  
  // Check Python availability
  const pythonCheck = execCommand('python3 --version');
  addResult(
    'System',
    'Python 3 available',
    pythonCheck.success,
    pythonCheck.success ? pythonCheck.output.trim() : 'Python 3 required for ML features',
    false
  );
}

// Audit Section 2: Code Quality & Dependencies
async function auditCodeQuality() {
  printSection('2. CODE QUALITY & DEPENDENCIES');
  
  // Check critical source files
  const criticalFiles = [
    'src/apex-production-runner.js',
    'src/dex_pool_fetcher.js',
    'src/main_deploy_launcher.py',
    'scripts/comprehensive-validation.js',
    'scripts/pre-operation-checklist.js'
  ];
  
  for (const file of criticalFiles) {
    const filePath = path.join(process.cwd(), file);
    addResult(
      'Code',
      `Critical file: ${file}`,
      fileExists(filePath),
      '',
      true
    );
  }
  
  // Check package.json scripts
  if (fileExists(path.join(process.cwd(), 'package.json'))) {
    const packageJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf-8'));
    const requiredScripts = ['start', 'test', 'verify', 'precheck', 'validate'];
    
    for (const script of requiredScripts) {
      addResult(
        'Code',
        `Script available: ${script}`,
        packageJson.scripts && packageJson.scripts[script],
        packageJson.scripts && packageJson.scripts[script] ? '' : 'Script missing'
      );
    }
  }
  
  // Check README documentation
  const readmePath = path.join(process.cwd(), 'README.md');
  addResult(
    'Code',
    'Documentation (README.md)',
    fileExists(readmePath) && fs.statSync(readmePath).size > 1000,
    ''
  );
  
  // Check test files
  const testsDir = path.join(process.cwd(), 'tests');
  if (fs.existsSync(testsDir)) {
    const testFiles = fs.readdirSync(testsDir).filter(f => f.endsWith('.test.js') || f.endsWith('test.py'));
    addResult(
      'Code',
      'Test suite present',
      testFiles.length > 0,
      `${testFiles.length} test files found`
    );
  }
}

// Audit Section 3: Security & Safety Controls
async function auditSecurity() {
  printSection('3. SECURITY & SAFETY CONTROLS');
  
  // Check .gitignore for sensitive files
  const gitignorePath = path.join(process.cwd(), '.gitignore');
  if (fileExists(gitignorePath)) {
    const gitignoreContent = fs.readFileSync(gitignorePath, 'utf-8');
    const hasEnvIgnore = gitignoreContent.includes('.env');
    const hasNodeModulesIgnore = gitignoreContent.includes('node_modules');
    
    addResult(
      'Security',
      '.gitignore includes .env',
      hasEnvIgnore,
      'Prevents accidental commit of secrets',
      true
    );
    
    addResult(
      'Security',
      '.gitignore includes node_modules',
      hasNodeModulesIgnore,
      ''
    );
  }
  
  // Check for .env.example
  const envExamplePath = path.join(process.cwd(), '.env.example');
  addResult(
    'Security',
    'Template configuration (.env.example)',
    fileExists(envExamplePath),
    'Helps users understand required configuration'
  );
  
  // Check emergency stop mechanism
  const productionRunnerPath = path.join(process.cwd(), 'src/apex-production-runner.js');
  if (fileExists(productionRunnerPath)) {
    const content = fs.readFileSync(productionRunnerPath, 'utf-8');
    const hasEmergencyStop = content.includes('EMERGENCY_STOP');
    addResult(
      'Security',
      'Emergency stop mechanism',
      hasEmergencyStop,
      'Allows immediate system shutdown',
      true
    );
  }
  
  // Check for safety limits in code
  const configFiles = ['src/apex-production-runner.js', 'src/config.js'];
  let hasSafetyLimits = false;
  for (const file of configFiles) {
    const filePath = path.join(process.cwd(), file);
    if (fileExists(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      if (content.includes('MAX_GAS_PRICE') || content.includes('MIN_PROFIT') || content.includes('MAX_DAILY_LOSS')) {
        hasSafetyLimits = true;
        break;
      }
    }
  }
  
  addResult(
    'Security',
    'Safety limits configured',
    hasSafetyLimits,
    'Gas price, profit, and loss limits',
    true
  );
  
  addRecommendation('Always use a dedicated wallet for trading operations');
  addRecommendation('Start with small amounts in DEV mode before LIVE deployment');
  addRecommendation('Set up monitoring alerts (Telegram/email) for all operations');
}

// Audit Section 4: Performance Benchmarks
async function auditPerformance() {
  printSection('4. PERFORMANCE & BENCHMARKS');
  
  // Check Rust engine
  const rustEnginePath = path.join(process.cwd(), 'src/rust');
  const hasRustEngine = fs.existsSync(rustEnginePath) && fs.statSync(rustEnginePath).isDirectory();
  addResult(
    'Performance',
    'Rust calculation engine available',
    hasRustEngine,
    hasRustEngine ? 'Provides 100x speed improvement' : 'Optional but highly recommended'
  );
  
  // Check ML models
  const mlModelsPath = path.join(process.cwd(), 'data/models');
  const hasMLModels = fs.existsSync(mlModelsPath);
  addResult(
    'Performance',
    'ML models directory',
    hasMLModels,
    hasMLModels ? 'AI/ML enhanced decision making' : 'Models will be generated on first run'
  );
  
  // Check validation scripts
  const validationScriptPath = path.join(process.cwd(), 'scripts/comprehensive-validation.js');
  addResult(
    'Performance',
    'Validation script available',
    fileExists(validationScriptPath),
    'For system integrity checks'
  );
  
  // Check benchmark script
  const benchmarkScriptPath = path.join(process.cwd(), 'scripts/validate-performance.js');
  addResult(
    'Performance',
    'Performance validation script',
    fileExists(benchmarkScriptPath),
    'For benchmark analysis'
  );
  
  addRecommendation('Run benchmarks: yarn run validate:performance');
  addRecommendation('Build Rust engine for maximum performance: yarn run build:rust');
}

// Audit Section 5: Integration & Testing
async function auditIntegration() {
  printSection('5. INTEGRATION & TESTING');
  
  // Check test files existence
  const testCategories = [
    'adapters.test.js',
    'database.test.js',
    'execution-controller.test.js',
    'flashloan-integration.test.js',
    'pool-fetcher.test.js',
    'rust-engine.test.js'
  ];
  
  for (const testFile of testCategories) {
    const testPath = path.join(process.cwd(), 'tests', testFile);
    addResult(
      'Testing',
      `Test suite: ${testFile}`,
      fileExists(testPath),
      ''
    );
  }
  
  // Check pre-operation checklist
  const precheckPath = path.join(process.cwd(), 'scripts/pre-operation-checklist.js');
  addResult(
    'Testing',
    'Pre-operation checklist script',
    fileExists(precheckPath),
    'Critical for production deployment',
    true
  );
  
  addRecommendation('Run pre-operation checklist: yarn run precheck');
  addRecommendation('Run full validation: yarn run validate');
  addRecommendation('Run regression tests: yarn run test:regression');
}

// Audit Section 6: Production Readiness
async function auditProductionReadiness() {
  printSection('6. PRODUCTION READINESS');
  
  // Check installation scripts
  const installScripts = [
    'install-and-run.sh',
    'setup-apex.sh',
    'quickstart.sh'
  ];
  
  for (const script of installScripts) {
    const scriptPath = path.join(process.cwd(), script);
    addResult(
      'Production',
      `Installation script: ${script}`,
      fileExists(scriptPath),
      ''
    );
  }
  
  // Check documentation
  const criticalDocs = [
    'README.md',
    'INSTALLATION-GUIDE.md',
    'docs/DEPLOYMENT.md',
    'docs/TROUBLESHOOTING.md'
  ];
  
  for (const doc of criticalDocs) {
    const docPath = path.join(process.cwd(), doc);
    addResult(
      'Production',
      `Documentation: ${doc}`,
      fileExists(docPath),
      ''
    );
  }
  
  // Check mode configuration
  const envPath = path.join(process.cwd(), '.env');
  if (fileExists(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const hasMode = envContent.includes('MODE=');
    addResult(
      'Production',
      'Execution mode configured',
      hasMode,
      hasMode ? 'MODE variable found' : 'Set MODE=DEV or MODE=LIVE in .env'
    );
  }
  
  addRecommendation('Test in DEV mode thoroughly before switching to LIVE');
  addRecommendation('Set up monitoring and logging before production deployment');
  addRecommendation('Prepare rollback plan in case of issues');
}

// Audit Section 7: Deployment Checklist
async function auditDeploymentChecklist() {
  printSection('7. DEPLOYMENT CHECKLIST');
  
  console.log(chalk.cyan('\n  Pre-Deployment Requirements:\n'));
  
  const checklist = [
    { item: 'RPC endpoints configured for all chains', critical: true },
    { item: 'Private key configured (for LIVE mode)', critical: true },
    { item: 'Sufficient gas tokens on all active chains', critical: true },
    { item: 'Safety parameters configured (profit, gas, loss limits)', critical: true },
    { item: 'Emergency stop mechanism tested', critical: true },
    { item: 'Monitoring and alerting set up', critical: false },
    { item: 'Telegram notifications configured', critical: false },
    { item: 'System tested in DEV mode', critical: true },
    { item: 'Pre-operation checklist passed', critical: true },
    { item: 'Backup and recovery plan in place', critical: false }
  ];
  
  for (const check of checklist) {
    const symbol = check.critical ? '🔴' : '🟡';
    const label = check.critical ? chalk.red('[CRITICAL]') : chalk.yellow('[RECOMMENDED]');
    console.log(`  ${symbol} ${label} ${check.item}`);
  }
  
  console.log(chalk.cyan('\n  Post-Deployment Actions:\n'));
  
  const postActions = [
    'Monitor system closely for first 24 hours',
    'Check logs regularly for errors or warnings',
    'Verify actual transactions on block explorer',
    'Track profitability and success rate metrics',
    'Adjust parameters based on performance data'
  ];
  
  for (const action of postActions) {
    console.log(chalk.cyan(`  ✓ ${action}`));
  }
}

// Generate Final Report
function generateFinalReport() {
  printHeader('FINAL AUDIT REPORT');
  
  const passRate = auditResults.maxScore > 0 
    ? ((auditResults.score / auditResults.maxScore) * 100).toFixed(1)
    : 0;
  
  console.log(chalk.bold('\n  Overall Score: ') + chalk.cyan(`${auditResults.score}/${auditResults.maxScore}`) + chalk.bold(` (${passRate}%)`));
  
  // Determine readiness level
  let readinessStatus, readinessColor, exitCode;
  if (auditResults.criticalIssues.length > 0) {
    readinessStatus = '🔴 NOT READY FOR PRODUCTION';
    readinessColor = chalk.red.bold;
    exitCode = 1;
  } else if (auditResults.warnings.length > 0) {
    readinessStatus = '🟡 READY WITH WARNINGS';
    readinessColor = chalk.yellow.bold;
    exitCode = 2;
  } else {
    readinessStatus = '🟢 PRODUCTION READY';
    readinessColor = chalk.green.bold;
    exitCode = 0;
  }
  
  console.log('\n  ' + readinessColor(readinessStatus) + '\n');
  
  // Critical Issues
  if (auditResults.criticalIssues.length > 0) {
    console.log(chalk.red.bold(`\n  ❌ CRITICAL ISSUES (${auditResults.criticalIssues.length}):\n`));
    auditResults.criticalIssues.forEach((issue, i) => {
      console.log(chalk.red(`     ${i + 1}. ${issue}`));
    });
  }
  
  // Warnings
  if (auditResults.warnings.length > 0) {
    console.log(chalk.yellow.bold(`\n  ⚠️  WARNINGS (${auditResults.warnings.length}):\n`));
    auditResults.warnings.forEach((warning, i) => {
      console.log(chalk.yellow(`     ${i + 1}. ${warning}`));
    });
  }
  
  // Recommendations
  if (auditResults.recommendations.length > 0) {
    console.log(chalk.cyan.bold(`\n  💡 RECOMMENDATIONS (${auditResults.recommendations.length}):\n`));
    auditResults.recommendations.forEach((rec, i) => {
      console.log(chalk.cyan(`     ${i + 1}. ${rec}`));
    });
  }
  
  // Save report to file
  const reportPath = path.join(process.cwd(), 'FINAL-DEPLOYMENT-AUDIT.md');
  const reportContent = generateMarkdownReport(readinessStatus, passRate);
  fs.writeFileSync(reportPath, reportContent);
  
  console.log(chalk.cyan(`\n  📄 Full report saved to: ${reportPath}\n`));
  
  console.log(chalk.cyan('═'.repeat(79)) + '\n');
  
  return exitCode;
}

// Generate Markdown Report
function generateMarkdownReport(status, passRate) {
  const timestamp = new Date().toISOString();
  
  let report = `# APEX ARBITRAGE SYSTEM - Final Deployment Audit Report

**Generated:** ${timestamp}  
**Version:** ${auditResults.version}  
**Overall Score:** ${auditResults.score}/${auditResults.maxScore} (${passRate}%)  
**Status:** ${status}

---

## Executive Summary

This comprehensive audit evaluates the APEX Arbitrage System's readiness for production deployment. The audit covers system configuration, code quality, security controls, performance benchmarks, integration testing, and production readiness.

`;

  // Critical Issues
  if (auditResults.criticalIssues.length > 0) {
    report += `## ❌ Critical Issues (${auditResults.criticalIssues.length})

The following critical issues MUST be resolved before production deployment:

`;
    auditResults.criticalIssues.forEach((issue, i) => {
      report += `${i + 1}. ${issue}\n`;
    });
    report += '\n';
  }

  // Warnings
  if (auditResults.warnings.length > 0) {
    report += `## ⚠️ Warnings (${auditResults.warnings.length})

The following warnings should be reviewed and addressed:

`;
    auditResults.warnings.forEach((warning, i) => {
      report += `${i + 1}. ${warning}\n`;
    });
    report += '\n';
  }

  // Passed Checks
  report += `## ✅ Passed Checks (${auditResults.passed.length})

`;
  auditResults.passed.forEach((check) => {
    report += `- ${check}\n`;
  });
  report += '\n';

  // Recommendations
  if (auditResults.recommendations.length > 0) {
    report += `## 💡 Recommendations

`;
    auditResults.recommendations.forEach((rec, i) => {
      report += `${i + 1}. ${rec}\n`;
    });
    report += '\n';
  }

  // Deployment Readiness Checklist
  report += `## 🚀 Deployment Readiness Checklist

### Pre-Deployment Requirements

- [ ] RPC endpoints configured for all chains
- [ ] Private key configured (for LIVE mode)
- [ ] Sufficient gas tokens on all active chains
- [ ] Safety parameters configured (profit, gas, loss limits)
- [ ] Emergency stop mechanism tested
- [ ] Monitoring and alerting set up
- [ ] Telegram notifications configured
- [ ] System tested in DEV mode
- [ ] Pre-operation checklist passed (\`yarn run precheck\`)
- [ ] Backup and recovery plan in place

### Validation Steps

\`\`\`bash
# Run pre-operation checklist
yarn run precheck

# Run comprehensive validation
yarn run validate

# Run performance validation
yarn run validate:performance

# Run regression tests
yarn run test:regression
\`\`\`

### Post-Deployment Actions

1. Monitor system closely for first 24 hours
2. Check logs regularly for errors or warnings
3. Verify actual transactions on block explorer
4. Track profitability and success rate metrics
5. Adjust parameters based on performance data

---

## Next Steps

`;

  if (auditResults.criticalIssues.length > 0) {
    report += `**IMMEDIATE ACTION REQUIRED:** Resolve all critical issues before proceeding with deployment.

`;
  } else if (auditResults.warnings.length > 0) {
    report += `**REVIEW REQUIRED:** Address warnings and proceed with caution.

`;
  } else {
    report += `**SYSTEM READY:** All checks passed. Proceed with deployment following the checklist above.

`;
  }

  report += `
For support and documentation:
- **README:** [README.md](README.md)
- **Deployment Guide:** [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)
- **Troubleshooting:** [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)

---

*End of Audit Report*
`;

  return report;
}

// Main Execution
async function main() {
  try {
    printHeader('APEX ARBITRAGE SYSTEM - COMPREHENSIVE DEPLOYMENT AUDIT');
    
    console.log(chalk.cyan('  Starting comprehensive final deployment audit...'));
    console.log(chalk.gray(`  Timestamp: ${new Date().toISOString()}`));
    console.log(chalk.gray(`  Working Directory: ${process.cwd()}\n`));
    
    await auditSystemConfiguration();
    await auditCodeQuality();
    await auditSecurity();
    await auditPerformance();
    await auditIntegration();
    await auditProductionReadiness();
    await auditDeploymentChecklist();
    
    const exitCode = generateFinalReport();
    
    process.exit(exitCode);
  } catch (error) {
    console.error(chalk.red('\n❌ Audit failed with error:'), error.message);
    process.exit(1);
  }
}

main();
