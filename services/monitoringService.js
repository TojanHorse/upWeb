const axios = require('axios');
const dns = require('dns').promises;
const https = require('https');
const { Monitor } = require('../Database/module.monitor');
const { MonitorCheck } = require('../Database/module.monitorCheck');
const { Incident } = require('../Database/module.incident');
const { Payment } = require('../Database/module.payment');
const { UserWallet } = require('../Database/module.userWallet');
const { ContributorWallet } = require('../Database/module.contibutorWallet');
const { Website } = require('../Database/module.websites');
const emailService = require('../utils/emailService');

// Amount paid to users per check in cents/paise
const PAYMENT_PER_CHECK = 5; // 5 cents per check

// Reference to WebSocket Service (will be set during initialization)
let websocketService = null;

/**
 * Set the WebSocket service instance for real-time updates
 * @param {Object} wsService - WebSocket service instance
 */
function setWebSocketService(wsService) {
  websocketService = wsService;
  console.log('WebSocket service connected to monitoring service');
}

/**
 * Perform an HTTP/HTTPS check
 * @param {Object} monitor Monitor object
 * @param {string} location Check location
 * @returns {Object} Check result
 */
const performHttpCheck = async (monitor, location) => {
    const startTime = Date.now();
    let success = false;
    let statusCode = 0;
    let responseTime = 0;
    let errorMessage = null;
    
    try {
        const response = await axios.get(monitor.url, {
            timeout: monitor.timeout,
            httpsAgent: new https.Agent({ 
                rejectUnauthorized: true
            }),
            validateStatus: () => true // Accept any status code to check
        });
        
        responseTime = Date.now() - startTime;
        statusCode = response.status;
        
        // Check if status code matches expected
        success = statusCode === monitor.expectedStatusCode;
        
        if (!success) {
            errorMessage = `Expected status code ${monitor.expectedStatusCode}, got ${statusCode}`;
        }
    } catch (error) {
        responseTime = Date.now() - startTime;
        errorMessage = error.message;
        
        if (error.response) {
            statusCode = error.response.status;
            errorMessage = `HTTP error: ${statusCode} ${error.response.statusText}`;
        } else if (error.request) {
            errorMessage = `No response: ${error.message}`;
        } else {
            errorMessage = `Request error: ${error.message}`;
        }
    }
    
    return {
        success,
        statusCode,
        responseTime,
        errorMessage,
        location
    };
};

/**
 * Perform a DNS check
 * @param {Object} monitor Monitor object
 * @param {string} location Check location
 * @returns {Object} Check result
 */
const performDnsCheck = async (monitor, location) => {
    const startTime = Date.now();
    let success = false;
    let responseTime = 0;
    let errorMessage = null;
    
    try {
        // Extract hostname from URL
        const url = new URL(monitor.url);
        const hostname = url.hostname;
        
        await dns.resolve(hostname);
        
        responseTime = Date.now() - startTime;
        success = true;
    } catch (error) {
        responseTime = Date.now() - startTime;
        errorMessage = `DNS error: ${error.message}`;
    }
    
    return {
        success,
        responseTime,
        errorMessage,
        location
    };
};

/**
 * Perform an SSL certificate check
 * @param {Object} monitor Monitor object
 * @param {string} location Check location
 * @returns {Object} Check result
 */
const performSslCheck = async (monitor, location) => {
    const startTime = Date.now();
    let success = false;
    let responseTime = 0;
    let errorMessage = null;
    
    try {
        // Use axios to check SSL (will fail if SSL is invalid)
        const url = new URL(monitor.url);
        
        // Ensure URL uses HTTPS
        const httpsUrl = `https://${url.hostname}`;
        
        await axios.get(httpsUrl, {
            timeout: monitor.timeout,
            httpsAgent: new https.Agent({ 
                rejectUnauthorized: true
            })
        });
        
        responseTime = Date.now() - startTime;
        success = true;
    } catch (error) {
        responseTime = Date.now() - startTime;
        
        if (error.code === 'CERT_HAS_EXPIRED') {
            errorMessage = 'SSL certificate has expired';
        } else if (error.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE') {
            errorMessage = 'Unable to verify SSL certificate';
        } else if (error.code === 'CERT_SIGNATURE_FAILURE') {
            errorMessage = 'SSL certificate signature is invalid';
        } else {
            errorMessage = `SSL error: ${error.message}`;
        }
    }
    
    return {
        success,
        responseTime,
        errorMessage,
        location
    };
};

