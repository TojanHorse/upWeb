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
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ error: 'Authorization header missing' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'Token missing' });
    }

    try {
        const decoded = jwt.verify(token, SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid token' });
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
        
        // Generate JWT token
        const token = jwt.sign({ userId: user._id, email: user.email }, SECRET, { expiresIn: '7d' });
        
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

module.exports = { userRouter, authenticateUser };
