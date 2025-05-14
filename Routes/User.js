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
const { verifyClerkToken } = require('../utils/clerkAuth');

// Middleware to verify user token
const authenticateUser = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ error: 'Authorization required' });
        
        const [bearer, token] = authHeader.split(' ');
        if (bearer !== 'Bearer' || !token) return res.status(401).json({ error: 'Invalid token format' });

        const decoded = jwt.verify(token, process.env.USER_JWT_SECRET);
        
        // Add userType validation
        if (decoded.userType !== 'user') {
            return res.status(403).json({
                error: 'Invalid token type',
                message: 'Token not authorized for user access'
            });
        }

        req.user = decoded;
        next();
    } catch (error) {
        console.error('Auth Error:', error.message);
        const message = error.name === 'TokenExpiredError' ? 'Session expired' : 'Invalid token';
        res.status(401).json({ error: message });
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
        
        console.log('User login attempt:', { email, passwordProvided: !!password });
        
        // Find user
        const user = await User.findOne({ email });
        if (!user) {
            console.log('User not found with email:', email);
            
            // Check if the email exists in the Contributor collection
            const contributor = await require('../Database/module.contibuter').Contributor.findOne({ email });
            if (contributor) {
                console.log('Found as contributor instead of user');
                return res.status(400).json({ 
                    error: 'This email is registered as a contributor, not a regular user. Please use the Contributor login.',
                    accountExists: true,
                    accountType: 'contributor'
                });
            }
            
            // Check if the email exists in the Admin collection
            const admin = await require('../Database/module.admin').Admin.findOne({ email });
            if (admin) {
                console.log('Found as admin instead of user');
                return res.status(400).json({ 
                    error: 'This email is registered as an admin, not a regular user. Please use the Admin login.',
                    accountExists: true,
                    accountType: 'admin'
                });
            }
            
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        console.log('User found, verifying password');
        
        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            console.log('Password verification failed');
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        console.log('Password valid, generating token');
        
        // Generate JWT token with userType property
        const token = jwt.sign({ 
            userId: user._id, 
            email: user.email,
            userType: 'user'  // This is critical for dashboard access
        }, SECRET, { expiresIn: '7d' });
        
        console.log('Login successful for user:', user.email);
        
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
        
        console.log('Verification request for user:', userId);
        
        // Request verification code
        const verificationResult = await VerificationService.requestVerification(userId);
        
        if (verificationResult.success) {
            return res.status(200).json({
                success: true,
                message: verificationResult.message
            });
        } else {
            return res.status(400).json({
                success: false,
                error: verificationResult.message
            });
        }
    } catch (error) {
        console.error('Verification request error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Internal server error' 
        });
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
        
        // Find user by ID
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Check if email is already verified
        if (user.isEmailVerified) {
            return res.status(200).json({ 
                message: 'Email is already verified',
                success: true,
                isVerified: true
            });
        }
        
        // Check verification code
        if (user.verificationOTP === code) {
            // Check if OTP is still valid
            if (user.verificationOTPExpires && new Date() <= user.verificationOTPExpires) {
                // Mark email as verified
                user.isEmailVerified = true;
                user.verificationToken = null;
                user.verificationTokenExpires = null;
                user.verificationCode = null;
                user.verificationCodeExpires = null;
                user.verificationOTP = null;
                user.verificationOTPExpires = null;
                
                await user.save();
                
                res.json({ 
                    message: 'Email verified successfully',
                    success: true,
                    isVerified: true
                });
            } else {
                res.status(400).json({ 
                    error: 'Verification code has expired. Please request a new verification email.',
                    success: false,
                    isVerified: false
                });
            }
        } else {
            res.status(400).json({ 
                error: 'Invalid verification code',
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

// Verify email with OTP - improved version with better error handling
userRouter.post('/verify-otp', async (req, res) => {
    try {
        const { email, otp } = req.body;
        
        console.log('OTP verification attempt:', { email, otpProvided: !!otp });
        
        if (!email || !otp) {
            return res.status(400).json({ error: 'Email and OTP are required' });
        }
        
        // Find user by email
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            console.log('User not found for OTP verification:', email);
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Check if email is already verified
        if (user.isEmailVerified) {
            console.log('Email already verified for:', email);
            return res.status(200).json({ 
                message: 'Email is already verified', 
                success: true, 
                isVerified: true
            });
        }
        
        console.log(`Verifying OTP for ${user.email}. Provided: ${otp}, Stored: ${user.verificationOTP || 'none'}`);
        
        // Check if OTP exists in user record
        if (!user.verificationOTP) {
            return res.status(400).json({ 
                error: 'No OTP found. Please request a new verification email.', 
                success: false 
            });
        }
        
        // Verify the OTP
        if (user.verificationOTP !== otp) {
            console.log(`OTP mismatch. User: ${user.email}, Provided: ${otp}, Expected: ${user.verificationOTP}`);
            return res.status(400).json({ 
                error: 'Invalid verification OTP', 
                success: false 
            });
        }
        
        // Check if OTP has expired
        const now = new Date();
        if (!user.verificationOTPExpires || now > user.verificationOTPExpires) {
            console.log(`OTP expired for ${user.email}. Expired at: ${user.verificationOTPExpires}`);
            return res.status(400).json({ 
                error: 'Verification OTP has expired. Please request a new one.', 
                success: false 
            });
        }
        
        console.log(`OTP verification successful for ${user.email}`);
        
        // Mark email as verified
        user.isEmailVerified = true;
        user.verificationCode = null;
        user.verificationCodeExpires = null;
        user.verificationToken = null;
        user.verificationTokenExpires = null;
        user.verificationOTP = null;
        user.verificationOTPExpires = null;
        
        await user.save();
        
        // Generate JWT token with verified status
        const token = jwt.sign({ 
            userId: user._id, 
            email: user.email,
            isVerified: true,
            userType: 'user'
        }, SECRET, { expiresIn: '7d' });
        
        console.log(`Generated new token for verified user: ${user.email}`);
        
        res.json({
            message: 'Email verified successfully using OTP',
            success: true,
            isVerified: true,
            token
        });
    } catch (error) {
        console.error('OTP verification error:', error);
        res.status(500).json({ 
            error: 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined 
        });
    }
});

// Add new simplified verification endpoint that aligns with frontend requests
userRouter.post('/verify', async (req, res) => {
    try {
        const { code } = req.body;
        const authHeader = req.headers.authorization;
        
        console.log('Verify endpoint called with:', { code, hasAuthHeader: !!authHeader });
        
        if (!code) {
            return res.status(400).json({ 
                success: false, 
                error: 'Verification code is required' 
            });
        }
        
        // Get user ID from JWT token
        let userId;
        try {
            if (!authHeader) {
                return res.status(401).json({ 
                    success: false, 
                    error: 'Authentication required' 
                });
            }
            
            const [bearer, token] = authHeader.split(' ');
            if (bearer !== 'Bearer' || !token) {
                return res.status(401).json({ 
                    success: false, 
                    error: 'Invalid token format' 
                });
            }
            
            const decoded = jwt.verify(token, SECRET);
            userId = decoded.userId;
            
        } catch (tokenError) {
            console.error('Token verification error:', tokenError);
            return res.status(401).json({ 
                success: false, 
                error: 'Invalid or expired token' 
            });
        }
        
        // Find user
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                error: 'User not found' 
            });
        }
        
        // Call verification service to verify the code
        const verificationResult = await VerificationService.verifyEmail(userId, code);
        
        // If verification was successful, generate a new token with verified status
        if (verificationResult.success) {
            // Generate new JWT token with verified status
            const newToken = jwt.sign({ 
                userId: user._id, 
                email: user.email,
                isVerified: true,
                userType: 'user'
            }, SECRET, { expiresIn: '7d' });
            
            return res.status(200).json({
                success: true,
                message: 'Email verified successfully',
                token: newToken
            });
        } else {
            return res.status(400).json({
                success: false,
                error: verificationResult.message
            });
        }
    } catch (error) {
        console.error('Email verification error:', error);
        return res.status(500).json({ 
            success: false, 
            error: 'Internal server error' 
        });
    }
});

// Website monitoring endpoints
userRouter.post('/monitors', authenticateUser, async (req, res) => {
    try {
        const { name, url } = req.body;
        const userId = req.user.userId;

        // Validate input
        if (!name || !url) {
            return res.status(400).json({ error: 'Name and URL are required' });
        }

        // Validate URL format
        try {
            new URL(url);
        } catch (e) {
            return res.status(400).json({ error: 'Invalid URL format' });
        }

        // Fixed incorrect import - separate imports for each model
        const { Website } = require('../Database/module.websites');
        const { Monitor } = require('../Database/module.monitor');
        
        // Create or find website
        let website = await Website.findOne({ owner: userId, url });
        if (!website) {
            website = new Website({ 
                name, 
                url, 
                owner: userId,
                category: req.body.category || 'General' // Add default category which is required
            });
            await website.save();
        }

        // Create monitor
        const newMonitor = new Monitor({
            name,
            url,
            website: website._id,
            owner: userId
        });

        await newMonitor.save();

        res.status(201).json({
            success: true,
            monitor: {
                id: newMonitor._id,
                name: newMonitor.name,
                url: newMonitor.url,
                status: 'active'
            }
        });
    } catch (error) {
        console.error('Monitor Creation Error:', error);
        res.status(500).json({ 
            error: 'Failed to create monitor',
            details: error.message
        });
    }
});

userRouter.get('/monitors', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.userId;
        console.log('Fetching monitors for user:', userId);
        
        // Get all monitors for websites the user owns
        const { Website } = require('../Database/module.websites');
        const { Monitor } = require('../Database/module.monitor');
        const { MonitorCheck } = require('../Database/module.monitorCheck');
        
        const userWebsites = await Website.find({ owner: userId });
        console.log('Found user websites:', userWebsites.length);
        
        if (userWebsites.length === 0) {
            return res.json({ monitors: [] });
        }
        
        const websiteIds = userWebsites.map(website => website._id);
        
        const monitors = await Monitor.find({ website: { $in: websiteIds } })
            .populate('website', 'name url status')
            .sort({ createdAt: -1 });
            
        console.log('Found monitors:', monitors.length);
        
        if (monitors.length === 0) {
            return res.json({ monitors: [] });
        }
        
        // Get recent checks for status and uptime calculation
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        
        const monitorIds = monitors.map(m => m._id);
        const recentChecks = await MonitorCheck.find({
            monitor: { $in: monitorIds },
            timestamp: { $gte: thirtyDaysAgo }
        });
        
        console.log('Found recent checks:', recentChecks.length);
        
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
            const latestCheck = monitorChecks.length > 0 
                ? monitorChecks.sort((a, b) => b.timestamp - a.timestamp)[0]
                : null;
            
            const status = !latestCheck ? 'unknown' : 
                latestCheck.success ? 'up' : 'down';
            
            // Calculate average response time
            const avgResponseTime = totalChecks > 0
                ? (monitorChecks.reduce((sum, check) => sum + (check.responseTime || 0), 0) / totalChecks).toFixed(0)
                : 0;
            
            return {
                id: monitor._id,
                name: monitor.name,
                url: monitor.url,
                type: monitor.type || 'http',
                status,
                uptime: parseFloat(uptime),
                avgResponseTime: parseInt(avgResponseTime),
                lastChecked: latestCheck ? latestCheck.timestamp : null,
                website: monitor.website ? {
                    id: monitor.website._id,
                    name: monitor.website.name,
                    url: monitor.website.url
                } : null,
                active: monitor.active !== undefined ? monitor.active : true
            };
        });
        
        console.log('Returning monitors with stats:', monitorsWithStats.length);
        res.json({ monitors: monitorsWithStats });
    } catch (error) {
        console.error('Error getting monitors:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
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

// Add a direct dashboard data endpoint
userRouter.get('/dashboard', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.userId;
        console.log('Fetching dashboard data for user:', userId);
        
        // Get basic user info
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Get monitors (reusing existing code)
        const { Website } = require('../Database/module.websites');
        const { Monitor } = require('../Database/module.monitor');
        const { MonitorCheck } = require('../Database/module.monitorCheck');
        
        const userWebsites = await Website.find({ owner: userId });
        console.log('Found user websites:', userWebsites.length);
        
        // If no websites, return empty dashboard
        if (userWebsites.length === 0) {
            return res.json({ 
                user: {
                    name: user.name,
                    email: user.email
                },
                monitors: [],
                stats: {
                    totalMonitors: 0,
                    monitorsUp: 0,
                    monitorsDown: 0,
                    averageUptime: 0
                }
            });
        }
        
        const websiteIds = userWebsites.map(website => website._id);
        
        const monitors = await Monitor.find({ website: { $in: websiteIds } })
            .populate('website', 'name url status')
            .sort({ createdAt: -1 });
        
        // Calculate dashboard stats and return data
        const monitorsWithStats = await calculateMonitorStats(monitors);
        
        // Calculate overall stats
        const monitorsUp = monitorsWithStats.filter(m => m.status === 'up').length;
        const monitorsDown = monitorsWithStats.filter(m => m.status === 'down').length;
        const averageUptime = monitorsWithStats.length > 0 
            ? monitorsWithStats.reduce((sum, m) => sum + m.uptime, 0) / monitorsWithStats.length 
            : 0;
        
        res.json({
            user: {
                name: user.name,
                email: user.email
            },
            monitors: monitorsWithStats,
            stats: {
                totalMonitors: monitorsWithStats.length,
                monitorsUp,
                monitorsDown,
                averageUptime
            }
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

// Helper function to calculate monitor stats
async function calculateMonitorStats(monitors) {
    if (!monitors || monitors.length === 0) {
        return [];
    }
    
    const { MonitorCheck } = require('../Database/module.monitorCheck');
    
    // Get recent checks for all monitors
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const monitorIds = monitors.map(m => m._id);
    const recentChecks = await MonitorCheck.find({
        monitor: { $in: monitorIds },
        timestamp: { $gte: thirtyDaysAgo }
    });
    
    return monitors.map(monitor => {
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
        const latestCheck = monitorChecks.length > 0 
            ? monitorChecks.sort((a, b) => b.timestamp - a.timestamp)[0]
            : null;
        
        const status = !latestCheck ? 'unknown' : 
            latestCheck.success ? 'up' : 'down';
        
        // Calculate average response time
        const avgResponseTime = totalChecks > 0
            ? (monitorChecks.reduce((sum, check) => sum + (check.responseTime || 0), 0) / totalChecks).toFixed(0)
            : 0;
        
        return {
            id: monitor._id,
            name: monitor.name,
            url: monitor.url,
            type: monitor.type || 'http',
            status,
            uptime: parseFloat(uptime),
            responseTime: parseInt(avgResponseTime),
            lastChecked: latestCheck ? latestCheck.timestamp : null,
            website: monitor.website ? {
                id: monitor.website._id,
                name: monitor.website.name,
                url: monitor.website.url
            } : null,
            active: monitor.active !== undefined ? monitor.active : true
        };
    });
}

// Sync Clerk user with our DB
userRouter.post('/clerk-sync', verifyClerkToken, async (req, res) => {
    try {
        const { clerkId } = req.body;
        
        if (!clerkId) {
            return res.status(400).json({ error: 'Clerk ID is required' });
        }
        
        // Check if user already exists
        let user = await User.findOne({ clerkId });
        
        if (user) {
            // User already exists, update if needed
            res.json({
                message: 'User account already linked',
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    isEmailVerified: user.isEmailVerified
                }
            });
        } else {
            // Create new user based on Clerk data
            if (!req.user) {
                return res.status(400).json({ error: 'User data not found' });
            }
            
            const email = req.user.email;
            
            // Check if user exists with this email
            user = await User.findOne({ email });
            
            if (user) {
                // Link existing user to Clerk
                user.clerkId = clerkId;
                await user.save();
                
                res.json({
                    message: 'Existing user linked to Clerk account',
                    user: {
                        id: user._id,
                        name: user.name,
                        email: user.email,
                        isEmailVerified: user.isEmailVerified
                    }
                });
            } else {
                // Create new user
                const newUser = new User({
                    name: req.user.name || 'Clerk User',
                    email,
                    clerkId,
                    isEmailVerified: true // Clerk already verifies emails
                });
                
                await newUser.save();
                
                // Create wallet
                const wallet = new UserWallet({
                    user: newUser._id
                });
                await wallet.save();
                
                res.status(201).json({
                    message: 'User account created and linked to Clerk',
                    user: {
                        id: newUser._id,
                        name: newUser.name,
                        email: newUser.email,
                        isEmailVerified: newUser.isEmailVerified
                    }
                });
            }
        }
    } catch (error) {
        console.error('Error syncing Clerk user:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Export the middleware and router 
module.exports = { userRouter, authenticateUser };
