/**
 * Tests for cross-platform Python runner script
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'child_process';
import { writeFileSync, unlinkSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const projectRoot = join(import.meta.dirname || __dirname, '..');
const runPythonScript = join(projectRoot, 'scripts', 'run-python.js');

/**
 * Helper function to run the Python runner and capture output
 */
function runPythonRunner(args, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const proc = spawn('node', [runPythonScript, ...args], {
      cwd: projectRoot,
      timeout,
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      resolve({ code, stdout, stderr });
    });

    proc.on('error', (err) => {
      reject(err);
    });
  });
}

test('run-python.js script exists', () => {
  assert.ok(existsSync(runPythonScript), 'run-python.js script should exist');
});

test('run-python.js executes a simple Python script', async () => {
  // Create a temporary Python script
  const testScript = join(tmpdir(), 'test_runner_simple.py');
  writeFileSync(testScript, 'print("Hello from Python")');

  try {
    const result = await runPythonRunner([testScript]);
    
    assert.strictEqual(result.code, 0, 'Should exit with code 0');
    assert.match(result.stdout, /Hello from Python/, 'Should output the expected message');
    assert.match(result.stdout, /Running:.*python/i, 'Should show the Python command being run');
  } finally {
    // Clean up
    if (existsSync(testScript)) {
      unlinkSync(testScript);
    }
  }
});

test('run-python.js passes arguments to Python script', async () => {
  // Create a temporary Python script that prints its arguments
  const testScript = join(tmpdir(), 'test_runner_args.py');
  writeFileSync(testScript, `
import sys
print(f"Args: {' '.join(sys.argv[1:])}")
`);

  try {
    const result = await runPythonRunner([testScript, 'arg1', 'arg2', 'arg3']);
    
    assert.strictEqual(result.code, 0, 'Should exit with code 0');
    assert.match(result.stdout, /Args: arg1 arg2 arg3/, 'Should pass arguments correctly');
  } finally {
    // Clean up
    if (existsSync(testScript)) {
      unlinkSync(testScript);
    }
  }
});

test('run-python.js handles Python module execution with -m flag', async () => {
  // Test with json.tool module which is built-in to Python
  const result = await runPythonRunner(['-m', 'json.tool', '--help']);
  
  // Exit code might be 0 or non-zero depending on Python version, but should execute
  assert.match(result.stdout, /json\.tool|json module/i, 'Should execute the module');
  assert.match(result.stdout, /Running:.*python.*-m.*json\.tool/i, 'Should show module execution command');
});

test('run-python.js detects virtual environment when present', async () => {
  // Create a test script
  const testScript = join(tmpdir(), 'test_runner_venv.py');
  writeFileSync(testScript, 'import sys; print(sys.executable)');

  try {
    const result = await runPythonRunner([testScript]);
    
    assert.strictEqual(result.code, 0, 'Should exit with code 0');
    
    // Check if venv is mentioned in output
    if (result.stdout.includes('virtual environment')) {
      assert.match(result.stdout, /virtual environment/i, 'Should detect and use virtual environment');
    } else {
      assert.match(result.stdout, /system Python/i, 'Should use system Python if venv not found');
    }
  } finally {
    // Clean up
    if (existsSync(testScript)) {
      unlinkSync(testScript);
    }
  }
});

test('run-python.js fails gracefully for non-existent script', async () => {
  const result = await runPythonRunner(['nonexistent_script.py']);
  
  assert.notStrictEqual(result.code, 0, 'Should exit with non-zero code');
  const output = result.stdout + result.stderr;
  assert.match(output, /not found/i, 'Should show error message about missing script');
});

test('run-python.js shows usage when no arguments provided', async () => {
  const result = await runPythonRunner([]);
  
  assert.notStrictEqual(result.code, 0, 'Should exit with non-zero code');
  assert.match(result.stderr, /No Python script specified/i, 'Should show usage error');
  assert.match(result.stderr, /Usage:/i, 'Should show usage instructions');
});
