const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { Admin } = require('../Database/module.admin');
const { Website } = require('../Database/module.websites');
const adminRouter = express.Router();
const SECRET = process.env.ADMIN_JWT_SECRET;

// Middleware to verify admin token
const authenticateAdmin = (req, res, next) => {
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
        
        // Ensure we have an adminId in the token payload
        if (!decoded.adminId) {
            return res.status(401).json({ 
                error: 'Invalid token payload', 
                message: 'Token missing required admin information'
            });
        }
        
        req.admin = decoded;
        console.log('Admin authenticated:', decoded.adminId);
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

adminRouter.post('/signup', async (req, res) => {
    try {
        const { name, email, password, role } = req.body;
        
        // Validate input
        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Name, email, and password are required' });
        }
        
        // Check if admin already exists
        const existingAdmin = await Admin.findOne({ email });
        if (existingAdmin) {
            return res.status(409).json({ error: 'Admin with this email already exists' });
        }
        
        // For security, only allow super admin creation if there are no admins yet
        if (role === 'super') {
            const adminCount = await Admin.countDocuments();
            if (adminCount > 0) {
                // Only existing admins can create new super admins
                return res.status(403).json({ error: 'Unauthorized to create super admin' });
            }
        }
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Create new admin
        const newAdmin = new Admin({
            name,
            email,
            password: hashedPassword,
            role: role || 'regular'
        });
        
        await newAdmin.save();
        
        // Generate JWT token
        const token = jwt.sign({ adminId: newAdmin._id, email: newAdmin.email, role: newAdmin.role }, SECRET, { expiresIn: '7d' });
        
        res.status(201).json({ 
            message: 'Admin created successfully',
            token,
            admin: {
                id: newAdmin._id,
                name: newAdmin.name,
                email: newAdmin.email,
                role: newAdmin.role
            }
        });
    } catch (error) {
        console.error('Admin signup error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

adminRouter.post('/signin', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Validate input
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }
        
        // Find admin
        const admin = await Admin.findOne({ email });
        if (!admin) {
            // Check if the email exists in the User collection
            const user = await require('../Database/module.user').User.findOne({ email });
            if (user) {
                return res.status(400).json({ 
                    error: 'This email is registered as a regular user, not an admin. Please use the User login.',
                    accountExists: true,
                    accountType: 'user'
                });
            }
            
            // Check if the email exists in the Contributor collection
            const contributor = await require('../Database/module.contibuter').Contributor.findOne({ email });
            if (contributor) {
                return res.status(400).json({ 
                    error: 'This email is registered as a contributor, not an admin. Please use the Contributor login.',
                    accountExists: true,
                    accountType: 'contributor'
                });
            }
            
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Verify password
        const isPasswordValid = await bcrypt.compare(password, admin.password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Generate JWT token
        const token = jwt.sign({ adminId: admin._id, email: admin.email, role: admin.role }, SECRET, { expiresIn: '7d' });
        
        res.json({ 
            message: 'Login successful',
            token,
            admin: {
                id: admin._id,
                name: admin.name,
                email: admin.email,
                role: admin.role,
                isEmailVerified: admin.isEmailVerified || true,
                profilePicture: admin.profilePicture
            }
        });
    } catch (error) {
        console.error('Admin signin error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

adminRouter.put('/update', authenticateAdmin, async (req, res) => {
    try {
        const { name } = req.body;
        const adminId = req.admin.adminId;
        
        // Find admin
        const admin = await Admin.findById(adminId);
        if (!admin) {
            return res.status(404).json({ error: 'Admin not found' });
        }
        
        // Update admin fields if provided
        if (name) admin.name = name;
        
        admin.updatedAt = Date.now();
        await admin.save();
        
        res.json({ 
            message: 'Admin updated successfully',
            admin: {
                id: admin._id,
                name: admin.name,
                email: admin.email,
                role: admin.role
            }
        });
    } catch (error) {
        console.error('Admin update error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

adminRouter.get('/profile', authenticateAdmin, async (req, res) => {
    try {
        const adminId = req.admin.adminId;
        
        // Find admin
        const admin = await Admin.findById(adminId);
        if (!admin) {
            return res.status(404).json({ error: 'Admin not found' });
        }
        
        res.json({
            admin: {
                id: admin._id,
                name: admin.name,
                email: admin.email,
                role: admin.role,
                isEmailVerified: admin.isEmailVerified || true, // Admins are typically always verified
                createdAt: admin.createdAt
            }
        });
    } catch (error) {
        console.error('Profile fetch error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Admin-specific endpoints to manage websites
adminRouter.get('/websites', authenticateAdmin, async (req, res) => {
    try {
        const websites = await Website.find({}).populate('owner', 'name email');
        
        res.json({ websites });
    } catch (error) {
        console.error('Website fetch error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

adminRouter.put('/websites/:id/status', authenticateAdmin, async (req, res) => {
    try {
        const { status } = req.body;
        const websiteId = req.params.id;
        
        // Validate status
        if (!['active', 'pending', 'inactive'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status value' });
        }
        
        // Find and update website
        const website = await Website.findById(websiteId);
        if (!website) {
            return res.status(404).json({ error: 'Website not found' });
        }
        
        website.status = status;
        website.updatedAt = Date.now();
        await website.save();
        
        res.json({ 
            message: 'Website status updated successfully',
            website: {
                id: website._id,
                name: website.name,
                status: website.status
            }
        });
    } catch (error) {
        console.error('Website update error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Admin-specific endpoints to manage users
adminRouter.get('/users', authenticateAdmin, async (req, res) => {
    try {
        const { User } = require('../Database/module.user');
        const users = await User.find({}, 'name email isEmailVerified createdAt updatedAt profilePicture');
        
        res.json({ users });
    } catch (error) {
        console.error('User fetch error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

adminRouter.get('/contributors', authenticateAdmin, async (req, res) => {
    try {
        const { Contributor } = require('../Database/module.contibuter');
        const contributors = await Contributor.find({}, 'name email isEmailVerified createdAt updatedAt expertise bio profilePicture');
        
        res.json({ contributors });
    } catch (error) {
        console.error('Contributors fetch error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

adminRouter.get('/admins', authenticateAdmin, async (req, res) => {
    try {
        const admins = await Admin.find({}, 'name email role createdAt updatedAt');
        
        res.json({ admins });
    } catch (error) {
        console.error('Admins fetch error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Admin-specific endpoint to get website statistics
adminRouter.get('/stats', authenticateAdmin, async (req, res) => {
    try {
        const { User } = require('../Database/module.user');
        const { Contributor } = require('../Database/module.contibuter');
        const { Website } = require('../Database/module.websites');
        const { Monitor } = require('../Database/module.monitor');
        const { MonitorCheck } = require('../Database/module.monitorCheck');
        
        // Count statistics
        const userCount = await User.countDocuments();
        const contributorCount = await Contributor.countDocuments();
        const adminCount = await Admin.countDocuments();
        const websiteCount = await Website.countDocuments();
        const activeWebsiteCount = await Website.countDocuments({ status: 'active' });
        const pendingWebsiteCount = await Website.countDocuments({ status: 'pending' });
        const monitorCount = await Monitor.countDocuments();
        const checkCount = await MonitorCheck.countDocuments();
        
        // Get recent activity
        const recentChecks = await MonitorCheck.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .populate('monitor', 'name')
            .populate('website', 'name url')
            .populate('performedBy', 'name');
        
        res.json({
            stats: {
                users: userCount,
                contributors: contributorCount,
                admins: adminCount,
                websites: {
                    total: websiteCount,
                    active: activeWebsiteCount,
                    pending: pendingWebsiteCount
                },
                monitors: monitorCount,
                checks: checkCount
            },
            recentActivity: recentChecks.map(check => ({
                id: check._id,
                type: 'check',
                monitor: check.monitor?.name,
                website: check.website?.name,
                url: check.website?.url,
                success: check.success,
                performedBy: check.performedBy?.name,
                timestamp: check.createdAt
            }))
        });
    } catch (error) {
        console.error('Stats fetch error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get all monitors (admin can see all)
adminRouter.get('/monitors', authenticateAdmin, async (req, res) => {
    try {
        // Admin can see all monitors
        const { Monitor } = require('../Database/module.monitor');
        const { MonitorCheck } = require('../Database/module.monitorCheck');
        
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

// Admin endpoint to run a manual check on a monitor
adminRouter.post('/monitors/:id/check', authenticateAdmin, async (req, res) => {
    try {
        const { Monitor } = require('../Database/module.monitor');
        const monitoringService = require('../services/monitoringService');
        const monitorId = req.params.id;
        
        // Check if monitor exists
        const monitor = await Monitor.findById(monitorId);
        if (!monitor) {
            return res.status(404).json({ error: 'Monitor not found' });
        }
        
        // Perform manual check as admin
        const adminId = req.admin.adminId;
        const result = await monitoringService.performAdminCheck(monitorId, adminId);
        
        res.json({
            message: 'Check performed successfully',
            result: {
                id: result._id,
                success: result.success,
                statusCode: result.statusCode,
                responseTime: result.responseTime,
                timestamp: result.timestamp
            }
        });
    } catch (error) {
        console.error('Monitor check error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Admin endpoint to manually verify a contributor's email
adminRouter.post('/contributors/:id/verify', authenticateAdmin, async (req, res) => {
    try {
        const contributorId = req.params.id;
        
        // Find the contributor
        const { Contributor } = require('../Database/module.contibuter');
        const contributor = await Contributor.findById(contributorId);
        
        if (!contributor) {
            return res.status(404).json({ error: 'Contributor not found' });
        }
        
        // Mark the contributor as verified
        contributor.isEmailVerified = true;
        await contributor.save();
        
        res.json({ 
            message: 'Contributor email verified successfully',
            contributor: {
                id: contributor._id,
                name: contributor.name,
                email: contributor.email,
                isEmailVerified: contributor.isEmailVerified
            }
        });
    } catch (error) {
        console.error('Admin verify contributor error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Admin endpoint to manually verify a user's email
adminRouter.post('/users/:id/verify', authenticateAdmin, async (req, res) => {
    try {
        const userId = req.params.id;
        
        // Find the user
        const { User } = require('../Database/module.user');
        const user = await User.findById(userId);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Mark the user as verified
        user.isEmailVerified = true;
        await user.save();
        
        res.json({ 
            message: 'User email verified successfully',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                isEmailVerified: user.isEmailVerified
            }
        });
    } catch (error) {
        console.error('Admin verify user error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Request password reset for admin
adminRouter.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }
        
        // Find admin
        const admin = await Admin.findOne({ email });
        if (!admin) {
            // For security reasons, still return success even if email doesn't exist
            return res.status(200).json({ message: 'Reset link sent successfully' });
        }
        
        // Generate a reset token
        const resetToken = jwt.sign(
            { adminId: admin._id },
            SECRET,
            { expiresIn: '1h' }
        );
        
        // Set expiration for 1 hour from now
        const resetTokenExpires = new Date();
        resetTokenExpires.setHours(resetTokenExpires.getHours() + 1);
        
        // Update admin with reset token
        admin.resetToken = resetToken;
        admin.resetTokenExpires = resetTokenExpires;
        await admin.save();
        
        // Create reset URL
        const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const resetUrl = `${baseUrl}/admin/reset-password?token=${resetToken}`;
        
        // Send the password reset email
        const emailService = require('../utils/emailService');
        await emailService.sendEmail({
            to: admin.email,
            subject: 'Password Reset - UplinkBe',
            text: `
                Hello ${admin.name},
                
                We received a request to reset your password. Please click the link below to reset it:
                ${resetUrl}
                
                This link is valid for 1 hour.
                
                If you didn't request this password reset, please ignore this email.
                
                Thank you,
                The UplinkBe Team
            `,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #3182ce;">Password Reset Request</h2>
                    <p>Hello ${admin.name},</p>
                    <p>We received a request to reset your password. Please click the button below to reset it:</p>
                    
                    <div style="margin: 20px 0; text-align: center;">
                        <a href="${resetUrl}" style="background-color: #3182ce; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                            Reset Password
                        </a>
                    </div>
                    
                    <p>This link is valid for <strong>1 hour</strong>.</p>
                    <p>If the button doesn't work, you can copy and paste the following link into your browser:</p>
                    <p style="word-break: break-all; background-color: #f8fafc; padding: 10px; border-radius: 4px;">${resetUrl}</p>
                    
                    <p>If you didn't request this password reset, please ignore this email.</p>
                    
                    <p>Thank you,<br>The UplinkBe Team</p>
                </div>
            `
        });
        
        res.json({ message: 'Reset link sent successfully' });
    } catch (error) {
        console.error('Admin forgot password error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Reset admin password using token
adminRouter.post('/reset-password', async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        
        if (!token || !newPassword) {
            return res.status(400).json({ error: 'Token and new password are required' });
        }
        
        // Verify token
        let decoded;
        try {
            decoded = jwt.verify(token, SECRET);
        } catch (tokenError) {
            return res.status(400).json({ error: 'Invalid or expired token. Please request a new reset link.' });
        }
        
        // Find admin
        const admin = await Admin.findById(decoded.adminId);
        if (!admin) {
            return res.status(404).json({ error: 'Admin not found' });
        }
        
        // Check if reset token matches and hasn't expired
        if (admin.resetToken !== token || new Date() > admin.resetTokenExpires) {
            return res.status(400).json({ error: 'Invalid or expired token. Please request a new reset link.' });
        }
        
        // Hash the new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        // Update password and clear reset tokens
        admin.password = hashedPassword;
        admin.resetToken = null;
        admin.resetTokenExpires = null;
        await admin.save();
        
        res.json({ message: 'Password reset successful. You can now login with your new password.' });
    } catch (error) {
        console.error('Admin reset password error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// API endpoint for verifying admin email with token
adminRouter.post('/verify-email', async (req, res) => {
  try {
    const { email, token } = req.body;
    
    if (!email || !token) {
      return res.status(400).json({ success: false, message: 'Email and token are required' });
    }
    
    // Find admin by email
    const admin = await Admin.findOne({ email: email.toLowerCase() });
    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }
    
    // Verify token
    if (!admin.verificationToken || admin.verificationToken !== token) {
      return res.status(400).json({ success: false, message: 'Invalid verification token' });
    }
    
    // Check if token has expired
    if (admin.verificationTokenExpires && new Date() > admin.verificationTokenExpires) {
      return res.status(400).json({ success: false, message: 'Verification token has expired. Please request a new one.' });
    }
    
    // Mark email as verified
    admin.isEmailVerified = true;
    admin.verificationToken = null;
    admin.verificationTokenExpires = null;
    
    await admin.save();
    
    return res.status(200).json({ success: true, message: 'Email verified successfully' });
  } catch (error) {
    console.error('Error verifying admin email:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// API endpoint for resetting admin password with token
adminRouter.post('/reset-password', async (req, res) => {
  try {
    const { email, token, password } = req.body;
    
    if (!email || !token || !password) {
      return res.status(400).json({ success: false, message: 'Email, token, and password are required' });
    }
    
    // Validate password
    if (password.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters long' });
    }
    
    // Find admin by email
    const admin = await Admin.findOne({ email: email.toLowerCase() });
    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }
    
    // Verify token
    if (!admin.resetToken || admin.resetToken !== token) {
      return res.status(400).json({ success: false, message: 'Invalid reset token' });
    }
    
    // Check if token has expired
    if (admin.resetTokenExpires && new Date() > admin.resetTokenExpires) {
      return res.status(400).json({ success: false, message: 'Reset token has expired. Please request a new one.' });
    }
    
    // Hash the new password
    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Update password and clear reset token
    admin.password = hashedPassword;
    admin.resetToken = null;
    admin.resetTokenExpires = null;
    
    await admin.save();
    
    return res.status(200).json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    console.error('Error resetting admin password:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// API endpoint to request password reset for admin
adminRouter.post('/request-password-reset', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }
    
    // Find admin by email
    const admin = await Admin.findOne({ email: email.toLowerCase() });
    
    // Don't reveal if email exists or not
    if (!admin) {
      return res.status(200).json({ 
        success: true, 
        message: 'If your email is registered, a password reset link has been sent to your email'
      });
    }
    
    // Generate reset token
    const crypto = require('crypto');
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    // Set expiration for 1 hour from now
    const resetTokenExpires = new Date();
    resetTokenExpires.setHours(resetTokenExpires.getHours() + 1);
    
    // Update admin with reset token
    admin.resetToken = resetToken;
    admin.resetTokenExpires = resetTokenExpires;
    
    await admin.save();
    
    // Send email with reset link
    const emailService = require('../utils/emailService');
    await emailService.sendPasswordResetEmail({
      email: admin.email,
      token: resetToken,
      name: admin.name,
      userType: 'admin'
    });
    
    return res.status(200).json({ 
      success: true, 
      message: 'If your email is registered, a password reset link has been sent to your email'
    });
  } catch (error) {
    console.error('Error requesting password reset for admin:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Add dashboard endpoint
adminRouter.get('/dashboard', authenticateAdmin, async (req, res) => {
    try {
        const adminId = req.admin.adminId;
        console.log('Fetching dashboard data for admin:', adminId);
        
        // Get basic admin info
        const admin = await Admin.findById(adminId);
        if (!admin) {
            return res.status(404).json({ error: 'Admin not found' });
        }
        
        // Get system stats
        const { User } = require('../Database/module.user');
        const { Contributor } = require('../Database/module.contibuter');
        const { Website } = require('../Database/module.websites');
        const { Monitor } = require('../Database/module.monitor');
        const { MonitorCheck } = require('../Database/module.monitorCheck');
        
        const userCount = await User.countDocuments();
        const contributorCount = await Contributor.countDocuments();
        const websiteCount = await Website.countDocuments();
        const monitorCount = await Monitor.countDocuments();
        const checkCount = await MonitorCheck.countDocuments();
        
        // Get recent monitor checks for system status
        const now = new Date();
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        
        const recentChecks = await MonitorCheck.find({
            timestamp: { $gte: oneDayAgo }
        }).sort({ timestamp: -1 }).limit(500);
        
        // Calculate system uptime
        const totalChecks = recentChecks.length;
        const successfulChecks = recentChecks.filter(check => check.success).length;
        const systemUptime = totalChecks > 0 
            ? (successfulChecks / totalChecks * 100).toFixed(2) 
            : 100;
        
        // Get status of most recent check for each monitor
        const monitors = await Monitor.find().sort({ createdAt: -1 }).limit(10);
        const monitorStatuses = [];
        
        for (const monitor of monitors) {
            const latestCheck = await MonitorCheck.findOne({ 
                monitor: monitor._id 
            }).sort({ timestamp: -1 });
            
            monitorStatuses.push({
                id: monitor._id,
                name: monitor.name,
                url: monitor.url,
                status: latestCheck?.success ? 'up' : 'down',
                lastChecked: latestCheck?.timestamp
            });
        }
        
        res.json({
            admin: {
                id: admin._id,
                name: admin.name,
                email: admin.email,
                role: admin.role
            },
            stats: {
                users: userCount,
                contributors: contributorCount,
                websites: websiteCount,
                monitors: monitorCount,
                checks: checkCount,
                uptime: parseFloat(systemUptime)
            },
            recentMonitors: monitorStatuses,
            systemStatus: {
                uptime: parseFloat(systemUptime),
                checksToday: totalChecks,
                successfulChecksToday: successfulChecks
            }
        });
    } catch (error) {
        console.error('Admin dashboard error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = { adminRouter, authenticateAdmin };
