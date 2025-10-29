#!/usr/bin/env node
/**
 * Git Environment Setup Script
 * Ensures git environment is properly configured for testing and CI/CD
 * 
 * This script:
 * - Fetches all branches to ensure refs/heads/main is available
 * - Configures git for safe operation in CI/CD environments
 * - Provides defensive setup to prevent "unknown revision" errors
 */

import { execSync } from 'child_process';
import chalk from 'chalk';

console.log(chalk.cyan('Setting up Git environment...'));

try {
    // Check if we're in a git repository
    try {
        execSync('git rev-parse --git-dir', { stdio: 'pipe' });
    } catch (error) {
        console.log(chalk.yellow('Not in a git repository, skipping git setup'));
        process.exit(0);
    }

    // Fetch all branches to ensure refs are available
    console.log(chalk.gray('Fetching all branches...'));
    try {
        execSync('git fetch --all --tags', { stdio: 'pipe' });
        console.log(chalk.green('✓ Fetched all branches'));
    } catch (error) {
        // In some environments (like GitHub Actions checkout with depth=0), fetch might not be needed
        console.log(chalk.yellow('⚠ Could not fetch branches (may not be necessary)'));
    }

    // Check if main branch exists locally or remotely
    let mainBranchExists = false;
    try {
        execSync('git rev-parse --verify refs/heads/main', { stdio: 'pipe' });
        mainBranchExists = true;
        console.log(chalk.green('✓ main branch exists locally'));
    } catch (error) {
        console.log(chalk.gray('main branch not found locally, checking remote...'));
        
        try {
            execSync('git rev-parse --verify refs/remotes/origin/main', { stdio: 'pipe' });
            console.log(chalk.yellow('main branch exists remotely, creating local tracking branch'));
            try {
                execSync('git branch main origin/main', { stdio: 'pipe' });
                mainBranchExists = true;
                console.log(chalk.green('✓ Created local main branch tracking origin/main'));
            } catch (createError) {
                console.log(chalk.yellow('⚠ Could not create local main branch'));
            }
        } catch (remoteError) {
            console.log(chalk.yellow('⚠ main branch not found remotely either'));
        }
    }

    // Display current branch
    try {
        const currentBranch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
        console.log(chalk.cyan(`Current branch: ${currentBranch}`));
    } catch (error) {
        console.log(chalk.yellow('⚠ Could not determine current branch'));
    }

    console.log(chalk.green('✓ Git environment setup complete'));
    process.exit(0);

} catch (error) {
    console.error(chalk.red('Error setting up git environment:'), error.message);
    // Don't fail the build for git setup issues
    console.log(chalk.yellow('Continuing despite git setup errors...'));
    process.exit(0);
}
