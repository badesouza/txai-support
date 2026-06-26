#!/usr/bin/env node
/**
 * Cross-platform development startup script
 * Detects OS and runs the appropriate script (bash for Mac/Linux, PowerShell for Windows)
 */

const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const scriptDir = __dirname;
const isWindows = process.platform === 'win32';

let scriptPath;
if (isWindows) {
  scriptPath = path.join(scriptDir, 'dev-start.ps1');
  // Check if PowerShell script exists
  if (!fs.existsSync(scriptPath)) {
    console.error('❌ PowerShell script not found:', scriptPath);
    process.exit(1);
  }
  
  // Run PowerShell script - use spawn for better stream handling
  const ps = spawn('powershell.exe', [
    '-ExecutionPolicy', 'Bypass',
    '-NoProfile',
    '-File', scriptPath
  ], {
    cwd: process.cwd(),
    stdio: 'inherit',
    shell: false
  });
  
  ps.on('error', (error) => {
    console.error('❌ Failed to start PowerShell script:', error.message);
    console.error('💡 Make sure PowerShell is installed and available in PATH');
    process.exit(1);
  });
  
  ps.on('exit', (code) => {
    process.exit(code || 0);
  });
} else {
  // Mac/Linux - use bash script
  scriptPath = path.join(scriptDir, 'dev-start.sh');
  
  // Check if bash script exists
  if (!fs.existsSync(scriptPath)) {
    console.error('❌ Bash script not found:', scriptPath);
    process.exit(1);
  }
  
  // Make sure script is executable
  try {
    fs.chmodSync(scriptPath, '755');
  } catch (err) {
    // Ignore chmod errors on Windows or if already executable
  }
  
  // Run bash script
  const bash = exec(`bash "${scriptPath}"`, {
    cwd: process.cwd(),
    stdio: 'inherit'
  });
  
  bash.on('error', (error) => {
    console.error('❌ Failed to start bash script:', error.message);
    console.error('💡 Make sure bash is installed and available in PATH');
    process.exit(1);
  });
  
  bash.on('exit', (code) => {
    process.exit(code || 0);
  });
}