/**
 * Perform a TCP port check
 * @param {Object} monitor Monitor object
 * @param {string} location Check location
 * @returns {Object} Check result
 */
const performTcpCheck = async (monitor, location) => {
    const startTime = Date.now();
    let success = false;
    let responseTime = 0;
    let errorMessage = null;
    
    try {
        // Use axios to check TCP connection
        const url = new URL(monitor.url);
        const port = url.port || (url.protocol === 'https:' ? 443 : 80);
        
        await axios.get(`${url.protocol}//${url.hostname}:${port}`, {
            timeout: monitor.timeout
        });
        
        responseTime = Date.now() - startTime;
        success = true;
    } catch (error) {
        responseTime = Date.now() - startTime;
        errorMessage = `TCP error: ${error.message}`;
    }
    
    return {
        success,
        responseTime,
        errorMessage,
        location
    };
};

/**
 * Perform a ping check (simulated with HTTP request)
 * @param {Object} monitor Monitor object
 * @param {string} location Check location
 * @returns {Object} Check result
 */
const performPingCheck = async (monitor, location) => {
    // In production, you might want to use a real ping tool
    // Here we simulate with a quick HTTP HEAD request
    const startTime = Date.now();
    let success = false;
    let responseTime = 0;
    let errorMessage = null;
    
    try {
        await axios.head(monitor.url, {
            timeout: monitor.timeout
        });
        
        responseTime = Date.now() - startTime;
        success = true;
    } catch (error) {
        responseTime = Date.now() - startTime;
        errorMessage = `Ping error: ${error.message}`;
    }
    
    return {
        success,
        responseTime,
        errorMessage,
        location
    };
};

/**
 * Process a check result and create an incident if needed
 * @param {Object} monitor Monitor object
 * @param {Object} checkResult Check result
 * @param {string} userId ID of user who performed the check
 * @param {Object} locationInfo Additional location information
 * @returns {Object} Processed check result
 */
const processCheckResult = async (monitor, checkResult, userId = null, locationInfo = {}) => {
    try {
        // Create a new check record
        const monitorCheck = new MonitorCheck({
            monitor: monitor._id,
            website: monitor.website,
            success: checkResult.success,
            statusCode: checkResult.statusCode,
            responseTime: checkResult.responseTime,
            errorMessage: checkResult.error || null,
            message: checkResult.message || (checkResult.success ? 'Check completed successfully' : 'Check failed'),
            location: locationInfo.location || 'system',
            region: locationInfo.region || 'unknown',
            timestamp: new Date(),
            performedBy: userId || '000000000000000000000000' // System user ID when null
        });
        
        await monitorCheck.save();
        
        // Get the previous check to compare status
        const previousCheck = await MonitorCheck.findOne({ 
            monitor: monitor._id,
            _id: { $ne: monitorCheck._id } // Exclude the current check
        }).sort({ createdAt: -1 });
        
        // Determine if an incident should be created or resolved
        const wasDown = previousCheck ? !previousCheck.success : false;
        const isDown = !checkResult.success;
        
        // If monitor was up and now is down, create an incident
        if (!wasDown && isDown) {
            // Create a new incident
            const incident = new Incident({
                monitor: monitor._id,
                website: monitor.website,
                startCheck: monitorCheck._id,
                startTime: new Date(),
                reason: checkResult.errorMessage,
                location: checkResult.location,
                locationInfo: locationInfo
            });
            
            await incident.save();
            monitorCheck.incidentCreated = true;
            await monitorCheck.save();
            
            // Update monitor status
            monitor.status = 'down';
            monitor.lastChecked = new Date();
            await monitor.save();
            
            // Send alert for new incident
            await sendMonitorStatusAlert(
                monitor, 
                'down', 
                checkResult.errorMessage, 
                { location: checkResult.location, ...locationInfo }
            );
            
            // Emit WebSocket event if websocketService is available
            if (websocketService) {
                websocketService.emitToWebsite(monitor.website, 'monitor:update', {
                    monitorId: monitor._id,
                    websiteId: monitor.website,
                    status: 'down',
                    responseTime: checkResult.responseTime,
                    reason: checkResult.errorMessage,
                    timestamp: new Date(),
                    location: checkResult.location
                });
            }
        }
        // If monitor was down and now is up, resolve the incident
        else if (wasDown && !isDown) {
            // Find and resolve the open incident
            const openIncident = await Incident.findOne({
                monitor: monitor._id,
                resolvedAt: null
            });
            
            if (openIncident) {
                openIncident.endCheck = monitorCheck._id;
                openIncident.resolvedAt = new Date();
                openIncident.duration = openIncident.resolvedAt - openIncident.startTime;
                await openIncident.save();
                
                // Update monitor status
                monitor.status = 'up';
                monitor.lastChecked = new Date();
                await monitor.save();
                
                // Send alert for resolved incident
                await sendMonitorStatusAlert(
                    monitor, 
                    'up', 
                    'Monitor is back online', 
                    { location: checkResult.location, ...locationInfo }
                );
                
                // Emit WebSocket event if websocketService is available
                if (websocketService) {
                    websocketService.emitToWebsite(monitor.website, 'monitor:update', {
                        monitorId: monitor._id,
                        websiteId: monitor.website,
                        status: 'up',
                        responseTime: checkResult.responseTime,
                        timestamp: new Date(),
                        location: checkResult.location
                    });
                }
            }
        }
        
        // Process payment for user if check was performed by a user
        if (userId && userId !== '000000000000000000000000' && !locationInfo.scheduled) {
            await processPaymentForCheck(monitorCheck);
        }
        
        return monitorCheck;
    } catch (error) {
        console.warn('Error processing check result:', error);
        throw error;
    }
};

