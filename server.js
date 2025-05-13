require('dotenv').config()
// console.log(process.env) // remove this after you've confirmed it is working
const express = require('express')
const { userRouter } = require('./Routes/User')
const { adminRouter } = require('./Routes/admin')
const { contributorRouter } = require('./Routes/contributer')
const { monitorRouter } = require('./Routes/monitor')
const { DatabaseConnect } = require('./Database/module.db')
const VerificationService = require('./utils/verificationService')
const cors = require('cors')

// Initialize express app
const app = express()
const PORT = process.env.PORT || 3000
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/uplinkdb'

// Set default frontend URL if not provided in environment variables
process.env.FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173'

// Middlewares
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Routes
app.use("/user", userRouter)
app.use("/contributor", contributorRouter)
app.use("/admin", adminRouter)
app.use("/monitor", monitorRouter)

// Root route
app.get('/', (req, res) => {
    res.json({ 
        message: 'Welcome to UpLink API',
        description: 'Decentralized website monitoring platform',
        version: '1.0.0'
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
}

// Connect to database and start server
async function startServer() {
    try {
        // Connect to MongoDB
        await DatabaseConnect(MONGODB_URI)
        
        // Start the server
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`)
            
            // Set up scheduled tasks
            setupScheduledTasks();
        })
    } catch (error) {
        console.error('Failed to start server:', error)
        process.exit(1)
    }
}

startServer()