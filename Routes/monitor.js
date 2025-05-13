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
        const { websiteId, name, url, type, interval, locations, expectedStatusCode, alertContacts } = req.body;
        
        // Validate required fields
        if (!websiteId || !name || !url) {
            return res.status(400).json({ error: 'Website ID, name, and URL are required' });
        }
        
        // Check if website belongs to this contributor
        const website = await Website.findById(websiteId);
        if (!website || !website.contributors.includes(req.contributor.contributorId)) {
            return res.status(403).json({ error: 'You do not have permission for this website' });
        }
        
        // Check if active subscription exists for this website
        const subscription = await Subscription.findOne({
            website: websiteId,
            contributor: req.contributor.contributorId,
            status: 'active'
        });
        
        if (!subscription) {
            return res.status(403).json({ error: 'No active subscription for this website' });
        }
        
        // Check if reached maximum monitors for the subscription
        const existingMonitors = await Monitor.countDocuments({ website: websiteId });
        if (existingMonitors >= subscription.maxMonitors) {
            return res.status(400).json({ 
                error: `Maximum number of monitors (${subscription.maxMonitors}) reached for this subscription` 
            });
        }
        
        // Create new monitor
        const newMonitor = new Monitor({
            website: websiteId,
            name,
            url,
            type: type || 'https',
            interval: interval || subscription.checkInterval,
            locations: locations || ['us-east'],
            expectedStatusCode: expectedStatusCode || 200,
            alertContacts: alertContacts || []
        });
        
        await newMonitor.save();
        
        // Add monitor to subscription
        subscription.monitors.push(newMonitor._id);
        await subscription.save();
        
        res.status(201).json({
            message: 'Monitor created successfully',
            monitor: newMonitor
        });
    } catch (error) {
        console.error('Create monitor error:', error);
        res.status(500).json({ error: 'Internal server error' });
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

// Export the router
module.exports = { monitorRouter }; 