/**
 * Process payment for a monitoring check
 * @param {Object} monitorCheck Monitor check record
 * @returns {Object} Payment record
 */
const processPaymentForCheck = async (monitorCheck) => {
    try {
        if (monitorCheck.paymentProcessed) {
            return null; // Payment already processed
        }
        
        // Get monitor and website to determine payment details
        const monitor = await Monitor.findById(monitorCheck.monitor);
        
        if (!monitor) {
            throw new Error('Monitor not found');
        }
        
        // Get user wallet
        const userWallet = await UserWallet.findOne({ user: monitorCheck.performedBy });
        
        if (!userWallet) {
            throw new Error('User wallet not found');
        }
        
        // Get the website owner
        const website = await Website.findById(monitor.website);
        if (!website) {
            throw new Error('Website not found');
        }
        
        // Create a payment record
        const payment = new Payment({
            amount: PAYMENT_PER_CHECK,
            currency: 'USD',
            type: 'payment',
            status: 'completed',
            sender: website.owner, // Use website owner as sender
            senderType: 'User', // Use User type instead of Website
            receiver: monitorCheck.performedBy,
            receiverType: 'User',
            description: `Payment for monitoring check of ${monitor.name}`,
            website: monitor.website,
            transactionId: `check_${monitorCheck._id}`
        });
        
        await payment.save();
        
        // Update user wallet
        userWallet.balance += PAYMENT_PER_CHECK;
        userWallet.transactions.push(payment._id);
        await userWallet.save();
        
        // Mark check as payment processed
        monitorCheck.paymentProcessed = true;
        await monitorCheck.save();
        
        return payment;
    } catch (error) {
        console.error('Error processing payment for check:', error);
        throw error;
    }
};

/**
 * Send alert emails for monitor status changes
 * @param {Object} monitor Monitor object
 * @param {string} status New status ('up' or 'down')
 * @param {string} reason Reason for the status change
 * @param {Object} locationInfo Additional location information of the user who performed the check
 */
