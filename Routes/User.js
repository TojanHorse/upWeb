const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { User } = require('../Database/module.user');
const { UserWallet } = require('../Database/module.userWallet');
const emailService = require('../utils/emailService');
const VerificationService = require('../utils/verificationService');
const { userRegistrationSchema, userLoginSchema, userProfileUpdateSchema, passwordResetRequestSchema, passwordResetSchema, validate } = require('../utils/validationSchema');
const userRouter = express.Router();
const SECRET = process.env.USER_JWT_SECRET;

// Middleware to verify user token
const authenticateUser = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ 
                error: 'Authorization header missing', 
                message: 'Please login to access this resource'
            });
        }

        const parts = authHeader.split(' ');
        if (parts.length !== 2 || parts[0] !== 'Bearer') {
            return res.status(401).json({ 
                error: 'Invalid authorization format', 
                message: 'Authorization header must be in format: Bearer <token>'
            });
        }

        const token = parts[1];
        if (!token) {
            return res.status(401).json({ 
                error: 'Token missing', 
                message: 'No token provided in authorization header'
            });
        }

        const decoded = jwt.verify(token, SECRET);
        
        // Ensure we have a userId in the token payload
        if (!decoded.userId) {
            return res.status(401).json({ 
                error: 'Invalid token payload', 
                message: 'Token missing required user information'
            });
        }
        
        req.user = decoded;
        console.log('User authenticated:', decoded.userId);
        next();
    } catch (error) {
        console.error('Authentication error:', error.message);
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                error: 'Token expired', 
                message: 'Your session has expired. Please login again'
            });
        }
        return res.status(401).json({ 
            error: 'Invalid token', 
            message: 'Authentication failed. Please login again'
        });
    }
};

