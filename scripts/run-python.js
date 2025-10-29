#!/usr/bin/env node

/**
 * Cross-platform Python runner with virtual environment support
 *
 * This script handles running Python scripts in a cross-platform way,
 * automatically detecting and activating virtual environments on both
 * Windows and Unix-like systems.
 *
 * Usage: node scripts/run-python.js <python_script> [args...]
 */

import { spawn } from "child_process";
import { existsSync } from "fs";
import { resolve, join } from "path";
import { platform } from "os";

// Get the script to run from command line arguments
const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("Error: No Python script specified");
  console.error("Usage: node scripts/run-python.js <python_script> [args...]");
  console.error("       node scripts/run-python.js -m <module> [args...]");
  process.exit(1);
}

// Check if running as a module (-m flag)
const isModule = args[0] === "-m";
const scriptToRun = isModule ? args[1] : args[0];
const scriptArgs = isModule ? args.slice(2) : args.slice(1);
const moduleArgs = isModule ? ["-m"] : [];

// Determine the project root (parent of scripts directory)
const projectRoot = resolve(import.meta.dirname || __dirname, "..");

// Detect the virtual environment path based on the platform
const isWindows = platform() === "win32";
const venvPath = join(projectRoot, ".venv");
const venvExists = existsSync(venvPath);

let pythonExecutable = "python";

// If virtual environment exists, use its Python executable
if (venvExists) {
  if (isWindows) {
    // Windows: .venv\Scripts\python.exe
    const windowsPython = join(venvPath, "Scripts", "python.exe");
    if (existsSync(windowsPython)) {
      pythonExecutable = windowsPython;
      console.log(`Using Python from virtual environment: ${windowsPython}`);
    } else {
      console.log(
        "Virtual environment found but Python executable not found. Using system Python.",
      );
    }
  } else {
    // Unix: .venv/bin/python
    const unixPython = join(venvPath, "bin", "python");
    if (existsSync(unixPython)) {
      pythonExecutable = unixPython;
      console.log(`Using Python from virtual environment: ${unixPython}`);
    } else {
      console.log(
        "Virtual environment found but Python executable not found. Using system Python.",
      );
    }
  }
} else {
  console.log("Virtual environment not found. Using system Python.");
  console.log(
    "Tip: Run install-and-run.sh (Unix) or install-and-run.bat (Windows) to set up the environment.",
  );
}

// Resolve the full path to the script (only if not running as module)
let fullScriptPath = scriptToRun;
if (!isModule) {
  fullScriptPath = resolve(projectRoot, scriptToRun);

  // Check if the script exists
  if (!existsSync(fullScriptPath)) {
    console.error(`Error: Python script not found: ${fullScriptPath}`);
    process.exit(1);
  }
}

const displayScript = isModule ? `-m ${scriptToRun}` : fullScriptPath;
console.log(
  `Running: ${pythonExecutable} ${displayScript} ${scriptArgs.join(" ")}`,
);
console.log("");

// Spawn the Python process
const commandArgs = isModule
  ? ["-m", scriptToRun, ...scriptArgs]
  : [fullScriptPath, ...scriptArgs];

const pythonProcess = spawn(pythonExecutable, commandArgs, {
  stdio: "inherit",
  cwd: projectRoot,
  env: {
    ...process.env,
    PYTHONUNBUFFERED: "1", // Ensure Python output is not buffered
  },
});

// Handle process exit
pythonProcess.on("exit", (code) => {
  process.exit(code || 0);
});

// Handle errors
pythonProcess.on("error", (err) => {
  console.error(`Failed to start Python process: ${err.message}`);
  process.exit(1);
});