const sendMonitorStatusAlert = async (monitor, status, reason, locationInfo = {}) => {
    try {
        // Get website details
        const website = await Website.findById(monitor.website);
        if (!website) {
            console.error(`Website not found for monitor ${monitor._id}`);
            return;
        }
        
        // Find website owner (contributor)
        const contributorId = website.contributors && website.contributors.length > 0 
            ? website.contributors[0] 
            : null;
        
        let ownerEmail = null;
        if (contributorId) {
            const contributor = await require('../Database/module.contibuter').Contributor.findById(contributorId);
            if (contributor) {
                ownerEmail = contributor.email;
            }
        }
        
        // Format location information
        const location = {
            region: locationInfo.region || monitor.location || 'Unknown',
            city: locationInfo.city || 'Unknown',
            country: locationInfo.country || 'Unknown',
            coordinates: locationInfo.coordinates || null,
            ip: locationInfo.ip || 'Unknown'
        };
        
        // Get alert contacts from monitor
        const alertEmails = [];
        
        // Add configured alert contacts
        if (monitor.alertContacts && monitor.alertContacts.length > 0) {
            alertEmails.push(...monitor.alertContacts);
        }
        
        // Always notify the website owner for down alerts if we have their email
        if (status === 'down' && ownerEmail && !alertEmails.includes(ownerEmail)) {
            alertEmails.push(ownerEmail);
        }
        
        if (alertEmails.length === 0) {
            console.log(`No alert contacts or owner email found for monitor ${monitor._id}`);
            return;
        }
        
        // Send email to each recipient
        for (const email of alertEmails) {
            await emailService.sendMonitorAlert({
                email,
                monitorName: monitor.name,
                websiteName: website.name,
                status,
                url: monitor.url,
                reason,
                location,
                isOwner: email === ownerEmail
            });
        }
        
        console.log(`Alert emails sent for monitor ${monitor._id} status change to ${status}`);
    } catch (error) {
        console.error('Error sending monitor status alert:', error);
        // Don't throw error here to prevent disrupting the main process
    }
};

/**
 * Perform a check for a monitor
 * @param {string} monitorId Monitor ID
 * @param {string} userId User ID performing the check
 * @param {Object} options Optional parameters
 * @returns {Object} Check result
 */
const performMonitorCheck = async (monitorId, userId, options = {}) => {
    try {
        // Find monitor
        const monitor = await Monitor.findById(monitorId);
        if (!monitor) {
            throw new Error('Monitor not found');
        }
        
        // Find website
        const website = await Website.findById(monitor.website);
        if (!website) {
            throw new Error('Website not found');
        }
        
        // Default location if not provided
        const location = options.location || 'manual-check';
        
        // Perform check based on monitor type
        let checkResult;
        
        switch (monitor.type) {
            case 'http':
            case 'https':
                checkResult = await performHttpCheck(monitor, location);
                break;
            case 'dns':
                checkResult = await performDnsCheck(monitor, location);
                break;
            case 'ssl':
                checkResult = await performSslCheck(monitor, location);
                break;
            case 'tcp':
                checkResult = await performTcpCheck(monitor, location);
                break;
            case 'ping':
                checkResult = await performPingCheck(monitor, location);
                break;
            default:
                checkResult = await performHttpCheck(monitor, location);
                break;
        }
        
        // Process result
        try {
            const monitorCheck = await processCheckResult(monitor, checkResult, userId, { location });
            return { ...checkResult, checkId: monitorCheck._id };
        } catch (error) {
            console.error('Error processing check result:', error);
            throw error;
        }
    } catch (error) {
        console.error('Error performing monitor check:', error);
        throw error;
    }
};

/**
 * Get monitors available for a user to check
 * @param {string} userId ID of user
 * @returns {Array} Array of available monitors
 */
const getAvailableMonitors = async (userId) => {
    try {
        // Find active monitors that haven't been checked recently by this user
        const recentChecks = await MonitorCheck.find({
            performedBy: userId,
            createdAt: { $gte: new Date(Date.now() - 5 * 60 * 1000) } // Last 5 minutes
        }).distinct('monitor');
        
        // Find active monitors not in the recentChecks list
        const availableMonitors = await Monitor.find({
            active: true,
            _id: { $nin: recentChecks }
        }).populate('website', 'name url');
        
        return availableMonitors;
    } catch (error) {
        console.error('Error getting available monitors:', error);
        throw error;
    }
};

/**
 * Perform a monitor check initiated by an admin
 * @param {string} monitorId Monitor ID
 * @param {string} adminId Admin ID
 * @returns {Object} Check result
 */
