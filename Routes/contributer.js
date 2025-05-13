const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { Contributor } = require('../Database/module.contibuter');
const { ContributorWallet } = require('../Database/module.contibutorWallet');
const { Website } = require('../Database/module.websites');
const emailService = require('../utils/emailService');
const { contributorRegistrationSchema, userLoginSchema, contributorProfileUpdateSchema, validate } = require('../utils/validationSchema');
const contributorRouter = express.Router();
const SECRET = process.env.CONTRIBUTOR_JWT_SECRET;

// Middleware to verify contributor token
const authenticateContributor = (req, res, next) => {
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
        req.contributor = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid token' });
    }
};

contributorRouter.post('/signup', validate(contributorRegistrationSchema), async (req, res) => {
    try {
        const { name, email, password, expertise, bio } = req.body;
        
        // Check if contributor already exists
        const existingContributor = await Contributor.findOne({ email });
        if (existingContributor) {
            return res.status(409).json({ error: 'This email is already registered. Please log in or use a different email address.' });
        }
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Create new contributor
        const newContributor = new Contributor({
            name,
            email,
            password: hashedPassword,
            expertise: expertise || [],
            bio: bio || ''
        });
        
        await newContributor.save();
        
        // Create wallet for the contributor
        const wallet = new ContributorWallet({
            contributor: newContributor._id
        });
        
        await wallet.save();
        
        // Generate JWT token
        const token = jwt.sign({ contributorId: newContributor._id, email: newContributor.email }, SECRET, { expiresIn: '7d' });
        
        // Send welcome email and verification code if email service is configured
        const emailCredentials = process.env.GMAIL_USER && process.env.GMAIL_PASSWORD;
        let verificationInfo = {};
        
        if (emailCredentials) {
            try {
                // Send welcome email
                await emailService.sendWelcomeEmail({
                    email: newContributor.email,
                    name: newContributor.name,
                    userType: 'contributor'
                });
                
                // Generate verification token instead of code
                const verificationToken = jwt.sign(
                    { contributorId: newContributor._id },
                    SECRET,
                    { expiresIn: '10m' }
                );
                
                // Set expiration date for verification token
                const verificationTokenExpires = new Date();
                verificationTokenExpires.setMinutes(verificationTokenExpires.getMinutes() + 10);
                
                // Save token hash to database
                newContributor.verificationToken = verificationToken;
                newContributor.verificationTokenExpires = verificationTokenExpires;
                newContributor.verificationAttempts = 1;
                newContributor.lastVerificationAttempt = new Date();
                
                await newContributor.save();
                
                // Create verification URL
                const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
                const verificationUrl = `${baseUrl}/contributor/verify?token=${verificationToken}`;
                
                // Send verification email with link
                await emailService.sendEmail({
                    to: newContributor.email,
                    subject: 'Verify Your Email - UplinkBe',
                    text: `
                        Hello ${newContributor.name},
                        
                        Please click the link below to verify your email address:
                        ${verificationUrl}
                        
                        This link is valid for 10 minutes.
                        
                        If you didn't request this verification, please ignore this email.
                        
                        Thank you,
                        The UplinkBe Team
                    `,
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                            <h2 style="color: #3182ce;">Verify Your Email Address</h2>
                            <p>Hello ${newContributor.name},</p>
                            <p>Please click the button below to verify your email address:</p>
                            
                            <div style="margin: 20px 0; text-align: center;">
                                <a href="${verificationUrl}" style="background-color: #3182ce; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                                    Verify My Email
                                </a>
                            </div>
                            
                            <p>This link is valid for <strong>10 minutes</strong>.</p>
                            <p>If the button doesn't work, you can copy and paste the following link into your browser:</p>
                            <p style="word-break: break-all; background-color: #f8fafc; padding: 10px; border-radius: 4px;">${verificationUrl}</p>
                            
                            <p>If you didn't request this verification, please ignore this email.</p>
                            
                            <p>Thank you,<br>The UplinkBe Team</p>
                        </div>
                    `
                });
                
                verificationInfo = {
                    isEmailVerified: false,
                    verificationSent: true,
                    verificationMessage: 'Verification link has been sent to your email'
                };
            } catch (emailError) {
                console.error('Failed to send email:', emailError);
                verificationInfo = {
                    isEmailVerified: false,
                    verificationSent: false,
                    verificationMessage: 'Failed to send verification email'
                };
            }
        } else {
            // No email service configured, mark as verified by default
            newContributor.isEmailVerified = true;
            await newContributor.save();
            verificationInfo = {
                isEmailVerified: true,
                verificationMessage: 'Email verification is not enabled on this server'
            };
        }
        
        res.status(201).json({ 
            message: 'Contributor created successfully',
            token,
            contributor: {
                id: newContributor._id,
                name: newContributor.name,
                email: newContributor.email,
                expertise: newContributor.expertise,
                bio: newContributor.bio,
                isEmailVerified: newContributor.isEmailVerified
            },
            verification: verificationInfo
        });
    } catch (error) {
        console.error('Contributor signup error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

contributorRouter.post('/signin', validate(userLoginSchema), async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Find contributor
        const contributor = await Contributor.findOne({ email });
        if (!contributor) {
            // Check if the email exists in the User collection
            const user = await require('../Database/module.user').User.findOne({ email });
            if (user) {
                return res.status(400).json({ 
                    error: 'This email is registered as a regular user, not a contributor. Please use the User login.',
                    accountExists: true,
                    accountType: 'user'
                });
            }
            
            // Check if the email exists in the Admin collection
            const admin = await require('../Database/module.admin').Admin.findOne({ email });
            if (admin) {
                return res.status(400).json({ 
                    error: 'This email is registered as an admin, not a contributor. Please use the Admin login.',
                    accountExists: true,
                    accountType: 'admin'
                });
            }
            
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Verify password
        const isPasswordValid = await bcrypt.compare(password, contributor.password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Generate JWT token
        const token = jwt.sign({ 
            contributorId: contributor._id, 
            email: contributor.email,
            isVerified: contributor.isEmailVerified 
        }, SECRET, { expiresIn: '7d' });
        
        // Get wallet data
        const wallet = await ContributorWallet.findOne({ contributor: contributor._id });
        
        // Generate a verification token if email is not verified
        let verificationInfo = {};
        if (!contributor.isEmailVerified) {
            // Generate a verification token
            const verificationToken = jwt.sign(
                { contributorId: contributor._id },
                SECRET,
                { expiresIn: '1d' }
            );
            
            // Create verification URL
            const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
            const verificationUrl = `${baseUrl}/contributor/verify?token=${verificationToken}`;
            
            verificationInfo = {
                isEmailVerified: false,
                verificationToken,
                verificationUrl
            };
        }
        
        res.json({
            message: 'Sign in successful',
            token,
            contributor: {
                id: contributor._id,
                name: contributor.name,
                email: contributor.email,
                expertise: contributor.expertise,
                bio: contributor.bio,
                isEmailVerified: contributor.isEmailVerified,
                profilePicture: contributor.profilePicture
            },
            wallet: wallet ? {
                id: wallet._id,
                balance: wallet.balance,
                currency: wallet.currency
            } : null,
            verification: verificationInfo
        });
    } catch (error) {
        console.error('Contributor signin error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

contributorRouter.put('/update', authenticateContributor, validate(contributorProfileUpdateSchema), async (req, res) => {
    try {
        const { name, expertise, bio, profilePicture, currentPassword, newPassword } = req.body;
        const contributorId = req.contributor.contributorId;
        
        // Find contributor
        const contributor = await Contributor.findById(contributorId);
        if (!contributor) {
            return res.status(404).json({ error: 'Contributor not found' });
        }
        
        // Update contributor fields if provided
        if (name) contributor.name = name;
        if (expertise) contributor.expertise = expertise;
        if (bio) contributor.bio = bio;
        if (profilePicture) contributor.profilePicture = profilePicture;
        
        // Handle password change if requested
        if (currentPassword && newPassword) {
            // Verify current password
            const isPasswordValid = await bcrypt.compare(currentPassword, contributor.password);
            if (!isPasswordValid) {
                return res.status(401).json({ error: 'Current password is incorrect' });
            }
            
            // Hash and set new password
            const hashedPassword = await bcrypt.hash(newPassword, 10);
            contributor.password = hashedPassword;
        }
        
        contributor.updatedAt = Date.now();
        await contributor.save();
        
        res.json({ 
            message: 'Contributor updated successfully',
            contributor: {
                id: contributor._id,
                name: contributor.name,
                email: contributor.email,
                expertise: contributor.expertise,
                bio: contributor.bio,
                profilePicture: contributor.profilePicture
            }
        });
    } catch (error) {
        console.error('Contributor update error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

contributorRouter.get('/profile', authenticateContributor, async (req, res) => {
    try {
        const contributorId = req.contributor.contributorId;
        
        // Find contributor and wallet
        const contributor = await Contributor.findById(contributorId);
        if (!contributor) {
            return res.status(404).json({ error: 'Contributor not found' });
        }
        
        const wallet = await ContributorWallet.findOne({ contributor: contributorId });
        const assignedWebsites = await Website.find({ contributors: contributorId });
        
        res.json({
            contributor: {
                id: contributor._id,
                name: contributor.name,
                email: contributor.email,
                expertise: contributor.expertise,
                bio: contributor.bio,
                profilePicture: contributor.profilePicture,
                isEmailVerified: contributor.isEmailVerified || false,
                createdAt: contributor.createdAt
            },
            wallet: wallet ? {
                balance: wallet.balance,
                currency: wallet.currency
            } : null,
            websites: assignedWebsites.map(website => ({
                id: website._id,
                name: website.name,
                url: website.url,
                status: website.status
            }))
        });
    } catch (error) {
        console.error('Profile fetch error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Request email verification link
contributorRouter.post('/verify/request', authenticateContributor, async (req, res) => {
    try {
        const contributorId = req.contributor.contributorId;
        const contributor = await Contributor.findById(contributorId);
        
        if (!contributor) {
            return res.status(404).json({ error: 'Contributor not found' });
        }
        
        // Generate a verification token
        const verificationToken = jwt.sign(
            { contributorId: contributor._id },
            SECRET,
            { expiresIn: '10m' }
        );
        
        // Set expiration for 10 minutes from now
        const verificationTokenExpires = new Date();
        verificationTokenExpires.setMinutes(verificationTokenExpires.getMinutes() + 10);
        
        // Update the contributor's verification information
        contributor.verificationToken = verificationToken;
        contributor.verificationTokenExpires = verificationTokenExpires;
        contributor.verificationAttempts = (contributor.verificationAttempts || 0) + 1;
        contributor.lastVerificationAttempt = new Date();
        
        await contributor.save();
        
        // Create verification URL
        const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const verificationUrl = `${baseUrl}/contributor/verify?token=${verificationToken}`;
        
        // Send the verification email with link
        const emailResult = await emailService.sendEmail({
            to: contributor.email,
            subject: 'Verify Your Email - UplinkBe',
            text: `
                Hello ${contributor.name},
                
                Please click the link below to verify your email address:
                ${verificationUrl}
                
                This link is valid for 10 minutes.
                
                If you didn't request this verification, please ignore this email.
                
                Thank you,
                The UplinkBe Team
            `,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #3182ce;">Verify Your Email Address</h2>
                    <p>Hello ${contributor.name},</p>
                    <p>Please click the button below to verify your email address:</p>
                    
                    <div style="margin: 20px 0; text-align: center;">
                        <a href="${verificationUrl}" style="background-color: #3182ce; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                            Verify My Email
                        </a>
                    </div>
                    
                    <p>This link is valid for <strong>10 minutes</strong>.</p>
                    <p>If the button doesn't work, you can copy and paste the following link into your browser:</p>
                    <p style="word-break: break-all; background-color: #f8fafc; padding: 10px; border-radius: 4px;">${verificationUrl}</p>
                    
                    <p>If you didn't request this verification, please ignore this email.</p>
                    
                    <p>Thank you,<br>The UplinkBe Team</p>
                </div>
            `
        });
        
        if (!emailResult) {
            return res.status(500).json({ 
                error: 'Failed to send verification email. Email service might not be configured correctly.',
                success: false
            });
        }
        
        res.json({ 
            message: 'Verification link has been sent to your email address',
            success: true 
        });
    } catch (error) {
        console.error('Request verification error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Add a new route for verification via link
contributorRouter.get('/verify-email', async (req, res) => {
    try {
        const { token } = req.query;
        
        if (!token) {
            return res.status(400).json({ error: 'Verification token is required' });
        }
        
        // Verify token
        let decoded;
        try {
            decoded = jwt.verify(token, SECRET);
        } catch (tokenError) {
            return res.status(400).json({ 
                error: 'Invalid or expired verification token. Please request a new one.',
                success: false 
            });
        }
        
        const contributorId = decoded.contributorId;
        const contributor = await Contributor.findById(contributorId);
        
        if (!contributor) {
            return res.status(404).json({ error: 'Contributor not found' });
        }
        
        // Check if email is already verified
        if (contributor.isEmailVerified) {
            return res.status(200).json({ 
                message: 'Email is already verified', 
                success: true, 
                isVerified: true,
                redirectUrl: '/contributor/dashboard'
            });
        }
        
        // Mark the email as verified and clear verification data
        contributor.isEmailVerified = true;
        contributor.verificationToken = null;
        contributor.verificationTokenExpires = null;
        
        await contributor.save();
        
        // We don't redirect here, we just return success and a redirect URL for the frontend to handle
        res.json({ 
            message: 'Email verified successfully', 
            success: true, 
            isVerified: true,
            redirectUrl: '/contributor/dashboard'
        });
    } catch (error) {
        console.error('Email verification error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Keep the original code verification route for backward compatibility
contributorRouter.post('/verify', authenticateContributor, async (req, res) => {
    try {
        const contributorId = req.contributor.contributorId;
        const { code } = req.body;
        
        if (!code) {
            return res.status(400).json({ error: 'Verification code is required' });
        }
        
        const contributor = await Contributor.findById(contributorId);
        if (!contributor) {
            return res.status(404).json({ error: 'Contributor not found' });
        }
        
        // Check if email is already verified
        if (contributor.isEmailVerified) {
            return res.status(400).json({ 
                error: 'Email is already verified', 
                success: false, 
                isVerified: true 
            });
        }
        
        // Handle both token and code verification
        // For backward compatibility, we'll try to use the verification code if it exists
        // and fall back to token verification if a code doesn't exist
        
        let isVerified = false;
        
        // Check if we have a verification code (old method)
        if (contributor.verificationCode) {
            // Check if code has expired
            if (new Date() > contributor.verificationCodeExpires) {
                return res.status(400).json({ 
                    error: 'Verification code has expired. Please request a new code.', 
                    success: false, 
                    isVerified: false 
                });
            }
            
            // Check if the code matches
            if (contributor.verificationCode === code) {
                isVerified = true;
            } else {
                return res.status(400).json({ 
                    error: 'Invalid verification code', 
                    success: false, 
                    isVerified: false 
                });
            }
        }
        // Check if we have a verification token (new method)
        else if (contributor.verificationToken) {
            // We can't verify with a code if we're using the token method
            return res.status(400).json({ 
                error: 'Please use the verification link sent to your email', 
                success: false, 
                isVerified: false,
                useLink: true
            });
        }
        else {
            return res.status(400).json({ 
                error: 'No verification code found. Please request a new code.', 
                success: false, 
                isVerified: false 
            });
        }
        
        if (isVerified) {
            // Mark the email as verified and clear verification data
            contributor.isEmailVerified = true;
            contributor.verificationCode = null;
            contributor.verificationCodeExpires = null;
            
            await contributor.save();
            
            // Send a confirmation email
            await emailService.sendEmail({
                to: contributor.email,
                subject: 'Email Verification Successful - UplinkBe',
                text: `
                    Hello ${contributor.name},
                    
                    Your email has been successfully verified!
                    
                    You now have full access to all features of the UplinkBe platform.
                    
                    Thank you,
                    The UplinkBe Team
                `
            });
        }
        
        res.json({
            message: 'Verification result',
            success: isVerified,
            isEmailVerified: isVerified
        });
    } catch (error) {
        console.error('Verification error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get verification status
contributorRouter.get('/verify/status', authenticateContributor, async (req, res) => {
    try {
        const contributorId = req.contributor.contributorId;
        const contributor = await Contributor.findById(contributorId);
        
        if (!contributor) {
            return res.status(404).json({ error: 'Contributor not found' });
        }
        
        // Get remaining attempts for today
        let remainingAttempts = 5; // Default max attempts
        
        if (contributor.lastVerificationAttempt) {
            const lastAttemptDate = new Date(contributor.lastVerificationAttempt);
            const today = new Date();
            
            // If last attempt was today, calculate remaining attempts
            if (lastAttemptDate.getDate() === today.getDate() && 
                lastAttemptDate.getMonth() === today.getMonth() && 
                lastAttemptDate.getFullYear() === today.getFullYear()) {
                remainingAttempts = Math.max(0, 5 - (contributor.verificationAttempts || 0));
            }
        }
        
        res.json({
            isEmailVerified: contributor.isEmailVerified || false,
            remainingAttempts,
            nextVerificationAvailable: (contributor.verificationAttempts || 0) >= 5 ? 'Tomorrow' : 'Now',
            emailServiceConfigured: !!(process.env.GMAIL_USER && process.env.GMAIL_PASSWORD)
        });
    } catch (error) {
        console.error('Verification status error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Forgot password - request reset
contributorRouter.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }
        
        // Find contributor
        const contributor = await Contributor.findOne({ email });
        if (!contributor) {
            // For security reasons, still return success even if email doesn't exist
            return res.status(200).json({ message: 'Reset link sent successfully' });
        }
        
        // Generate a reset token
        const resetToken = jwt.sign(
            { contributorId: contributor._id },
            SECRET,
            { expiresIn: '1h' }
        );
        
        // Set expiration for 1 hour from now
        const resetTokenExpires = new Date();
        resetTokenExpires.setHours(resetTokenExpires.getHours() + 1);
        
        // Update contributor with reset token
        contributor.resetCode = resetToken;
        contributor.resetCodeExpires = resetTokenExpires;
        await contributor.save();
        
        // Create reset URL
        const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const resetUrl = `${baseUrl}/contributor/reset-password?token=${resetToken}`;
        
        // Send the password reset email
        await emailService.sendEmail({
            to: contributor.email,
            subject: 'Password Reset - UplinkBe',
            text: `
                Hello ${contributor.name},
                
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
                    <p>Hello ${contributor.name},</p>
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
        console.error('Forgot password error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Reset password using token
contributorRouter.post('/reset-password', async (req, res) => {
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
        
        // Find contributor
        const contributor = await Contributor.findById(decoded.contributorId);
        if (!contributor) {
            return res.status(404).json({ error: 'Contributor not found' });
        }
        
        // Check if reset token matches and hasn't expired
        if (contributor.resetCode !== token || new Date() > contributor.resetCodeExpires) {
            return res.status(400).json({ error: 'Invalid or expired token. Please request a new reset link.' });
        }
        
        // Hash the new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        // Update password and clear reset tokens
        contributor.password = hashedPassword;
        contributor.resetCode = null;
        contributor.resetCodeExpires = null;
        await contributor.save();
        
        res.json({ message: 'Password reset successful. You can now login with your new password.' });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = { contributorRouter, authenticateContributor };