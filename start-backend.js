#!/usr/bin/env node
require('dotenv').config();
const { spawn } = require('child_process');
const path = require('path');

console.log('===========================================');
console.log('🚀 Starting UplinkBe Backend Server');
console.log('===========================================');
console.log('');

// Display environment information
console.log('Environment Configuration:');
console.log(`- Node Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`- Server Port: ${process.env.PORT || 3001}`);

// Mask MongoDB password in URI if present
let displayUri = process.env.MONGODB_URI || 'Not configured';
if (displayUri.includes('@')) {
  const parts = displayUri.split('@');
  const credentialsPart = parts[0];
  const hostPart = parts[1];
  
  // Find the last occurrence of : to identify password
  const lastColonIndex = credentialsPart.lastIndexOf(':');
  const masked = credentialsPart.substring(0, lastColonIndex + 1) + '********';
  displayUri = `${masked}@${hostPart}`;
}

console.log(`- MongoDB URI: ${displayUri}`);
console.log(`- Clerk Auth: ${process.env.CLERK_SECRET_KEY ? 'Configured ✓' : 'Missing ✗'}`);
console.log(`- Email Config: ${process.env.EMAIL_USER ? 'Configured ✓' : 'Missing ✗'}`);
console.log('');

console.log('💡 Terminal Monitoring Tool Available:');
console.log('  To monitor websites via terminal, use:');
console.log('  npm run monitor');
console.log('');

console.log('Starting server with nodemon for auto-reload...');
console.log('');

// Start server using nodemon
const serverProcess = spawn(
  'nodemon', 
  ['server.js'],
  { stdio: 'inherit', shell: true }
);

// Handle process exit
serverProcess.on('close', code => {
  console.log(`Backend server process exited with code ${code}`);
});

process.on('SIGINT', () => {
  console.log('Shutting down backend server...');
  serverProcess.kill();
  process.exit();
}); 