const performAdminCheck = async (monitorId, adminId) => {
    try {
        // Find monitor
        const monitor = await Monitor.findById(monitorId);
        if (!monitor) {
            throw new Error('Monitor not found');
        }
        
        // Find website
        const website = await Website.findById(monitor.website);
        if (!website) {
            throw new Error('Website not found');
        }
        
        // Perform check based on monitor type
        let checkResult;
        const location = 'admin-console'; // Admin-specific location
        
        switch (monitor.type) {
            case 'http':
            case 'https':
                checkResult = await performHttpCheck(monitor, location);
                break;
            case 'dns':
                checkResult = await performDnsCheck(monitor, location);
                break;
            case 'ssl':
                checkResult = await performSslCheck(monitor, location);
                break;
            case 'tcp':
                checkResult = await performTcpCheck(monitor, location);
                break;
            case 'ping':
                checkResult = await performPingCheck(monitor, location);
                break;
            default:
                checkResult = await performHttpCheck(monitor, location);
                break;
        }
        
        // Create check record in database
        const monitorCheck = new MonitorCheck({
            monitor: monitor._id,
            website: website._id,
            timestamp: new Date(),
            success: checkResult.success,
            statusCode: checkResult.statusCode,
            responseTime: checkResult.responseTime,
            errorMessage: checkResult.errorMessage,
            location: checkResult.location,
            performedBy: adminId,
            // No payment for admin checks
            paymentProcessed: true
        });
        
        await monitorCheck.save();
        
        // If check failed and threshold reached, create an incident (if none exists)
        if (!checkResult.success) {
            // Find recent checks to see if threshold is reached
            const recentChecks = await MonitorCheck.find({
                monitor: monitor._id,
                timestamp: { $gte: new Date(Date.now() - 1000 * 60 * 60) } // Last hour
            }).sort({ timestamp: -1 });
            
            const consecutiveFailures = recentChecks.findIndex(check => check.success) === -1
                ? recentChecks.length
                : recentChecks.findIndex(check => check.success);
            
            if (consecutiveFailures >= monitor.alertThreshold) {
                // Check if there's an active incident
                const activeIncident = await Incident.findOne({
                    monitor: monitor._id,
                    resolved: false
                });
                
                if (!activeIncident) {
                    // Create new incident
                    const incident = new Incident({
                        monitor: monitor._id,
                        website: website._id,
                        status: 'investigating',
                        startTime: new Date(),
                        description: `Monitor is down: ${checkResult.errorMessage || 'Unknown error'}`,
                        checks: [monitorCheck._id]
                    });
                    
                    await incident.save();
                    
                    // Send alerts
                    await sendMonitorStatusAlert(
                        monitor,
                        'down',
                        checkResult.errorMessage || 'Monitor check failed',
                        { isAdmin: true, adminId }
                    );
                }
            }
        } else {
            // If check succeeded and there's an active incident, resolve it
            const activeIncident = await Incident.findOne({
                monitor: monitor._id,
                resolved: false
            });
            
            if (activeIncident) {
                activeIncident.resolved = true;
                activeIncident.resolvedTime = new Date();
                activeIncident.resolution = 'Monitor is operational again';
                activeIncident.checks.push(monitorCheck._id);
                
                await activeIncident.save();
                
                // Send recovery alert
                await sendMonitorStatusAlert(
                    monitor,
                    'recovered',
                    'Monitor is operational again',
                    { isAdmin: true, adminId }
                );
            }
        }
        
        return monitorCheck;
    } catch (error) {
        console.error('Admin monitor check error:', error);
        throw error;
    }
};

/**
 * Get monitor statistics for a specific monitor
 * @param {string} monitorId Monitor ID
 * @param {Object} options Options for fetching statistics
 * @returns {Object} Monitor statistics
 */
