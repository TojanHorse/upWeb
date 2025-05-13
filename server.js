require('dotenv').config()
// console.log(process.env) // remove this after you've confirmed it is working
const express = require('express')
const path = require('path')
const { userRouter } = require('./Routes/User')
const { adminRouter } = require('./Routes/admin')
const { contributorRouter } = require('./Routes/contributer')
const { monitorRouter } = require('./Routes/monitor')
const { DatabaseConnect } = require('./Database/module.db')
const VerificationService = require('./utils/verificationService')
const cors = require('cors')
const monitoringService = require('./services/monitoringService')
const jwt = require('jsonwebtoken')

// Initialize express app
const app = express()
const PORT = process.env.PORT || 3000
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/uplinkdb'

// Set default frontend URL if not provided in environment variables
process.env.FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173'
// Set backend URL for email links
process.env.BACKEND_URL = process.env.BACKEND_URL || `http://localhost:${PORT}`

// Middlewares
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Request logging middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    next();
})

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')))

// API Routes with proper prefixes
app.use("/api/user", userRouter)
app.use("/api/contributor", contributorRouter)
app.use("/api/admin", adminRouter)
app.use("/api/monitor", monitorRouter)

// Legacy routes for backward compatibility
app.use("/user", userRouter)
app.use("/contributor", contributorRouter)
app.use("/admin", adminRouter)
app.use("/monitor", monitorRouter)

// Root route for API information
app.get('/', (req, res) => {
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
    })
})

// API info route - same as root for convenience
app.get('/api', (req, res) => {
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
    })
})

// Test route for debugging
app.get('/test', (req, res) => {
    res.json({
        success: true,
        message: 'API test successful',
        timestamp: new Date().toISOString()
    })
})

// Add auth debug routes
app.get('/debug/auth', (req, res) => {
    const authHeader = req.headers.authorization;
    res.json({
        message: 'Auth debug information',
        hasAuthHeader: !!authHeader,
        authHeader: authHeader ? `${authHeader.substring(0, 15)}...` : null,
        timestamp: new Date().toISOString()
    });
});

// Add token debug route
app.post('/debug/token', (req, res) => {
    try {
        const { token, secret } = req.body;
        if (!token) {
            return res.status(400).json({ error: 'Token is required' });
        }
        
        let decoded;
        try {
            // Try to decode with all possible secrets
            if (secret === 'user') {
                decoded = jwt.verify(token, process.env.USER_JWT_SECRET);
            } else if (secret === 'contributor') {
                decoded = jwt.verify(token, process.env.CONTRIBUTOR_JWT_SECRET);
            } else if (secret === 'admin') {
                decoded = jwt.verify(token, process.env.ADMIN_JWT_SECRET);
            } else {
                // Try all secrets
                try {
                    decoded = jwt.verify(token, process.env.USER_JWT_SECRET);
                    secret = 'user';
                } catch (e) {
                    try {
                        decoded = jwt.verify(token, process.env.CONTRIBUTOR_JWT_SECRET);
                        secret = 'contributor';
                    } catch (e) {
                        try {
                            decoded = jwt.verify(token, process.env.ADMIN_JWT_SECRET);
                            secret = 'admin';
                        } catch (e) {
                            return res.status(400).json({ error: 'Invalid token. Could not decode with any secret.' });
                        }
                    }
                }
            }
            
            res.json({
                valid: true,
                secret,
                payload: {
                    ...decoded,
                    exp: new Date(decoded.exp * 1000).toISOString(),
                    iat: new Date(decoded.iat * 1000).toISOString()
                }
            });
        } catch (error) {
            res.json({
                valid: false,
                error: error.message
            });
        }
    } catch (error) {
        res.status(500).json({ error: 'Server error when decoding token' });
    }
});

// Test route for debug signup
app.post('/test/signup', (req, res) => {
    console.log('Test signup received:', req.body);
    res.json({
        success: true,
        message: 'Test signup successful',
        receivedData: req.body
    })
})

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack)
    res.status(500).json({ error: 'Something went wrong!' })
})

// Set up scheduled task to clean up expired codes every 5 minutes
function setupScheduledTasks() {
    setInterval(async () => {
        try {
            console.log('Running scheduled cleanup of expired verification codes');
            const clearedCount = await VerificationService.cleanupExpiredCodes();
            console.log(`Scheduled cleanup complete. Cleared ${clearedCount} expired codes.`);
        } catch (error) {
            console.error('Error in scheduled cleanup task:', error);
        }
    }, 5 * 60 * 1000); // Run every 5 minutes
    
    // Initialize the monitoring service
    monitoringService.scheduleMonitorChecks().catch(error => {
        console.error('Failed to initialize monitoring service:', error);
    });
}

// Connect to database and start server
async function startServer() {
    try {
        // Connect to MongoDB
        await DatabaseConnect(MONGODB_URI)
        
        // Start the server
        app.listen(PORT, () => {
            console.log(`API server running on port ${PORT}`)
            console.log(`API available at http://localhost:${PORT}/api`)
            
            // Set up scheduled tasks
            setupScheduledTasks();
        })
    } catch (error) {
        console.error('Failed to start server:', error)
        process.exit(1)
    }
}

startServer()