userRouter.post('/signup', validate(userRegistrationSchema), async (req, res) => {
    try {
        const { name, email, password } = req.body;
        
        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(409).json({ error: 'This email is already registered. Please login or use a different email address.' });
        }
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Create new user
        const newUser = new User({
            name,
            email,
            password: hashedPassword
        });
        
        await newUser.save();
        
        // Create wallet for the user
        const wallet = new UserWallet({
            user: newUser._id
        });
        
        await wallet.save();
        
        // Generate JWT token
        const token = jwt.sign({ userId: newUser._id, email: newUser.email }, SECRET, { expiresIn: '7d' });
        
        // Send welcome email
        try {
            await emailService.sendWelcomeEmail({
                email: newUser.email,
                name: newUser.name,
                userType: 'user'
            });
        } catch (emailError) {
            console.error('Failed to send welcome email:', emailError);
            // Continue with user creation even if email fails
        }
        
        // Send verification email if email service is configured
        const emailCredentials = process.env.GMAIL_USER && process.env.GMAIL_PASSWORD;
        let verificationInfo = {};
        
        if (emailCredentials) {
            // Request verification code
            const verificationResult = await VerificationService.requestVerification(newUser._id);
            verificationInfo = {
                isEmailVerified: false,
                verificationSent: verificationResult.success,
                verificationMessage: verificationResult.message
            };
        } else {
            // No email service configured, mark as verified by default
            newUser.isEmailVerified = true;
            await newUser.save();
            verificationInfo = {
                isEmailVerified: true,
                verificationMessage: 'Email verification is not enabled on this server'
            };
        }
        
        res.status(201).json({ 
            message: 'User created successfully',
            token,
            user: {
                id: newUser._id,
                name: newUser.name,
                email: newUser.email,
                isEmailVerified: newUser.isEmailVerified
            },
            verification: verificationInfo
        });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

userRouter.post('/signin', validate(userLoginSchema), async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Find user
        const user = await User.findOne({ email });
        if (!user) {
            // Check if the email exists in the Contributor collection
            const contributor = await require('../Database/module.contibuter').Contributor.findOne({ email });
            if (contributor) {
                return res.status(400).json({ 
                    error: 'This email is registered as a contributor, not a regular user. Please use the Contributor login.',
                    accountExists: true,
                    accountType: 'contributor'
                });
            }
            
            // Check if the email exists in the Admin collection
            const admin = await require('../Database/module.admin').Admin.findOne({ email });
            if (admin) {
                return res.status(400).json({ 
                    error: 'This email is registered as an admin, not a regular user. Please use the Admin login.',
                    accountExists: true,
                    accountType: 'admin'
                });
            }
            
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Generate JWT token with userType property to identify
        const token = jwt.sign({ 
            userId: user._id, 
            email: user.email,
            userType: 'user'
        }, SECRET, { expiresIn: '7d' });
        
        res.json({ 
            message: 'Login successful',
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                isEmailVerified: user.isEmailVerified,
                profilePicture: user.profilePicture
            }
        });
    } catch (error) {
        console.error('Signin error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

userRouter.put('/update', authenticateUser, validate(userProfileUpdateSchema), async (req, res) => {
    try {
        const { name, profilePicture, currentPassword, newPassword } = req.body;
        const userId = req.user.userId;
        
        // Find user
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Update user fields if provided
        if (name) user.name = name;
        if (profilePicture) user.profilePicture = profilePicture;
        
        // Handle password change if requested
        if (currentPassword && newPassword) {
            // Verify current password
            const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
            if (!isPasswordValid) {
                return res.status(401).json({ error: 'Current password is incorrect' });
            }
            
            // Hash and set new password
            const hashedPassword = await bcrypt.hash(newPassword, 10);
            user.password = hashedPassword;
        }
        
        user.updatedAt = Date.now();
        await user.save();
        
        res.json({ 
            message: 'User updated successfully',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                profilePicture: user.profilePicture
            }
        });
    } catch (error) {
        console.error('Update error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

userRouter.get('/profile', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.userId;
        
        // Find user and wallet
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        const wallet = await UserWallet.findOne({ user: userId });
        
        res.json({
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                isEmailVerified: user.isEmailVerified,
                profilePicture: user.profilePicture,
                createdAt: user.createdAt
            },
            wallet: wallet ? {
                balance: wallet.balance,
                currency: wallet.currency
            } : null
        });
    } catch (error) {
        console.error('Profile fetch error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Request email verification code
userRouter.post('/verify/request', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.userId;
        const result = await VerificationService.requestVerification(userId);
        
        if (result.success) {
            res.json({ 
                message: result.message,
                success: true 
            });
        } else {
            res.status(400).json({ 
                error: result.message,
                success: false
            });
        }
    } catch (error) {
        console.error('Request verification error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Verify email with code
userRouter.post('/verify', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { code } = req.body;
        
        if (!code) {
            return res.status(400).json({ error: 'Verification code is required' });
        }
        
        const result = await VerificationService.verifyEmail(userId, code);
        
        if (result.success) {
            res.json({ 
                message: result.message,
                success: true,
                isVerified: true
            });
        } else {
            res.status(400).json({ 
                error: result.message,
                success: false,
                isVerified: false
            });
        }
    } catch (error) {
        console.error('Verify email error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get verification status
userRouter.get('/verify/status', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.userId;
        const user = await User.findById(userId);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Get remaining attempts for today
        let remainingAttempts = 5; // Default max attempts
        
        if (user.lastVerificationAttempt) {
            const lastAttemptDate = new Date(user.lastVerificationAttempt);
            const today = new Date();
            
            // If last attempt was today, calculate remaining attempts
            if (lastAttemptDate.getDate() === today.getDate() && 
                lastAttemptDate.getMonth() === today.getMonth() && 
                lastAttemptDate.getFullYear() === today.getFullYear()) {
                remainingAttempts = Math.max(0, 5 - user.verificationAttempts);
            }
        }
        
        res.json({
            isEmailVerified: user.isEmailVerified,
            remainingAttempts,
            nextVerificationAvailable: user.verificationAttempts >= 5 ? 
                                          'Tomorrow' : 'Now',
            emailServiceConfigured: !!(process.env.GMAIL_USER && process.env.GMAIL_PASSWORD)
        });
    } catch (error) {
        console.error('Verification status error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Request password reset
userRouter.post('/password/reset/request', validate(passwordResetRequestSchema), async (req, res) => {
    try {
        const { email } = req.body;
        
        const result = await VerificationService.requestPasswordReset(email);
        
        res.json({ 
            message: result.message,
            success: result.success 
        });
    } catch (error) {
        console.error('Password reset request error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Reset password with code
userRouter.post('/password/reset', validate(passwordResetSchema), async (req, res) => {
    try {
        const { email, code } = req.body;
        
        const result = await VerificationService.resetPassword(email, code);
        
        if (result.success) {
            res.json({ 
                message: result.message,
                success: true
            });
        } else {
            res.status(400).json({ 
                error: result.message,
                success: false
            });
        }
    } catch (error) {
        console.error('Password reset error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// API endpoint for verifying email with token
userRouter.post('/verify-email', async (req, res) => {
  try {
    const { email, token } = req.body;
    
    if (!email || !token) {
      return res.status(400).json({ success: false, message: 'Email and token are required' });
    }
    
    const result = await VerificationService.verifyEmailWithToken(email, token);
    
    if (result.success) {
      return res.status(200).json(result);
    } else {
      return res.status(400).json(result);
    }
  } catch (error) {
    console.error('Error verifying email with token:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// API endpoint for resetting password with token
userRouter.post('/reset-password', async (req, res) => {
  try {
    const { email, token, password } = req.body;
    
    if (!email || !token || !password) {
      return res.status(400).json({ success: false, message: 'Email, token, and password are required' });
    }
    
    // Validate password
    if (password.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters long' });
    }
    
    const result = await VerificationService.resetPasswordWithToken(email, token, password);
    
    if (result.success) {
      return res.status(200).json(result);
    } else {
      return res.status(400).json(result);
    }
  } catch (error) {
    console.error('Error resetting password with token:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Website monitoring endpoints
userRouter.post('/monitors', authenticateUser, async (req, res) => {
  try {
    const { name, url, type, interval, timeout, alertThreshold, alertEmails, keyword, active } = req.body;
    const userId = req.user.userId;
    
    // Validate required fields
    if (!name || !url) {
      return res.status(400).json({ error: 'Website name and URL are required' });
    }
    
    // Create website record first if it doesn't exist
    const { Website } = require('../Database/module.websites');
    let website = await Website.findOne({ url, owner: userId });
    
    if (!website) {
      website = new Website({
        name,
        url,
        owner: userId,
        status: 'active'
      });
      
      await website.save();
    }
    
    // Create monitor
    const { Monitor } = require('../Database/module.monitor');
    const newMonitor = new Monitor({
      name,
      url,
      website: website._id,
      type: type || 'http',
      interval: interval || 900, // 15 minutes default
      timeout: timeout || 30,
      alertThreshold: alertThreshold || 3,
      alertEmails: alertEmails || [],
      active: active !== undefined ? active : true,
      keyword
    });
    
    await newMonitor.save();
    
    res.status(201).json({
      success: true,
      message: 'Monitor created successfully',
      monitor: {
        id: newMonitor._id,
        name: newMonitor.name,
        url: newMonitor.url,
        type: newMonitor.type,
        interval: newMonitor.interval,
        active: newMonitor.active
      }
    });
  } catch (error) {
    console.error('Error creating monitor:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

userRouter.get('/monitors', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.userId;
        
        // Get all monitors for websites the user owns
        const { Website } = require('../Database/module.websites');
        const { Monitor } = require('../Database/module.monitor');
        const { MonitorCheck } = require('../Database/module.monitorCheck');
        
        const userWebsites = await Website.find({ owner: userId });
        const websiteIds = userWebsites.map(website => website._id);
        
        const monitors = await Monitor.find({ website: { $in: websiteIds } })
            .populate('website', 'name url status')
            .sort({ createdAt: -1 });
        
        // Get recent checks for status and uptime calculation
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        
        const monitorIds = monitors.map(m => m._id);
        const recentChecks = await MonitorCheck.find({
            monitor: { $in: monitorIds },
            createdAt: { $gte: thirtyDaysAgo }
        });
        
        // Calculate status, uptime, etc. for each monitor
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
        console.error('Error getting monitors:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

userRouter.get('/monitors/:id', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.userId;
    const monitorId = req.params.id;
    
    // Find monitor
    const { Monitor } = require('../Database/module.monitor');
    const { Website } = require('../Database/module.websites');
    const { MonitorCheck } = require('../Database/module.monitorCheck');
    
    const monitor = await Monitor.findById(monitorId).populate('website');
    
    if (!monitor) {
      return res.status(404).json({ error: 'Monitor not found' });
    }
    
    // Verify ownership
    if (!monitor.website || !monitor.website.owner || monitor.website.owner.toString() !== userId) {
      return res.status(403).json({ error: 'Unauthorized access to this monitor' });
    }
    
    // Get recent checks for this monitor
    const recentChecks = await MonitorCheck.find({ monitor: monitorId })
      .sort({ timestamp: -1 })
      .limit(20);
    
    // Calculate status based on recent checks
    let status = 'unknown';
    let responseTime = 0;
    let uptime = 100;
    
    if (recentChecks.length > 0) {
      // Calculate average response time
      const totalResponseTime = recentChecks.reduce((sum, check) => {
        return sum + (check.responseTime || 0);
      }, 0);
      responseTime = Math.round(totalResponseTime / recentChecks.length);
      
      // Calculate uptime percentage from recent checks
      const successfulChecks = recentChecks.filter(check => check.success).length;
      uptime = Math.round((successfulChecks / recentChecks.length) * 100);
      
      // Determine status based on the latest check
      const latestCheck = recentChecks[0];
      if (latestCheck.success) {
        if (responseTime < 500) {
          status = 'operational';
        } else {
          status = 'degraded';
        }
      } else {
        status = 'down';
      }
    }
    
    res.json({
      monitor: {
        id: monitor._id,
        name: monitor.name,
        url: monitor.url,
        type: monitor.type,
        interval: monitor.interval,
        timeout: monitor.timeout,
        alertThreshold: monitor.alertThreshold,
        alertEmails: monitor.alertEmails,
        keyword: monitor.keyword,
        active: monitor.active,
        status,
        responseTime,
        uptime,
        website: {
          id: monitor.website._id,
          name: monitor.website.name,
          url: monitor.website.url,
          status: monitor.website.status
        },
        createdAt: monitor.createdAt,
        updatedAt: monitor.updatedAt
      },
      recentChecks: recentChecks.map(check => ({
        id: check._id,
        success: check.success,
        statusCode: check.statusCode,
        responseTime: check.responseTime,
        timestamp: check.timestamp,
        message: check.message
      }))
    });
  } catch (error) {
    console.error('Error fetching monitor details:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

userRouter.put('/monitors/:id', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.userId;
    const monitorId = req.params.id;
    const { name, type, interval, timeout, alertThreshold, alertEmails, keyword, active } = req.body;
    
    // Find monitor
    const { Monitor } = require('../Database/module.monitor');
    const monitor = await Monitor.findById(monitorId).populate('website');
    
    if (!monitor) {
      return res.status(404).json({ error: 'Monitor not found' });
    }
    
    // Verify ownership
    if (!monitor.website || !monitor.website.owner || monitor.website.owner.toString() !== userId) {
      return res.status(403).json({ error: 'Unauthorized access to this monitor' });
    }
    
    // Update fields
    if (name) monitor.name = name;
    if (type) monitor.type = type;
    if (interval) monitor.interval = interval;
    if (timeout) monitor.timeout = timeout;
    if (alertThreshold) monitor.alertThreshold = alertThreshold;
    if (alertEmails) monitor.alertEmails = alertEmails;
    if (keyword !== undefined) monitor.keyword = keyword;
    if (active !== undefined) monitor.active = active;
    
    await monitor.save();
    
    res.json({
      success: true,
      message: 'Monitor updated successfully',
      monitor: {
        id: monitor._id,
        name: monitor.name,
        type: monitor.type,
        interval: monitor.interval,
        timeout: monitor.timeout,
        alertThreshold: monitor.alertThreshold,
        alertEmails: monitor.alertEmails,
        keyword: monitor.keyword,
        active: monitor.active
      }
    });
  } catch (error) {
    console.error('Error updating monitor:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

userRouter.delete('/monitors/:id', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.userId;
    const monitorId = req.params.id;
    
    // Find monitor
    const { Monitor } = require('../Database/module.monitor');
    const monitor = await Monitor.findById(monitorId).populate('website');
    
    if (!monitor) {
      return res.status(404).json({ error: 'Monitor not found' });
    }
    
    // Verify ownership
    if (!monitor.website || !monitor.website.owner || monitor.website.owner.toString() !== userId) {
      return res.status(403).json({ error: 'Unauthorized access to this monitor' });
    }
    
    // Delete monitor
    await Monitor.findByIdAndDelete(monitorId);
    
    // Delete related checks
    const { MonitorCheck } = require('../Database/module.monitorCheck');
    await MonitorCheck.deleteMany({ monitor: monitorId });
    
    res.json({
      success: true,
      message: 'Monitor deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting monitor:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Trigger a manual check of a monitor
userRouter.post('/monitors/:id/check', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.userId;
    const monitorId = req.params.id;
    
    // Find monitor
    const { Monitor } = require('../Database/module.monitor');
    const monitor = await Monitor.findById(monitorId).populate('website');
    
    if (!monitor) {
      return res.status(404).json({ error: 'Monitor not found' });
    }
    
    // Verify ownership
    if (!monitor.website || !monitor.website.owner || monitor.website.owner.toString() !== userId) {
      return res.status(403).json({ error: 'Unauthorized access to this monitor' });
    }
    
    // Perform the check
    const monitoringService = require('../services/monitoringService');
    const result = await monitoringService.performCheck(monitor);
    
    res.json({
      success: true,
      message: 'Check performed successfully',
      result: {
        success: result.success,
        statusCode: result.statusCode,
        responseTime: result.responseTime,
        message: result.message,
        timestamp: result.timestamp
      }
    });
  } catch (error) {
    console.error('Error performing monitor check:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Export the middleware and router 
module.exports = { userRouter, authenticateUser };
