#!/usr/bin/env node
require('dotenv').config();
const axios = require('axios');
const readline = require('readline');
const mongoose = require('mongoose');
const { performance } = require('perf_hooks');
const path = require('path');
const { table } = require('table');
const chalk = require('chalk');

// Connect to database
const connectDB = async () => {
  try {
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/uplinkdb';
    console.log("Attempting to connect to MongoDB...");
    
    // Set mongoose options for better error handling
    mongoose.set('strictQuery', false);
    
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000
    });
    
    console.log('Database connected successfully');
    
    // Import Monitor model after connection
    const { Monitor } = require('./Database/module.monitor');
    const { MonitorCheck } = require('./Database/module.monitorCheck');
    return { Monitor, MonitorCheck };
  } catch (error) {
    console.error('Database connection error:', error.message);
    console.log('Trying fallback to local MongoDB...');
    
    try {
      const fallbackUrl = 'mongodb://localhost:27017/uplinkdb';
      await mongoose.connect(fallbackUrl, { 
        serverSelectionTimeoutMS: 5000 
      });
      console.log('Connected to local MongoDB successfully');
      
      const { Monitor } = require('./Database/module.monitor');
      const { MonitorCheck } = require('./Database/module.monitorCheck');
      return { Monitor, MonitorCheck };
    } catch (fallbackError) {
      console.error('All connection attempts failed:', fallbackError.message);
      console.log('Cannot continue without database connection');
      process.exit(1);
    }
  }
};

// Monitor a single URL and return metrics
async function checkUrl(url) {
  console.log(`Checking ${url}...`);
  const startTime = performance.now();
  let status = 'down';
  let responseTime = 0;
  let statusCode = null;
  let error = null;
  
  try {
    const response = await axios.get(url, {
      timeout: 10000, // 10 sec timeout
      validateStatus: () => true // Don't throw on error status codes
    });
    
    statusCode = response.status;
    responseTime = Math.round(performance.now() - startTime);
    status = (statusCode >= 200 && statusCode < 400) ? 'up' : 'down';
  } catch (err) {
    responseTime = Math.round(performance.now() - startTime);
    error = err.message;
  }
  
  return {
    url,
    status,
    responseTime,
    statusCode,
    timestamp: new Date(),
    error
  };
}

// Function to check multiple monitors and display results
async function checkMonitors(monitors) {
  console.log('\nChecking website status...\n');
  
  const results = [];
  for (const monitor of monitors) {
    const result = await checkUrl(monitor.url);
    results.push({
      id: monitor._id,
      name: monitor.name,
      url: monitor.url,
      status: result.status,
      responseTime: result.responseTime,
      statusCode: result.statusCode,
      error: result.error
    });
  }
  
  // Display results as table
  displayResultsTable(results);
  return results;
}

// Function to display results as a table
function displayResultsTable(results) {
  const tableData = [
    ['Name', 'URL', 'Status', 'Response Time', 'Status Code']
  ];
  
  results.forEach(result => {
    const statusDisplay = result.status === 'up' 
      ? chalk.green('UP') 
      : chalk.red('DOWN');
      
    tableData.push([
      result.name,
      result.url,
      statusDisplay,
      `${result.responseTime}ms`,
      result.statusCode || 'N/A'
    ]);
  });
  
  console.log(table(tableData));
}

// Interactive mode for the CLI
function startInteractiveMode({ Monitor, MonitorCheck }) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  console.log('\n=== UpLink Terminal Monitor ===');
  console.log('\nCommands:');
  console.log('  list              - List all monitors');
  console.log('  check <id>        - Check status of a specific monitor');
  console.log('  checkall          - Check status of all monitors');
  console.log('  add <url> <name>  - Add a new website to monitor');
  console.log('  history <id>      - View history of a monitor');
  console.log('  exit              - Exit the program');
  console.log('');
  
  function promptUser() {
    rl.question('monitor> ', async (input) => {
      const [command, ...args] = input.trim().split(' ');
      
      try {
        switch (command.toLowerCase()) {
          case 'list':
            await listMonitors(Monitor);
            break;
            
          case 'check':
            if (!args[0]) {
              console.log('Error: Missing monitor ID. Usage: check <id>');
            } else {
              await checkMonitor(Monitor, MonitorCheck, args[0]);
            }
            break;
            
          case 'checkall':
            await checkAllMonitors(Monitor, MonitorCheck);
            break;
            
          case 'add':
            if (args.length < 2) {
              console.log('Error: Missing URL or name. Usage: add <url> <name>');
            } else {
              const url = args[0];
              const name = args.slice(1).join(' ');
              await addMonitor(Monitor, url, name);
            }
            break;
            
          case 'history':
            if (!args[0]) {
              console.log('Error: Missing monitor ID. Usage: history <id>');
            } else {
              await showHistory(Monitor, MonitorCheck, args[0]);
            }
            break;
            
          case 'exit':
          case 'quit':
            console.log('Exiting...');
            rl.close();
            process.exit(0);
            break;
            
          default:
            console.log('Unknown command. Type "help" for available commands.');
        }
      } catch (error) {
        console.error('Error:', error.message);
      }
      
      promptUser();
    });
  }
  
  promptUser();
}

