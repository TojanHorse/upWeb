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
const processCheckResult = async (monitor, checkResult, userId, locationInfo = {}) => {
    try {
        // Create a new check record
        const monitorCheck = new MonitorCheck({
            monitor: monitor._id,
            website: monitor.website,
            success: checkResult.success,
            statusCode: checkResult.statusCode,
            responseTime: checkResult.responseTime,
            errorMessage: checkResult.errorMessage,
            location: checkResult.location,
            locationInfo: locationInfo, // Store detailed location info
            performedBy: userId
        });
        
        await monitorCheck.save();
        
        // If check failed, create or update an incident
        if (!checkResult.success) {
            // Check if there's an existing ongoing incident for this monitor
            let incident = await Incident.findOne({
                monitor: monitor._id,
                status: 'ongoing'
            });
            
            if (!incident) {
                // Create a new incident
                incident = new Incident({
                    monitor: monitor._id,
                    website: monitor.website,
                    status: 'ongoing',
                    startTime: new Date(),
                    lastChecked: new Date(),
                    errorDetails: checkResult.errorMessage,
                    location: checkResult.location,
                    locationInfo: locationInfo // Store detailed location info
                });
                
                // Update monitor status to down
                monitor.status = 'down';
                monitor.lastDownTime = new Date();
                await monitor.save();
                
                await incident.save();
                
                // Send email alert about the new incident
                await sendMonitorStatusAlert(monitor, 'down', checkResult.errorMessage, locationInfo);
            } else {
                // Update existing incident
                incident.lastChecked = new Date();
                incident.errorDetails = checkResult.errorMessage;
                await incident.save();
            }
        } else {
            // Check was successful
            
            // Check if there's an existing ongoing incident that should be resolved
            const incident = await Incident.findOne({
                monitor: monitor._id,
                status: 'ongoing'
            });
            
            if (incident) {
                // Resolve the incident
                incident.status = 'resolved';
                incident.resolvedTime = new Date();
                incident.downtime = Math.round((new Date() - incident.startTime) / 1000); // in seconds
                await incident.save();
                
                // Update monitor status to up
                monitor.status = 'up';
                monitor.lastUpTime = new Date();
                await monitor.save();
                
                // Send email alert about the resolved incident
                await sendMonitorStatusAlert(monitor, 'up', 'Monitor is back online', locationInfo);
            }
        }
        
        // Process payment for this check
        await processPaymentForCheck(monitorCheck);
        
        return monitorCheck;
    } catch (error) {
        console.error('Error processing check result:', error);
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
        
        // Create a payment record
        const payment = new Payment({
            amount: PAYMENT_PER_CHECK,
            currency: 'USD',
            type: 'payment',
            status: 'completed',
            sender: monitor.website,
            senderType: 'Website',
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
 * Perform a website check based on monitor type
 * @param {string} monitorId ID of monitor to check
 * @param {string} userId ID of user performing the check
 * @param {string} location Basic location code (e.g., 'us-east')
 * @param {Object} locationInfo Detailed location information from the user's browser
 * @returns {Object} Check result
 */
const performMonitorCheck = async (monitorId, userId, location, locationInfo = {}) => {
    try {
        const monitor = await Monitor.findById(monitorId);
        
        if (!monitor) {
            throw new Error('Monitor not found');
        }
        
        if (!monitor.active) {
            throw new Error('Monitor is not active');
        }
        
        let checkResult;
        
        // Perform check based on monitor type
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
                throw new Error(`Unsupported monitor type: ${monitor.type}`);
        }
        
        // Process the check result
        return await processCheckResult(monitor, checkResult, userId, locationInfo);
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

module.exports = {
    performMonitorCheck,
    getAvailableMonitors,
    performAdminCheck
}; 