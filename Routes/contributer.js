const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { Contributor } = require('../Database/module.contibuter');
const { ContributorWallet } = require('../Database/module.contibutorWallet');
const { Website } = require('../Database/module.websites');
const emailService = require('../utils/emailService');
const { contributorRegistrationSchema, userLoginSchema, contributorProfileUpdateSchema, otpVerificationSchema, validate } = require('../utils/validationSchema');
const contributorRouter = express.Router();
const SECRET = process.env.CONTRIBUTOR_JWT_SECRET;
const otpUtils = require('../utils/otpGenerator');
const { verifyClerkToken } = require('../utils/clerkAuth');

// Middleware to verify contributor token
const authenticateContributor = (req, res, next) => {
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
        
        // Ensure we have a contributorId in the token payload
        if (!decoded.contributorId) {
            return res.status(401).json({ 
                error: 'Invalid token payload', 
                message: 'Token missing required contributor information'
            });
        }
        
        // Verify token is meant for contributor access
        if (decoded.userType !== 'contributor') {
            return res.status(403).json({
                error: 'Invalid token type',
                message: 'This resource requires contributor access'
            });
        }
        
        req.contributor = decoded;
        console.log('Contributor authenticated:', decoded.contributorId);
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
                
                // Generate OTP for alternative verification
                const verificationOTP = otpUtils.generateOTP(6);
                const verificationOTPExpires = otpUtils.generateOTPExpiry(60); // 1 hour expiry
                
                // Set expiration date for verification token
                const verificationTokenExpires = new Date();
                verificationTokenExpires.setMinutes(verificationTokenExpires.getMinutes() + 10);
                
                // Save token hash and OTP to database
                newContributor.verificationToken = verificationToken;
                newContributor.verificationTokenExpires = verificationTokenExpires;
                newContributor.verificationOTP = verificationOTP;
                newContributor.verificationOTPExpires = verificationOTPExpires;
                newContributor.verificationAttempts = 1;
                newContributor.lastVerificationAttempt = new Date();
                
                await newContributor.save();
                
                // Create verification URL
                const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
                const verificationUrl = `${baseUrl}/contributor/verify?token=${verificationToken}`;
                
                // Send verification email with link and OTP
                await emailService.sendEmail({
                    to: newContributor.email,
                    subject: 'Verify Your Email - UplinkBe',
                    text: `
                        Hello ${newContributor.name},
                        
                        Please click the link below to verify your email address:
                        ${verificationUrl}
                        
                        Alternatively, if the link doesn't work, you can use this OTP code:
                        ${verificationOTP}
                        
                        The link is valid for 10 minutes and the OTP is valid for 1 hour.
                        
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
                            
                            <p>The link is valid for <strong>10 minutes</strong>.</p>
                            <p>If the button doesn't work, you can copy and paste the following link into your browser:</p>
                            <p style="word-break: break-all; background-color: #f8fafc; padding: 10px; border-radius: 4px;">${verificationUrl}</p>
                            
                            <div style="margin: 20px 0; background-color: #f7fafc; border: 1px solid #e2e8f0; border-radius: 5px; padding: 15px; text-align: center;">
                                <p style="margin: 0 0 10px 0;"><strong>Alternatively, you can use this OTP code:</strong></p>
                                <p style="font-size: 24px; letter-spacing: 5px; font-weight: bold; margin: 0;">${verificationOTP}</p>
                                <p style="margin: 10px 0 0 0; font-size: 12px; color: #718096;">This OTP is valid for 1 hour</p>
                            </div>
                            
                            <p>If you didn't request this verification, please ignore this email.</p>
                            
                            <p>Thank you,<br>The UplinkBe Team</p>
                        </div>
                    `
                });
                
                verificationInfo = {
                    isEmailVerified: false,
                    verificationSent: true,
                    verificationMessage: 'Verification link and OTP has been sent to your email'
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
        
        // Generate JWT token - IMPORTANT: Added userType property
        const token = jwt.sign({ 
            contributorId: contributor._id, 
            email: contributor.email,
            isVerified: contributor.isEmailVerified,
            userType: 'contributor' // Add userType to token
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
contributorRouter.post('/verify/request', async (req, res) => {
    try {
        // Try to get the user either from authentication or email in request
        let contributorId;
        let contributor;
        
        // If authenticated, use the token
        if (req.contributor && req.contributor.contributorId) {
            contributorId = req.contributor.contributorId;
            contributor = await Contributor.findById(contributorId);
        } 
        // Otherwise, use email from request
        else if (req.body && req.body.email) {
            contributor = await Contributor.findOne({ email: req.body.email });
        }
        
        // Check if contributor exists
        if (!contributor) {
            return res.status(404).json({ 
                error: 'Contributor not found. Please check your email or register if you don\'t have an account.',
                success: false
            });
        }
        
        // Fix: check if email exists before using it
        if (!contributor.email) {
            return res.status(400).json({
                error: 'Contributor email is missing',
                success: false
            });
        }
        
        // Check if already verified
        if (contributor.isEmailVerified) {
            return res.status(200).json({ 
                message: 'Email is already verified',
                success: true,
                isVerified: true
            });
        }
        
        // Generate a verification token
        const verificationToken = jwt.sign(
            { contributorId: contributor._id },
            SECRET,
            { expiresIn: '1h' } // Extended to 1 hour to give users more time
        );
        
        // Generate OTP for alternative verification
        const verificationOTP = otpUtils.generateOTP(6);
        const verificationOTPExpires = otpUtils.generateOTPExpiry(60); // 1 hour expiry
        
        // Set expiration for 1 hour from now
        const verificationTokenExpires = new Date();
        verificationTokenExpires.setHours(verificationTokenExpires.getHours() + 1);
        
        // Update the contributor's verification information
        contributor.verificationToken = verificationToken;
        contributor.verificationTokenExpires = verificationTokenExpires;
        contributor.verificationOTP = verificationOTP;
        contributor.verificationOTPExpires = verificationOTPExpires;
        contributor.verificationCode = null;
        contributor.verificationCodeExpires = null;
        contributor.verificationAttempts = (contributor.verificationAttempts || 0) + 1;
        contributor.lastVerificationAttempt = new Date();
        
        await contributor.save();
        
        // Create verification URL
        const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const verificationUrl = `${baseUrl}/contributor/verify?token=${verificationToken}`;
        
        console.log("Sending verification email to:", contributor.email, "with URL:", verificationUrl);
        
        // Send the verification email with link
        const emailResult = await emailService.sendEmail({
            to: contributor.email,
            subject: 'Verify Your Email - UplinkBe',
            text: `
                Hello ${contributor.name},
                
                Please click the link below to verify your email address:
                ${verificationUrl}
                
                Alternatively, if the link doesn't work, you can use this OTP code:
                ${verificationOTP}
                
                The link and OTP are valid for 1 hour.
                
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
                    
                    <p>This link is valid for <strong>1 hour</strong>.</p>
                    <p>If the button doesn't work, you can copy and paste the following link into your browser:</p>
                    <p style="word-break: break-all; background-color: #f8fafc; padding: 10px; border-radius: 4px;">${verificationUrl}</p>
                    
                    <div style="margin: 20px 0; background-color: #f7fafc; border: 1px solid #e2e8f0; border-radius: 5px; padding: 15px; text-align: center;">
                        <p style="margin: 0 0 10px 0;"><strong>Alternatively, you can use this OTP code:</strong></p>
                        <p style="font-size: 24px; letter-spacing: 5px; font-weight: bold; margin: 0;">${verificationOTP}</p>
                        <p style="margin: 10px 0 0 0; font-size: 12px; color: #718096;">This OTP is valid for 1 hour</p>
                    </div>
                    
                    <p>If you didn't request this verification, please ignore this email.</p>
                    
                    <p>Thank you,<br>The UplinkBe Team</p>
                </div>
            `
        });
        
        if (!emailResult) {
            console.error("Failed to send verification email to:", contributor.email);
            return res.status(500).json({ 
                error: 'Failed to send verification email. Email service might not be configured correctly.',
                success: false
            });
        }

        console.log("Verification email sent successfully to:", contributor.email);
        
        res.json({ 
            message: 'Verification link and OTP have been sent to your email address',
            success: true,
            verificationUrl: verificationUrl // Include the URL for debugging and direct access
        });
    } catch (error) {
        console.error('Request verification error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Add OTP verification endpoint
contributorRouter.post('/verify-otp', validate(otpVerificationSchema), async (req, res) => {
    try {
        const { email, otp } = req.body;
        
        const contributor = await Contributor.findOne({ email: email.toLowerCase() });
        
        if (!contributor) {
            return res.status(404).json({ 
                error: 'Contributor not found', 
                success: false 
            });
        }
        
        // Check if email is already verified
        if (contributor.isEmailVerified) {
            return res.status(200).json({ 
                message: 'Email is already verified', 
                success: true, 
                isVerified: true
            });
        }
        
        // Verify the OTP
        if (!contributor.verificationOTP || contributor.verificationOTP !== otp) {
            return res.status(400).json({ 
                error: 'Invalid verification OTP', 
                success: false 
            });
        }
        
        // Check if OTP has expired
        const now = new Date();
        if (!contributor.verificationOTPExpires || now > contributor.verificationOTPExpires) {
            return res.status(400).json({ 
                error: 'Verification OTP has expired. Please request a new one.', 
                success: false 
            });
        }
        
        // Mark the email as verified and clear verification data
        contributor.isEmailVerified = true;
        contributor.verificationToken = null;
        contributor.verificationTokenExpires = null;
        contributor.verificationOTP = null;
        contributor.verificationOTPExpires = null;
        contributor.verificationCode = null;
        contributor.verificationCodeExpires = null;
        
        await contributor.save();
        
        // Generate JWT token with verified status
        const token = jwt.sign({ 
            contributorId: contributor._id, 
            email: contributor.email,
            isVerified: true,
            userType: 'contributor'
        }, SECRET, { expiresIn: '7d' });
        
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
        
        res.json({
            message: 'Email verified successfully using OTP',
            success: true,
            isEmailVerified: true,
            token
        });
    } catch (error) {
        console.error('OTP verification error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Add a new route for verification via link
contributorRouter.get('/verify-email', async (req, res) => {
    try {
        const { email, token } = req.body;
        
        if (!email || !token) {
            return res.status(400).json({ success: false, message: 'Email and token are required' });
        }
        
        // Find contributor by email
        const contributor = await Contributor.findOne({ email: email.toLowerCase() });
        if (!contributor) {
            return res.status(404).json({ success: false, message: 'Contributor not found' });
        }
        
        // Verify token
        if (!contributor.verificationToken || contributor.verificationToken !== token) {
            return res.status(400).json({ success: false, message: 'Invalid verification token' });
        }
        
        // Check if token has expired
        if (contributor.verificationTokenExpires && new Date() > contributor.verificationTokenExpires) {
            return res.status(400).json({ success: false, message: 'Verification token has expired. Please request a new one.' });
        }
        
        // Mark email as verified
        contributor.isEmailVerified = true;
        contributor.verificationToken = null;
        contributor.verificationTokenExpires = null;
        
        await contributor.save();
        
        return res.status(200).json({ success: true, message: 'Email verified successfully' });
    } catch (error) {
        console.error('Error verifying contributor email:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Simplified verification endpoint that works with both token in query or body
contributorRouter.post('/verify', async (req, res) => {
    try {
        // Try to get token from different sources
        const token = req.body.token || req.query.token;
        
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
                isVerified: true
            });
        }
        
        // Mark the email as verified and clear verification data
        contributor.isEmailVerified = true;
        contributor.verificationToken = null;
        contributor.verificationTokenExpires = null;
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
        
        res.json({
            message: 'Email verified successfully',
            success: true,
            isEmailVerified: true
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
        const { email, token, password } = req.body;
        
        if (!email || !token || !password) {
            return res.status(400).json({ success: false, message: 'Email, token, and password are required' });
        }
        
        // Validate password
        if (password.length < 8) {
            return res.status(400).json({ success: false, message: 'Password must be at least 8 characters long' });
        }
        
        // Find contributor by email
        const contributor = await Contributor.findOne({ email: email.toLowerCase() });
        if (!contributor) {
            return res.status(404).json({ success: false, message: 'Contributor not found' });
        }
        
        // Verify token
        if (!contributor.resetToken || contributor.resetToken !== token) {
            return res.status(400).json({ success: false, message: 'Invalid reset token' });
        }
        
        // Check if token has expired
        if (contributor.resetTokenExpires && new Date() > contributor.resetTokenExpires) {
            return res.status(400).json({ success: false, message: 'Reset token has expired. Please request a new one.' });
        }
        
        // Hash the new password
        const bcrypt = require('bcrypt');
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Update password and clear reset token
        contributor.password = hashedPassword;
        contributor.resetToken = null;
        contributor.resetTokenExpires = null;
        
        await contributor.save();
        
        return res.status(200).json({ success: true, message: 'Password reset successfully' });
    } catch (error) {
        console.error('Error resetting contributor password:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// API endpoint to request password reset (with token)
contributorRouter.post('/request-password-reset', async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({ success: false, message: 'Email is required' });
        }
        
        // Find contributor by email
        const contributor = await Contributor.findOne({ email: email.toLowerCase() });
        
        // Don't reveal if email exists or not
        if (!contributor) {
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
        
        // Update contributor with reset token
        contributor.resetToken = resetToken;
        contributor.resetTokenExpires = resetTokenExpires;
        
        await contributor.save();
        
        // Send email with reset link
        await emailService.sendPasswordResetEmail({
            email: contributor.email,
            token: resetToken,
            name: contributor.name,
            userType: 'contributor'
        });
        
        return res.status(200).json({ 
            success: true, 
            message: 'If your email is registered, a password reset link has been sent to your email'
        });
    } catch (error) {
        console.error('Error requesting password reset for contributor:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Direct verification endpoint - can be used for troubleshooting or admin override
contributorRouter.post('/verify-direct', async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }
        
        const contributor = await Contributor.findOne({ email });
        if (!contributor) {
            return res.status(404).json({ error: 'Contributor not found' });
        }
        
        // Check if already verified
        if (contributor.isEmailVerified) {
            return res.status(200).json({ 
                message: 'Email is already verified',
                success: true,
                isVerified: true
            });
        }
        
        // Mark email as verified directly
        contributor.isEmailVerified = true;
        contributor.verificationToken = null;
        contributor.verificationTokenExpires = null;
        contributor.verificationCode = null;
        contributor.verificationCodeExpires = null;
        
        await contributor.save();
        
        res.json({ 
            message: 'Email has been verified directly',
            success: true,
            isVerified: true
        });
    } catch (error) {
        console.error('Direct verification error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get all monitors for the authenticated contributor
contributorRouter.get('/monitors', authenticateContributor, async (req, res) => {
    try {
        const contributorId = req.contributor.contributorId;
        console.log('Fetching monitors for contributor:', contributorId);
        
        // Find all websites this contributor has access to
        const { Website } = require('../Database/module.websites');
        const { Monitor } = require('../Database/module.monitor');
        const { MonitorCheck } = require('../Database/module.monitorCheck');
        
        const websites = await Website.find({ contributors: contributorId });
        console.log('Found contributor websites:', websites.length);
        
        if (websites.length === 0) {
            return res.json({ monitors: [] });
        }
        
        const websiteIds = websites.map(w => w._id);
        
        // Find all monitors for these websites
        const monitors = await Monitor.find({ website: { $in: websiteIds } })
            .populate('website', 'name url')
            .sort({ createdAt: -1 });
            
        console.log('Found monitors:', monitors.length);
        
        if (monitors.length === 0) {
            return res.json({ monitors: [] });
        }
        
        // Get all recent checks for uptime calculation
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        
        const monitorIds = monitors.map(m => m._id);
        const recentChecks = await MonitorCheck.find({
            monitor: { $in: monitorIds },
            timestamp: { $gte: thirtyDaysAgo }
        });
        
        console.log('Found recent checks:', recentChecks.length);
        
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
        console.error('Get contributor monitors error:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

// Get websites for the authenticated contributor
contributorRouter.get('/websites', authenticateContributor, async (req, res) => {
    try {
        const contributorId = req.contributor.contributorId;
        console.log('Fetching websites for contributor:', contributorId);
        
        // Find all websites this contributor has access to
        const websites = await Website.find({ contributors: contributorId })
                                    .sort({ createdAt: -1 });
        
        console.log('Found contributor websites:', websites.length);
        
        if (websites.length === 0) {
            return res.json({ websites: [] });
        }
        
        // Get monitors for websites to calculate health status
        const { Monitor } = require('../Database/module.monitor');
        const { MonitorCheck } = require('../Database/module.monitorCheck');
        
        const websiteIds = websites.map(w => w._id);
        const monitors = await Monitor.find({ website: { $in: websiteIds } });
        
        // Get recent checks for uptime calculation
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        
        const monitorIds = monitors.map(m => m._id);
        const recentChecks = await MonitorCheck.find({
            monitor: { $in: monitorIds },
            timestamp: { $gte: thirtyDaysAgo }
        });
        
        // Process website data with health information
        const websitesWithData = websites.map(website => {
            // Get monitors for this website
            const websiteMonitors = monitors.filter(
                m => m.website.toString() === website._id.toString()
            );
            
            // Calculate uptime and health status
            let healthStatus = 'up';
            let uptime = 100;
            let lastChecked = null;
            
            if (websiteMonitors.length > 0) {
                // Get all checks for the website's monitors
                const monitorIds = websiteMonitors.map(m => m._id);
                const websiteChecks = recentChecks.filter(
                    c => monitorIds.includes(c.monitor.toString())
                );
                
                // Calculate aggregate health metrics
                if (websiteChecks.length > 0) {
                    const totalChecks = websiteChecks.length;
                    const successfulChecks = websiteChecks.filter(c => c.success).length;
                    uptime = (successfulChecks / totalChecks * 100).toFixed(2);
                    
                    // Get last check time
                    const latestCheck = websiteChecks.sort((a, b) => 
                        b.timestamp - a.timestamp
                    )[0];
                    
                    lastChecked = latestCheck.timestamp;
                    
                    // If any recent check has failed, mark as down
                    const recentFails = websiteChecks
                        .sort((a, b) => b.timestamp - a.timestamp)
                        .slice(0, 5)
                        .some(c => !c.success);
                    
                    if (recentFails) {
                        healthStatus = 'down';
                    }
                }
            }
            
            return {
                id: website._id,
                name: website.name,
                url: website.url,
                status: website.status,
                createdAt: website.createdAt,
                healthStatus,
                uptime: parseFloat(uptime),
                lastChecked,
                monitorsCount: websiteMonitors.length
            };
        });
        
        res.json({ websites: websitesWithData });
    } catch (error) {
        console.error('Get contributor websites error:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

// Direct dashboard data endpoint for contributors
contributorRouter.get('/dashboard', authenticateContributor, async (req, res) => {
    try {
        const contributorId = req.contributor.contributorId;
        console.log('Fetching dashboard data for contributor:', contributorId);
        
        // Get basic contributor info
        const contributor = await Contributor.findById(contributorId);
        if (!contributor) {
            return res.status(404).json({ error: 'Contributor not found' });
        }
        
        // Get all websites this contributor has access to
        const { Website } = require('../Database/module.websites');
        const { Monitor } = require('../Database/module.monitor');
        const { MonitorCheck } = require('../Database/module.monitorCheck');
        
        const websites = await Website.find({ contributors: contributorId });
        console.log('Found contributor websites:', websites.length);
        
        // If no websites, return empty dashboard
        if (websites.length === 0) {
            return res.json({ 
                contributor: {
                    name: contributor.name,
                    email: contributor.email
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
        
        const websiteIds = websites.map(w => w._id);
        
        // Find all monitors for these websites
        const monitors = await Monitor.find({ website: { $in: websiteIds } })
            .populate('website', 'name url')
            .sort({ createdAt: -1 });
            
        console.log('Found monitors:', monitors.length);
        
        // Calculate dashboard stats and return data
        const monitorsWithStats = await calculateMonitorStats(monitors);
        
        // Calculate overall stats
        const monitorsUp = monitorsWithStats.filter(m => m.status === 'up').length;
        const monitorsDown = monitorsWithStats.filter(m => m.status === 'down').length;
        const averageUptime = monitorsWithStats.length > 0 
            ? monitorsWithStats.reduce((sum, m) => sum + m.uptime, 0) / monitorsWithStats.length 
            : 0;
        
        res.json({
            contributor: {
                name: contributor.name,
                email: contributor.email,
                expertise: contributor.expertise
            },
            monitors: monitorsWithStats,
            websites: websites.map(w => ({
                id: w._id,
                name: w.name,
                url: w.url
            })),
            stats: {
                totalMonitors: monitorsWithStats.length,
                monitorsUp,
                monitorsDown,
                totalWebsites: websites.length,
                averageUptime
            }
        });
    } catch (error) {
        console.error('Contributor dashboard error:', error);
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

// Sync Clerk contributor with our DB
contributorRouter.post('/clerk-sync', verifyClerkToken, async (req, res) => {
    try {
        const { clerkId } = req.body;
        
        if (!clerkId) {
            return res.status(400).json({ error: 'Clerk ID is required' });
        }
        
        // Check if contributor already exists
        let contributor = await Contributor.findOne({ clerkId });
        
        if (contributor) {
            // Contributor already exists, update if needed
            res.json({
                message: 'Contributor account already linked',
                contributor: {
                    id: contributor._id,
                    name: contributor.name,
                    email: contributor.email,
                    isEmailVerified: contributor.isEmailVerified
                }
            });
        } else {
            // Create new contributor based on Clerk data
            if (!req.contributor) {
                return res.status(400).json({ error: 'Contributor data not found' });
            }
            
            const email = req.contributor.email;
            
            // Check if contributor exists with this email
            contributor = await Contributor.findOne({ email });
            
            if (contributor) {
                // Link existing contributor to Clerk
                contributor.clerkId = clerkId;
                await contributor.save();
                
                res.json({
                    message: 'Existing contributor linked to Clerk account',
                    contributor: {
                        id: contributor._id,
                        name: contributor.name,
                        email: contributor.email,
                        isEmailVerified: contributor.isEmailVerified
                    }
                });
            } else {
                // Create new contributor
                const newContributor = new Contributor({
                    name: req.contributor.name || 'Clerk Contributor',
                    email,
                    clerkId,
                    isEmailVerified: true // Clerk already verifies emails
                });
                
                await newContributor.save();
                
                // Create wallet
                const wallet = new ContributorWallet({
                    contributor: newContributor._id
                });
                
                await wallet.save();
                
                res.status(201).json({
                    message: 'Contributor account created and linked to Clerk',
                    contributor: {
                        id: newContributor._id,
                        name: newContributor.name,
                        email: newContributor.email,
                        isEmailVerified: newContributor.isEmailVerified
                    }
                });
            }
        }
    } catch (error) {
        console.error('Error syncing Clerk contributor:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = { contributorRouter, authenticateContributor };