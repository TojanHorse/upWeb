// Load environment variables
require('dotenv').config();

// Core dependencies
const express = require('express');
const path = require('path');
const http = require('http');
const cors = require('cors');

// Routes
const { userRouter } = require('./Routes/User');
const { adminRouter } = require('./Routes/admin');
const { contributorRouter } = require('./Routes/contributer');
const { monitorRouter } = require('./Routes/monitor');

// Database and services
const { DatabaseConnect } = require('./Database/module.db');
const VerificationService = require('./utils/verificationService');
const monitoringService = require('./services/monitoringService');
const WebSocketService = require('./services/websocketService');

// Authentication
const { Clerk } = require('@clerk/clerk-sdk-node');
const jwt = require('jsonwebtoken');

// Initialize express app and server
const app = express();
const PORT = process.env.PORT || 3001;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/uplinkdb';

// Create HTTP server
const server = http.createServer(app);

// Initialize WebSocket service
const websocketService = new WebSocketService(server);
console.log('WebSocket service initialized');

// Initialize Clerk authentication
const clerkSecretKey = process.env.CLERK_SECRET_KEY || 'sk_test_VBeSmbzGKzeMdiMfQaB86TpVscMJmpKU28Ty6OodUS';
const clerk = new Clerk({ secretKey: clerkSecretKey });
console.log('✅ Clerk authentication initialized');

// CORS Configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',') 
  : ['http://localhost:5173'];

// Apply middleware
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// Authentication middleware
const authMiddleware = async (req, res, next) => {
  try {
    // Check for Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.auth = null;
      return next();
    }

    // Extract token
    const token = authHeader.split(' ')[1];
    
    try {
      // Verify with Clerk
      const verifiedToken = await clerk.verifyToken(token);
      
      if (verifiedToken) {
        // Get user data from Clerk
        const user = await clerk.users.getUser(verifiedToken.sub);
        
        // Set auth data for downstream use
        req.auth = {
          userId: user.id,
          sessionId: verifiedToken.sid,
          role: user.publicMetadata.role || 'user',
          isVerified: user.emailAddresses[0]?.verification?.status === 'verified'
        };
      } else {
        req.auth = null;
      }
    } catch (error) {
      console.error('Clerk token verification error:', error);
      req.auth = null;
    }

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    req.auth = null;
    next();
  }
};

// Apply auth middleware
app.use(authMiddleware);

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use("/api/user", userRouter);
app.use("/api/contributor", contributorRouter);
app.use("/api/admin", adminRouter);
app.use("/api/monitor", monitorRouter);

// API Info Route
app.get(['/', '/api'], (req, res) => {
  res.json({ 
    message: 'Welcome to UpLink API',
    description: 'Decentralized website monitoring platform',
    version: '1.0.0',
    endpoints: {
      user: '/api/user',
      contributor: '/api/contributor',
      admin: '/api/admin',
      monitor: '/api/monitor'
    }
  });
});

// Test route
app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'API test successful',
    timestamp: new Date().toISOString()
  });
});

// Auth test endpoint
app.get('/api/auth/me', (req, res) => {
  if (req.auth) {
    res.json({
      success: true,
      auth: req.auth,
      message: 'Authentication successful'
    });
  } else {
    res.status(401).json({
      success: false,
      message: 'Not authenticated'
    });
  }
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: err.message,
    path: req.path
  });
});

// Handle uncaught exceptions
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Promise Rejection:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

// Set up scheduled tasks
function setupScheduledTasks() {
  // Cleanup expired verification codes
  setInterval(async () => {
    try {
      console.log('Running scheduled cleanup of expired verification codes');
      const clearedCount = await VerificationService.cleanupExpiredCodes();
      console.log(`Scheduled cleanup complete. Cleared ${clearedCount} expired codes.`);
    } catch (error) {
      console.error('Error in scheduled cleanup task:', error);
    }
  }, 5 * 60 * 1000); // Every 5 minutes
  
  // Initialize monitoring service
  monitoringService.scheduleMonitorChecks().catch(error => {
    console.error('Failed to initialize monitoring service:', error);
  });
}

// Initialize dashboard components
async function initializeDashboards() {
  console.log('Initializing dashboard components...');
  
  try {
    // Initialize user dashboard
    const { User } = require('./Database/module.user');
    const userCount = await User.countDocuments();
    console.log(`✅ User dashboard initialized. Found ${userCount} registered users.`);
    
    // Initialize contributor dashboard
    const { Contributor } = require('./Database/module.contibuter');
    const contributorCount = await Contributor.countDocuments();
    console.log(`✅ Contributor dashboard initialized. Found ${contributorCount} registered contributors.`);
    
    // Initialize admin dashboard
    const { Admin } = require('./Database/module.admin');
    const adminCount = await Admin.countDocuments();
    console.log(`✅ Admin dashboard initialized. Found ${adminCount} registered admins.`);
    
    // Initialize monitor data
    const { Monitor } = require('./Database/module.monitor');
    const { Website } = require('./Database/module.websites');
    const { MonitorCheck } = require('./Database/module.monitorCheck');
    
    const monitorCount = await Monitor.countDocuments();
    const websiteCount = await Website.countDocuments();
    const checkCount = await MonitorCheck.countDocuments();
    
    console.log(`✅ Monitor system initialized:`);
    console.log(`   - Websites: ${websiteCount}`);
    console.log(`   - Monitors: ${monitorCount}`);
    console.log(`   - Monitor checks: ${checkCount}`);
    
    console.log('All dashboard components initialized successfully!');
    return { 
      success: true, 
      stats: { 
        userCount, 
        contributorCount, 
        adminCount, 
        monitorCount, 
        websiteCount, 
        checkCount 
      } 
    };
  } catch (error) {
    console.error('❌ Failed to initialize dashboards:', error);
    throw error;
  }
}

// Connect to database and start server
async function startServer() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    const dbConnected = await DatabaseConnect(MONGODB_URI);
    
    if (!dbConnected) {
      console.log('❌ Failed to connect to database. Starting with limited functionality.');
    } else {
      console.log('✅ Database connected successfully');
    }
    
    // Setup scheduled tasks
    console.log('Setting up scheduled tasks...');
    setupScheduledTasks();
    console.log('✅ Scheduled tasks set up');
    
    // Initialize dashboards 
    console.log('Initializing dashboard components...');
    try {
      const dashboardStats = await initializeDashboards();
      console.log('✅ Dashboard components initialized');
      
      // Connect WebSocket service to monitoring service
      console.log('Connecting WebSocket service to monitoring service...');
      monitoringService.setWebSocketService(websocketService);
      console.log('✅ WebSocket service connected to monitoring');
      
      // Initialize monitoring system
      console.log('Initializing monitoring service...');
      await monitoringService.initializeMonitoring();
      console.log('✅ Monitoring service initialized');
    } catch (error) {
      console.error('⚠️ Some components failed to initialize:', error.message);
      console.log('Continuing with limited functionality...');
    }
    
    // Start the server
    server.listen(PORT, () => {
      console.log(`\n=== SERVER STARTED SUCCESSFULLY ===`);
      console.log(`API server running on port ${PORT}`);
      console.log(`API available at http://localhost:${PORT}/api`);
      console.log(`WebSocket server running on ws://localhost:${PORT}`);
      
      console.log(`===================================\n`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the application
startServer();