// List all monitors
async function listMonitors(Monitor) {
  const monitors = await Monitor.find().lean();
  
  if (monitors.length === 0) {
    console.log('No monitors found.');
    return;
  }
  
  const tableData = [
    ['ID', 'Name', 'URL', 'Current Status']
  ];
  
  monitors.forEach(monitor => {
    const statusDisplay = monitor.status === 'up' 
      ? chalk.green('UP') 
      : chalk.red('DOWN');
      
    tableData.push([
      monitor._id.toString(),
      monitor.name,
      monitor.url,
      statusDisplay
    ]);
  });
  
  console.log(table(tableData));
}

// Check a specific monitor
async function checkMonitor(Monitor, MonitorCheck, id) {
  try {
    const monitor = await Monitor.findById(id);
    if (!monitor) {
      console.log(`Monitor with ID ${id} not found.`);
      return;
    }
    
    const result = await checkUrl(monitor.url);
    
    // Save check to database
    const check = new MonitorCheck({
      monitorId: monitor._id,
      status: result.status,
      responseTime: result.responseTime,
      statusCode: result.statusCode || null,
      error: result.error
    });
    await check.save();
    
    // Update monitor status
    monitor.status = result.status;
    monitor.lastChecked = new Date();
    monitor.responseTime = result.responseTime;
    await monitor.save();
    
    // Display result
    console.log('\nCheck Result:');
    console.log(`Name: ${monitor.name}`);
    console.log(`URL: ${monitor.url}`);
    console.log(`Status: ${result.status === 'up' ? chalk.green('UP') : chalk.red('DOWN')}`);
    console.log(`Response Time: ${result.responseTime}ms`);
    console.log(`Status Code: ${result.statusCode || 'N/A'}`);
    if (result.error) console.log(`Error: ${result.error}`);
    console.log(`Timestamp: ${result.timestamp.toISOString()}`);
    console.log('');
  } catch (error) {
    console.error('Error checking monitor:', error.message);
  }
}

// Check all monitors
async function checkAllMonitors(Monitor, MonitorCheck) {
  const monitors = await Monitor.find().lean();
  
  if (monitors.length === 0) {
    console.log('No monitors found.');
    return;
  }
  
  const results = await checkMonitors(monitors);
  
  // Save results to database
  for (const result of results) {
    const check = new MonitorCheck({
      monitorId: result.id,
      status: result.status,
      responseTime: result.responseTime,
      statusCode: result.statusCode || null,
      error: result.error
    });
    await check.save();
    
    // Update monitor status
    await Monitor.findByIdAndUpdate(result.id, {
      status: result.status,
      lastChecked: new Date(),
      responseTime: result.responseTime
    });
  }
}

// Add a new monitor
async function addMonitor(Monitor, url, name) {
  try {
    // Validate URL
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    
    // Check if URL exists
    const existingMonitor = await Monitor.findOne({ url });
    if (existingMonitor) {
      console.log(`Monitor for URL ${url} already exists.`);
      return;
    }
    
    // Create new monitor
    const newMonitor = new Monitor({
      name,
      url,
      status: 'unknown',
      createdAt: new Date()
    });
    
    await newMonitor.save();
    console.log(`Added new monitor: ${name} (${url})`);
    
    // Perform an initial check
    const result = await checkUrl(url);
    
    // Update monitor with initial check
    newMonitor.status = result.status;
    newMonitor.lastChecked = new Date();
    newMonitor.responseTime = result.responseTime;
    await newMonitor.save();
  } catch (error) {
    console.error('Error adding monitor:', error.message);
  }
}

// Show history of a monitor
async function showHistory(Monitor, MonitorCheck, id) {
  try {
    const monitor = await Monitor.findById(id);
    if (!monitor) {
      console.log(`Monitor with ID ${id} not found.`);
      return;
    }
    
    const checks = await MonitorCheck.find({ monitorId: id })
      .sort({ timestamp: -1 })
      .limit(10)
      .lean();
    
    if (checks.length === 0) {
      console.log(`No check history found for "${monitor.name}"`);
      return;
    }
    
    console.log(`\nCheck History for "${monitor.name}" (${monitor.url}):`);
    
    const tableData = [
      ['Time', 'Status', 'Response Time', 'Status Code']
    ];
    
    checks.forEach(check => {
      const statusDisplay = check.status === 'up' 
        ? chalk.green('UP') 
        : chalk.red('DOWN');
        
      tableData.push([
        new Date(check.timestamp).toLocaleString(),
        statusDisplay,
        `${check.responseTime}ms`,
        check.statusCode || 'N/A'
      ]);
    });
    
    console.log(table(tableData));
  } catch (error) {
    console.error('Error showing history:', error.message);
  }
}

// Main function
async function main() {
  try {
    const models = await connectDB();
    startInteractiveMode(models);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

// Handle clean shutdown
process.on('SIGINT', () => {
  console.log('\nGracefully shutting down...');
  mongoose.connection.close();
  process.exit(0);
});

// Start the application
main(); 