const express = require('express');
const { authenticateUser } = require('./User');
const { authenticateContributor } = require('./contributer');
const { authenticateAdmin } = require('./admin');
const { Monitor } = require('../Database/module.monitor');
const { Incident } = require('../Database/module.incident');
const { MonitorCheck } = require('../Database/module.monitorCheck');
const { Subscription } = require('../Database/module.subscription');
const { Website } = require('../Database/module.websites');
const monitoringService = require('../services/monitoringService');
const razorpay = require('../utils/razorpay');

// Create Express router
const monitorRouter = express.Router();

// Middleware to check if user can access a specific monitor
const canAccessMonitor = async (req, res, next) => {
    try {
        const monitorId = req.params.id;
        const monitor = await Monitor.findById(monitorId);
        
        if (!monitor) {
            return res.status(404).json({ error: 'Monitor not found' });
        }
        
        // Admins can access any monitor
        if (req.admin) {
            req.monitor = monitor;
            return next();
        }
        
        // Check if user is contributor who owns this website
        if (req.contributor) {
            const website = await Website.findById(monitor.website);
            
            if (website && website.contributors.includes(req.contributor.contributorId)) {
                req.monitor = monitor;
                return next();
            }
        }
        
        // Regular users can only check monitors, which is handled in specific routes
        return res.status(403).json({ error: 'You are not authorized to access this monitor' });
    } catch (error) {
        console.error('Authorization error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// CONTRIBUTOR ROUTES

// Create a new monitor
monitorRouter.post('/', authenticateContributor, async (req, res) => {
    try {
        const { name, url, checkFrequency, description } = req.body;
        const contributorId = req.contributor.contributorId;
        
        console.log('Create monitor request:', { name, url, contributorId });
        
        // Validate required fields
        if (!name || !url) {
            return res.status(400).json({ 
                error: 'Name and URL are required for creating a monitor',
                message: 'Please provide both a name and URL for the monitor'
            });
        }

        // Find websites this contributor has access to
        const websites = await Website.find({ contributors: contributorId });
        
        if (!websites || websites.length === 0) {
            return res.status(404).json({ 
                error: 'No website found for this contributor', 
                message: 'You need to have access to at least one website to create a monitor'
            });
        }

        // Use the first website (most contributors will have only one)
        const website = websites[0];
        console.log('Using website for monitor:', website.name);

        // Create new monitor
        const newMonitor = new Monitor({
            website: website._id,
            name,
            url,
            type: 'http',
            interval: checkFrequency || 15,
            description: description || '',
            active: true,
            expectedStatusCode: 200,
            locations: ['us-east']
        });
        
        await newMonitor.save();
        console.log('Monitor created successfully:', newMonitor._id);
        
        res.status(201).json({
            message: 'Monitor created successfully',
            monitor: {
                id: newMonitor._id,
                name: newMonitor.name,
                url: newMonitor.url,
                interval: newMonitor.interval
            }
        });
    } catch (error) {
        console.error('Create monitor error:', error);
        res.status(500).json({ error: 'Internal server error', message: error.message });
    }
});

// USER ROUTES

// Perform a check on a monitor
monitorRouter.post('/check/:id', authenticateUser, async (req, res) => {
    try {
        const monitorId = req.params.id;
        const userId = req.user.userId;
        const { location = 'unknown', locationInfo = {} } = req.body;
        
        // Validate location if needed
        if (!location) {
            return res.status(400).json({ error: 'Location is required' });
        }
        
        // Perform the check with user's location information
        const check = await monitoringService.performMonitorCheck(
            monitorId, 
            userId, 
            location,
            locationInfo
        );
        
        res.json({
            message: 'Check performed successfully',
            check: {
                id: check._id,
                success: check.success,
                statusCode: check.statusCode,
                responseTime: check.responseTime,
                location: check.location,
                timestamp: check.createdAt
            }
        });
    } catch (error) {
        console.error('Perform check error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get available monitors for a user to check
monitorRouter.get('/available', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.userId;
        const monitors = await monitoringService.getAvailableMonitors(userId);
        
        res.json({
            monitors: monitors.map(monitor => ({
                id: monitor._id,
                name: monitor.name,
                type: monitor.type,
                website: monitor.website ? {
                    id: monitor.website._id,
                    name: monitor.website.name,
                    url: monitor.website.url
                } : null
            }))
        });
    } catch (error) {
        console.error('Get available monitors error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get user's check history
monitorRouter.get('/history', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.userId;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        
        const checks = await MonitorCheck.find({ performedBy: userId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('monitor', 'name type url')
            .populate('website', 'name url');
        
        const total = await MonitorCheck.countDocuments({ performedBy: userId });
        
        res.json({
            checks: checks.map(check => ({
                id: check._id,
                monitor: check.monitor ? {
                    id: check.monitor._id,
                    name: check.monitor.name,
                    type: check.monitor.type,
                    url: check.monitor.url
                } : null,
                website: check.website ? {
                    id: check.website._id,
                    name: check.website.name,
                    url: check.website.url
                } : null,
                success: check.success,
                statusCode: check.statusCode,
                responseTime: check.responseTime,
                location: check.location,
                timestamp: check.createdAt
            })),
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Get check history error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get user's monitors
monitorRouter.get('/monitors', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.userId;
        
        // Get all monitors the user has permissions to view
        const monitors = await Monitor.find()
            .populate('website', 'name url')
            .sort({ createdAt: -1 });
        
        // Get all recent checks for uptime calculation
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        
        const monitorIds = monitors.map(m => m._id);
        const recentChecks = await MonitorCheck.find({
            monitor: { $in: monitorIds },
            createdAt: { $gte: thirtyDaysAgo }
        });
        
        // Calculate uptime and status for each monitor
        const monitorsWithStats = monitors.map(monitor => {
            const monitorChecks = recentChecks.filter(check => 
                check.monitor.toString() === monitor._id.toString()
            );
            
            const totalChecks = monitorChecks.length;
            const successfulChecks = monitorChecks.filter(check => check.success).length;
            
            // Calculate uptime percentage
            const uptime = totalChecks > 0 
                ? (successfulChecks / totalChecks * 100).toFixed(2) 
                : 100;
            
            // Determine current status based on most recent check
            const latestCheck = monitorChecks.sort((a, b) => 
                b.createdAt - a.createdAt
            )[0];
            
            const status = !latestCheck ? 'unknown' : 
                latestCheck.success ? 'up' : 'down';
            
            // Calculate average response time
            const avgResponseTime = totalChecks > 0
                ? (monitorChecks.reduce((sum, check) => sum + check.responseTime, 0) / totalChecks).toFixed(0)
                : 0;
            
            return {
                id: monitor._id,
                name: monitor.name,
                url: monitor.url,
                type: monitor.type,
                status,
                uptime: parseFloat(uptime),
                avgResponseTime: parseInt(avgResponseTime),
                lastChecked: latestCheck ? latestCheck.createdAt : null,
                website: monitor.website ? {
                    id: monitor.website._id,
                    name: monitor.website.name,
                    url: monitor.website.url
                } : null
            };
        });
        
        res.json({ monitors: monitorsWithStats });
    } catch (error) {
        console.error('Get user monitors error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get contributor's monitors
monitorRouter.get('/contributor/monitors', authenticateContributor, async (req, res) => {
    try {
        const contributorId = req.contributor.contributorId;
        
        // Find all websites this contributor has access to
        const websites = await Website.find({ contributors: contributorId });
        const websiteIds = websites.map(w => w._id);
        
        // Find all monitors for these websites
        const monitors = await Monitor.find({ website: { $in: websiteIds } })
            .populate('website', 'name url')
            .sort({ createdAt: -1 });
        
        // Get all recent checks for uptime calculation
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        
        const monitorIds = monitors.map(m => m._id);
        const recentChecks = await MonitorCheck.find({
            monitor: { $in: monitorIds },
            createdAt: { $gte: thirtyDaysAgo }
        });
        
        // Calculate uptime and status for each monitor
        const monitorsWithStats = monitors.map(monitor => {
            const monitorChecks = recentChecks.filter(check => 
                check.monitor.toString() === monitor._id.toString()
            );
            
            const totalChecks = monitorChecks.length;
            const successfulChecks = monitorChecks.filter(check => check.success).length;
            
            // Calculate uptime percentage
            const uptime = totalChecks > 0 
                ? (successfulChecks / totalChecks * 100).toFixed(2) 
                : 100;
            
            // Determine current status based on most recent check
            const latestCheck = monitorChecks.sort((a, b) => 
                b.createdAt - a.createdAt
            )[0];
            
            const status = !latestCheck ? 'unknown' : 
                latestCheck.success ? 'up' : 'down';
            
            // Calculate average response time
            const avgResponseTime = totalChecks > 0
                ? (monitorChecks.reduce((sum, check) => sum + check.responseTime, 0) / totalChecks).toFixed(0)
                : 0;
            
            return {
                id: monitor._id,
                name: monitor.name,
                url: monitor.url,
                type: monitor.type,
                status,
                uptime: parseFloat(uptime),
                avgResponseTime: parseInt(avgResponseTime),
                lastChecked: latestCheck ? latestCheck.createdAt : null,
                website: monitor.website ? {
                    id: monitor.website._id,
                    name: monitor.website.name,
                    url: monitor.website.url
                } : null
            };
        });
        
        res.json({ monitors: monitorsWithStats });
    } catch (error) {
        console.error('Get contributor monitors error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get admin's monitors
monitorRouter.get('/admin/monitors', authenticateAdmin, async (req, res) => {
    try {
        // Admin can see all monitors
        const monitors = await Monitor.find()
            .populate('website', 'name url')
            .sort({ createdAt: -1 });
        
        // Get all recent checks for uptime calculation
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        
        const monitorIds = monitors.map(m => m._id);
        const recentChecks = await MonitorCheck.find({
            monitor: { $in: monitorIds },
            createdAt: { $gte: thirtyDaysAgo }
        });
        
        // Calculate uptime and status for each monitor
        const monitorsWithStats = monitors.map(monitor => {
            const monitorChecks = recentChecks.filter(check => 
                check.monitor.toString() === monitor._id.toString()
            );
            
            const totalChecks = monitorChecks.length;
            const successfulChecks = monitorChecks.filter(check => check.success).length;
            
            // Calculate uptime percentage
            const uptime = totalChecks > 0 
                ? (successfulChecks / totalChecks * 100).toFixed(2) 
                : 100;
            
            // Determine current status based on most recent check
            const latestCheck = monitorChecks.sort((a, b) => 
                b.createdAt - a.createdAt
            )[0];
            
            const status = !latestCheck ? 'unknown' : 
                latestCheck.success ? 'up' : 'down';
            
            // Calculate average response time
            const avgResponseTime = totalChecks > 0
                ? (monitorChecks.reduce((sum, check) => sum + check.responseTime, 0) / totalChecks).toFixed(0)
                : 0;
            
            return {
                id: monitor._id,
                name: monitor.name,
                url: monitor.url,
                type: monitor.type,
                status,
                uptime: parseFloat(uptime),
                avgResponseTime: parseInt(avgResponseTime),
                lastChecked: latestCheck ? latestCheck.createdAt : null,
                website: monitor.website ? {
                    id: monitor.website._id,
                    name: monitor.website.name,
                    url: monitor.website.url
                } : null
            };
        });
        
        res.json({ monitors: monitorsWithStats });
    } catch (error) {
        console.error('Get admin monitors error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get monitor details - for authenticated users (all types)
monitorRouter.get('/details/:id', async (req, res) => {
    try {
        const monitorId = req.params.id;
        const days = parseInt(req.query.days) || 30;
        
        // Check authentication
        const user = req.user || req.contributor || req.admin;
        if (!user) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        
        // Get monitor statistics
        const stats = await monitoringService.getMonitorStats(monitorId, { days });
        
        res.json(stats);
    } catch (error) {
        console.error('Get monitor details error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Export the router
module.exports = { monitorRouter };

// Add a test endpoint to help diagnose issues
monitorRouter.get('/test', (req, res) => {
    res.json({
        success: true,
        message: 'Monitor API is working correctly',
        timestamp: new Date().toISOString()
    });
});

// Add debugging endpoint that shows sample monitor data without authentication
monitorRouter.get('/debug/sample', async (req, res) => {
    try {
        const { Monitor } = require('../Database/module.monitor');
        const { MonitorCheck } = require('../Database/module.monitorCheck');
        
        // Get a sample of monitors (limit to 5)
        const monitors = await Monitor.find()
            .populate('website', 'name url')
            .limit(5)
            .sort({ createdAt: -1 });
        
        if (monitors.length === 0) {
            return res.json({
                success: true,
                message: 'No monitors found in the database',
                timestamp: new Date().toISOString(),
                monitors: []
            });
        }
        
        // Get sample check data
        const monitorIds = monitors.map(m => m._id);
        const checks = await MonitorCheck.find({ monitor: { $in: monitorIds } })
            .limit(10)
            .sort({ createdAt: -1 });
        
        res.json({
            success: true,
            message: 'Sample monitor data retrieved',
            timestamp: new Date().toISOString(),
            monitorCount: monitors.length,
            checksCount: checks.length,
            sampleMonitor: monitors[0] ? {
                id: monitors[0]._id,
                name: monitors[0].name,
                url: monitors[0].url,
                type: monitors[0].type,
                website: monitors[0].website ? {
                    id: monitors[0].website._id,
                    name: monitors[0].website.name,
                    url: monitors[0].website.url
                } : null
            } : null
        });
    } catch (error) {
        console.error('Debug sample monitors error:', error);
        res.status(500).json({ 
            error: 'Internal server error',
            message: error.message
        });
    }
}); 