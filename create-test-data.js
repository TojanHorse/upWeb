/**
 * Create test data for monitoring and dashboard functionality
 * This script creates test websites, monitors, and check data
 * for both users and contributors
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { DatabaseConnect } = require('./Database/module.db');
const { User } = require('./Database/module.user');
const { Contributor } = require('./Database/module.contibuter');
const { Website } = require('./Database/module.websites');
const { Monitor } = require('./Database/module.monitor');
const { MonitorCheck } = require('./Database/module.monitorCheck');

// MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/uplinkdb';

// Helper function to print section headers
function printSection(title) {
  console.log('\n' + '='.repeat(80));
  console.log(title);
  console.log('='.repeat(80));
}

async function createTestData() {
  try {
    printSection('CONNECTING TO DATABASE');
    await DatabaseConnect(MONGODB_URI);
    
    // After connecting to the database
    console.log('Database Connected Successfully');
    console.log('\n' + '='.repeat(80));
    
    // Create a test user with known credentials for login testing
    async function createTestLoginUser() {
      console.log('CREATING TEST LOGIN USER');
      console.log('=' + '='.repeat(79));
      
      const bcrypt = require('bcrypt');
      const { User } = require('./Database/module.user');
      const { UserWallet } = require('./Database/module.userWallet');
      
      // Test user credentials - MAKE NOTE OF THESE
      const testUser = {
        name: 'Test Login User',
        email: 'testuser@example.com',
        password: 'Password123' // Plain text for reference
      };
      
      // Check if test user already exists
      let user = await User.findOne({ email: testUser.email });
      
      if (user) {
        console.log(`Test user already exists: ${testUser.email}`);
        console.log(`Password is: ${testUser.password}`);
      } else {
        // Create new test user with known credentials
        const hashedPassword = await bcrypt.hash(testUser.password, 10);
        
        user = new User({
          name: testUser.name,
          email: testUser.email,
          password: hashedPassword,
          isEmailVerified: true
        });
        
        await user.save();
        
        // Create wallet for the user
        const wallet = new UserWallet({
          user: user._id,
          balance: 100.00,
          currency: 'USD'
        });
        
        await wallet.save();
        
        console.log(`Created test user: ${testUser.email}`);
        console.log(`Password is: ${testUser.password}`);
      }
      
      return user;
    }

    await createTestLoginUser();
    
    // Find existing test users and contributors
    printSection('FINDING EXISTING USERS');
    const users = await User.find();
    const contributors = await Contributor.find();
    
    if (users.length === 0) {
      console.log('No users found. Please create a user first.');
      return;
    }
    
    if (contributors.length === 0) {
      console.log('No contributors found. Please create a contributor first.');
      return;
    }
    
    console.log(`Found ${users.length} users and ${contributors.length} contributors`);
    
    // Get the first user and contributor
    const testUser = users[0];
    const testContributor = contributors[0];
    
    console.log(`Using test user: ${testUser.email}`);
    console.log(`Using test contributor: ${testContributor.email}`);
    
    // Create test websites
    printSection('CREATING TEST WEBSITES');
    
    // First check if we already have test websites
    const existingWebsites = await Website.find({
      $or: [
        { owner: testUser._id },
        { contributors: testContributor._id }
      ]
    });
    
    if (existingWebsites.length > 0) {
      console.log(`Found ${existingWebsites.length} existing websites, skipping creation`);
    } else {
      // Create websites for the user
      const userWebsite1 = new Website({
        name: 'Test User Website 1',
        url: 'https://example.com',
        owner: testUser._id,
        contributors: [testContributor._id],
        status: 'active',
        category: 'E-commerce'
      });
      
      const userWebsite2 = new Website({
        name: 'Test User Website 2',
        url: 'https://test.com',
        owner: testUser._id,
        contributors: [testContributor._id],
        status: 'active',
        category: 'Blog'
      });
      
      await userWebsite1.save();
      await userWebsite2.save();
      
      console.log('Created two test websites for the user');
    }
    
    // Get all websites for both user and contributor
    const websites = await Website.find({
      $or: [
        { owner: testUser._id },
        { contributors: testContributor._id }
      ]
    });
    
    console.log(`Found ${websites.length} websites to use for monitors`);
    
    if (websites.length === 0) {
      console.log('No websites available to create monitors');
      return;
    }
    
    // Create monitors for each website
    printSection('CREATING TEST MONITORS');
    
    // Check for existing monitors
    const existingMonitors = await Monitor.find({
      website: { $in: websites.map(w => w._id) }
    });
    
    if (existingMonitors.length > 0) {
      console.log(`Found ${existingMonitors.length} existing monitors, skipping creation`);
    } else {
      // Create different types of monitors for each website
      for (const website of websites) {
        // HTTP monitor
        const httpMonitor = new Monitor({
          website: website._id,
          name: `${website.name} - HTTP Check`,
          url: website.url,
          type: 'http',
          interval: 300,
          timeout: 30000,
          alertThreshold: 1,
          locations: ['us-east', 'eu-central'],
          expectedStatusCode: 200,
          active: true,
          alertContacts: [testUser.email],
          statusPagePublic: true
        });
        
        // SSL monitor
        const sslMonitor = new Monitor({
          website: website._id,
          name: `${website.name} - SSL Check`,
          url: website.url,
          type: 'ssl',
          interval: 900,
          timeout: 30000,
          alertThreshold: 1,
          locations: ['us-east'],
          active: true,
          alertContacts: [testUser.email],
          statusPagePublic: true
        });
        
        await httpMonitor.save();
        await sslMonitor.save();
        
        console.log(`Created HTTP and SSL monitors for ${website.name}`);
      }
    }
    
    // Get all monitors
    const monitors = await Monitor.find({
      website: { $in: websites.map(w => w._id) }
    });
    
    console.log(`Found ${monitors.length} monitors to use for checks`);
    
    if (monitors.length === 0) {
      console.log('No monitors available to create checks');
      return;
    }
    
    // Create monitor checks
    printSection('CREATING TEST MONITOR CHECKS');
    
    // Check for existing checks
    const existingChecks = await MonitorCheck.find({
      monitor: { $in: monitors.map(m => m._id) }
    });
    
    if (existingChecks.length > 20) {
      console.log(`Found ${existingChecks.length} existing checks, skipping creation`);
    } else {
      // Create some successful and failed checks for each monitor
      for (const monitor of monitors) {
        // Get website for this monitor
        const website = websites.find(w => w._id.toString() === monitor.website.toString());
        
        // Create 10 successful checks
        for (let i = 0; i < 10; i++) {
          const checkDate = new Date();
          checkDate.setHours(checkDate.getHours() - i);
          
          const check = new MonitorCheck({
            monitor: monitor._id,
            website: website._id,
            timestamp: checkDate,
            success: true,
            statusCode: 200,
            responseTime: Math.floor(Math.random() * 500) + 100, // Random between 100-600ms
            location: 'us-east',
            performedBy: testUser._id,
            incidentCreated: false,
            paymentProcessed: true
          });
          
          await check.save();
        }
        
        // Create 2 failed checks
        for (let i = 0; i < 2; i++) {
          const checkDate = new Date();
          checkDate.setHours(checkDate.getHours() - (i + 15)); // Put failures further back
          
          const check = new MonitorCheck({
            monitor: monitor._id,
            website: website._id,
            timestamp: checkDate,
            success: false,
            statusCode: 500,
            responseTime: Math.floor(Math.random() * 1000) + 500, // Random between 500-1500ms
            errorMessage: 'Internal Server Error',
            location: 'us-east',
            performedBy: testUser._id,
            incidentCreated: true,
            paymentProcessed: true
          });
          
          await check.save();
        }
        
        console.log(`Created 12 checks for ${monitor.name}`);
      }
    }
    
    // Count total checks
    const totalChecks = await MonitorCheck.countDocuments({
      monitor: { $in: monitors.map(m => m._id) }
    });
    
    printSection('TEST DATA SUMMARY');
    console.log(`Created or found:`);
    console.log(`- ${websites.length} websites`);
    console.log(`- ${monitors.length} monitors`);
    console.log(`- ${totalChecks} monitor checks`);
    
    console.log(`\nTest data setup is complete. The dashboard should now show data.`);
    
  } catch (error) {
    console.error('Error creating test data:', error);
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

// Run the script
createTestData().then(() => {
  console.log('Test data generation completed');
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
}); 