const getMonitorStats = async (monitorId, options = {}) => {
    try {
        const { days = 30 } = options;
        
        // Get the monitor
        const monitor = await Monitor.findById(monitorId).populate('website');
        
        if (!monitor) {
            throw new Error('Monitor not found');
        }
        
        // Get recent checks
        const now = new Date();
        const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
        
        const checks = await MonitorCheck.find({
            monitor: monitorId,
            createdAt: { $gte: startDate }
        }).sort({ createdAt: 1 });
        
        // Calculate statistics
        const totalChecks = checks.length;
        const successfulChecks = checks.filter(check => check.success).length;
        
        // Calculate uptime percentage
        const uptime = totalChecks > 0 
            ? (successfulChecks / totalChecks * 100).toFixed(2) 
            : 100;
        
        // Get average response time
        const avgResponseTime = totalChecks > 0
            ? (checks.reduce((sum, check) => sum + check.responseTime, 0) / totalChecks).toFixed(0)
            : 0;
        
        // Get fastest response time
        const fastestResponseTime = totalChecks > 0
            ? Math.min(...checks.map(check => check.responseTime))
            : 0;
        
        // Get slowest response time
        const slowestResponseTime = totalChecks > 0
            ? Math.max(...checks.map(check => check.responseTime))
            : 0;
        
        // Organize check data by day for charts
        const dailyData = {};
        const locations = new Set();
        
        // Initialize daily data structure
        for (let i = 0; i < days; i++) {
            const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
            const dateString = date.toISOString().split('T')[0];
            dailyData[dateString] = {
                date: dateString,
                totalChecks: 0,
                successfulChecks: 0,
                uptime: 100,
                avgResponseTime: 0,
                responseTimeSum: 0
            };
        }
        
        // Fill in data from checks
        checks.forEach(check => {
            const dateString = check.createdAt.toISOString().split('T')[0];
            
            if (!dailyData[dateString]) {
                dailyData[dateString] = {
                    date: dateString,
                    totalChecks: 0,
                    successfulChecks: 0,
                    uptime: 100,
                    avgResponseTime: 0,
                    responseTimeSum: 0
                };
            }
            
            const dayData = dailyData[dateString];
            dayData.totalChecks++;
            
            if (check.success) {
                dayData.successfulChecks++;
            }
            
            dayData.responseTimeSum += check.responseTime;
            dayData.avgResponseTime = Math.round(dayData.responseTimeSum / dayData.totalChecks);
            dayData.uptime = parseFloat((dayData.successfulChecks / dayData.totalChecks * 100).toFixed(2));
            
            // Track unique locations
            if (check.location) {
                locations.add(check.location);
            }
        });
        
        // Convert daily data to array and sort by date
        const dailyDataArray = Object.values(dailyData).sort((a, b) => 
            new Date(a.date) - new Date(b.date)
        );
        
        // Get current status
        const latestCheck = checks.length > 0 
            ? checks[checks.length - 1] 
            : null;
        
        const status = !latestCheck 
            ? 'unknown' 
            : latestCheck.success 
                ? 'up' 
                : 'down';
        
        // Get open incidents
        const openIncidents = await Incident.find({
            monitor: monitorId,
            resolvedAt: null
        }).sort({ createdAt: -1 });
        
        // Get recent incidents (resolved)
        const recentIncidents = await Incident.find({
            monitor: monitorId,
            resolvedAt: { $ne: null }
        }).sort({ createdAt: -1 }).limit(10);
        
        return {
            monitor: {
                id: monitor._id,
                name: monitor.name,
                url: monitor.url,
                type: monitor.type,
                status,
                uptime: parseFloat(uptime),
                website: monitor.website ? {
                    id: monitor.website._id,
                    name: monitor.website.name,
                    url: monitor.website.url
                } : null
            },
            stats: {
                totalChecks,
                successfulChecks,
                uptime: parseFloat(uptime),
                avgResponseTime: parseInt(avgResponseTime),
                fastestResponseTime,
                slowestResponseTime,
                locations: Array.from(locations),
                lastChecked: latestCheck ? latestCheck.createdAt : null
            },
            charts: {
                daily: dailyDataArray
            },
            incidents: {
                open: openIncidents,
                recent: recentIncidents
            },
            recentChecks: checks.slice(-50).reverse() // Get last 50 checks, most recent first
        };
    } catch (error) {
        console.error('Error getting monitor stats:', error);
        throw error;
    }
};

/**
 * Schedule automatic checks for all active monitors
 */
const scheduleMonitorChecks = async () => {
    console.log('Setting up scheduled monitoring checks');
    
    // Map to store scheduled jobs
    const scheduledJobs = new Map();
    
    // Run immediately and then every minute after that
    setInterval(async () => {
        try {
            // Get all active monitors
            const monitors = await Monitor.find({ active: true });
            
            const now = new Date();
            
            monitors.forEach(async (monitor) => {
                // Convert interval from minutes to milliseconds
                const intervalMs = monitor.interval * 60 * 1000;
                
                // Get the last check time for this monitor
                const lastCheck = await MonitorCheck.findOne({ monitor: monitor._id })
                    .sort({ createdAt: -1 });
                
                const lastCheckTime = lastCheck ? lastCheck.createdAt.getTime() : 0;
                const timeSinceLastCheck = now.getTime() - lastCheckTime;
                
                // Check if it's time to run another check
                if (timeSinceLastCheck >= intervalMs) {
                    console.log(`Running scheduled check for ${monitor.name} (${monitor._id})`);
                    
                    // For each configured location, run a check
                    monitor.locations.forEach(async (location) => {
                        try {
                            // Determine the check method based on monitor type
                            let checkResult;
                            
                            switch (monitor.type) {
                                case 'http':
                                case 'https':
                                    checkResult = await performHttpCheck(monitor, location);
                                    break;
                                case 'dns':
                                    checkResult = await performDnsCheck(monitor, location);
                                    break;
                                case 'ssl':
                                    checkResult = await performSslCheck(monitor, location);
                                    break;
                                case 'tcp':
                                    checkResult = await performTcpCheck(monitor, location);
                                    break;
                                case 'ping':
                                    checkResult = await performPingCheck(monitor, location);
                                    break;
                                default:
                                    checkResult = await performHttpCheck(monitor, location);
                            }
                            
                            // Process the check result (store, create incidents, etc.)
                            await processCheckResult(monitor, checkResult, null, { scheduled: true, location });
                            
                            console.log(`Completed scheduled check for ${monitor.name} from ${location}`);
                        } catch (error) {
                            console.error(`Error performing scheduled check for ${monitor.name} from ${location}:`, error);
                        }
                    });
                }
            });
        } catch (error) {
            console.error('Error in scheduled monitoring checks:', error);
        }
    }, 60000); // Run every minute
    
    console.log('Scheduled monitoring checks initialized');
};

/**
 * Initialize the monitoring system
 * This is called during server startup
 */
const initializeMonitoring = async () => {
    console.log('Initializing monitoring service...');
    
    try {
        // Get counts for monitoring system components
        const monitorCount = await Monitor.countDocuments();
        const checkCount = await MonitorCheck.countDocuments();
        const incidentCount = await Incident.countDocuments();
        
        console.log(`Found ${monitorCount} monitors, ${checkCount} checks, and ${incidentCount} incidents`);
        
        // Get active incident count
        const activeIncidentCount = await Incident.countDocuments({ resolvedAt: null });
        console.log(`There are currently ${activeIncidentCount} active incidents`);
        
        // Check monitor statuses
        const monitors = await Monitor.find().populate('website');
        
        // Group monitors by status
        const statusCounts = {
            up: 0,
            down: 0,
            unknown: 0
        };
        
        // Check the latest status for each monitor
        for (const monitor of monitors) {
            const latestCheck = await MonitorCheck.findOne({ monitor: monitor._id })
                .sort({ createdAt: -1 });
                
            if (!latestCheck) {
                statusCounts.unknown++;
            } else if (latestCheck.success) {
                statusCounts.up++;
            } else {
                statusCounts.down++;
            }
        }
        
        console.log('Monitor status summary:');
        console.log(`- Up: ${statusCounts.up}`);
        console.log(`- Down: ${statusCounts.down}`);
        console.log(`- Unknown: ${statusCounts.unknown}`);
        
        // Initialize WebSocket events for monitor status updates
        if (websocketService) {
            console.log('Setting up WebSocket event handlers for monitoring');
            websocketService.registerEvent('monitor:status', async (data, socket) => {
                try {
                    // Validate if user is authenticated to receive updates
                    if (!socket.user) {
                        return { error: 'Authentication required' };
                    }
                    
                    const { monitorId } = data;
                    if (!monitorId) {
                        return { error: 'Monitor ID is required' };
                    }
                    
                    // Get the latest status for the monitor
                    const monitor = await Monitor.findById(monitorId);
                    if (!monitor) {
                        return { error: 'Monitor not found' };
                    }
                    
                    const latestCheck = await MonitorCheck.findOne({ monitor: monitor._id })
                        .sort({ createdAt: -1 });
                    
                    const status = !latestCheck ? 'unknown' : 
                        latestCheck.success ? 'up' : 'down';
                    
                    return {
                        monitorId,
                        status,
                        lastChecked: latestCheck ? latestCheck.createdAt : null,
                        responseTime: latestCheck ? latestCheck.responseTime : null
                    };
                } catch (error) {
                    console.error('Error in monitor:status event:', error);
                    return { error: 'Failed to get monitor status' };
                }
            });
        }
        
        console.log('Monitoring service initialized successfully');
        return true;
    } catch (error) {
        console.error('Error initializing monitoring service:', error);
        throw error;
    }
};

// Export the functions
module.exports = {
    performMonitorCheck,
    getAvailableMonitors,
    performAdminCheck,
    getMonitorStats,
    scheduleMonitorChecks,
    setWebSocketService,
    initializeMonitoring
}; 