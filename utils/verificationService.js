const crypto = require('crypto');
const emailService = require('./emailService');
const { User } = require('../Database/module.user');

class VerificationService {
  /**
   * Generate a random 6-digit verification code
   * @returns {string} The verification code
   */
  static generateVerificationCode() {
    // Generate a 6-digit random number
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Generate a secure token for email verification or password reset
   * @returns {string} The generated token
   */
  static generateToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Check if a user has exceeded daily verification attempts
   * @param {Object} user - The user object
   * @returns {boolean} Whether the user has reached the limit
   */
  static hasReachedDailyLimit(user) {
    const MAX_DAILY_ATTEMPTS = 5;
    
    // If no previous attempts or last attempt was on a different day, reset counter
    if (!user.lastVerificationAttempt) {
      return false;
    }
    
    const lastAttemptDate = new Date(user.lastVerificationAttempt);
    const today = new Date();
    
    // If last attempt was on a different day, they haven't reached the limit
    if (lastAttemptDate.getDate() !== today.getDate() || 
        lastAttemptDate.getMonth() !== today.getMonth() || 
        lastAttemptDate.getFullYear() !== today.getFullYear()) {
      return false;
    }
    
    // Check if they've reached the daily limit
    return user.verificationAttempts >= MAX_DAILY_ATTEMPTS;
  }

  /**
   * Cleanup expired verification codes and tokens
   * @returns {Promise<number>} Number of cleaned up codes
   */
  static async cleanupExpiredCodes() {
    try {
      const result = await User.updateMany(
        { 
          $or: [
            { verificationCodeExpires: { $lt: new Date() } },
            { verificationTokenExpires: { $lt: new Date() } },
            { resetTokenExpires: { $lt: new Date() } }
          ]
        },
        { 
          $set: { 
            verificationCode: null,
            verificationCodeExpires: null,
            verificationToken: null,
            verificationTokenExpires: null,
            resetToken: null,
            resetTokenExpires: null
          }
        }
      );
      
      console.log(`Cleaned up ${result.modifiedCount} expired verification codes and tokens`);
      return result.modifiedCount;
    } catch (error) {
      console.error('Error cleaning up expired codes and tokens:', error);
      return 0;
    }
  }

  /**
   * Request an email verification for a user with a clickable link
   * @param {string} userId - The user's ID
   * @returns {Promise<Object>} Result of the request
   */
  static async requestVerification(userId) {
    try {
      // Import OTP utilities
      const otpUtils = require('./otpGenerator');
      
      // Cleanup expired codes first
      await this.cleanupExpiredCodes();
      
      // Find the user
      const user = await User.findById(userId);
      if (!user) {
        return { success: false, message: 'User not found' };
      }
      
      // Check if email is already verified
      if (user.isEmailVerified) {
        return { success: false, message: 'Email is already verified' };
      }
      
      // Check if they've reached the daily limit
      if (this.hasReachedDailyLimit(user)) {
        return { 
          success: false, 
          message: 'You have reached the maximum verification attempts for today. Please try again tomorrow.'
        };
      }
      
      // Generate a verification token
      const verificationToken = this.generateToken();
      
      // Generate OTP for alternative verification
      const verificationOTP = otpUtils.generateOTP(6);
      const otpExpiry = otpUtils.generateOTPExpiry(60); // 1 hour expiry
      
      console.log(`Generated OTP for user ${user.email}: ${verificationOTP}`);
      
      // Set expiration for 24 hours from now
      const verificationTokenExpires = new Date();
      verificationTokenExpires.setHours(verificationTokenExpires.getHours() + 24);
      
      // Update the user's verification information
      user.verificationToken = verificationToken;
      user.verificationTokenExpires = verificationTokenExpires;
      user.verificationOTP = verificationOTP;
      user.verificationOTPExpires = otpExpiry;
      user.verificationAttempts += 1;
      user.lastVerificationAttempt = new Date();
      
      await user.save();
      
      // Send the verification email with link
      const emailResult = await emailService.sendVerificationEmail({
        email: user.email,
        token: verificationToken,
        otp: verificationOTP,  // Include OTP in the email
        name: user.name,
        userType: 'user'
      });
      
      if (!emailResult) {
        return { 
          success: false, 
          message: 'Failed to send verification email. Email service might not be configured correctly.'
        };
      }
      
      return { 
        success: true, 
        message: 'Verification email has been sent to your email address. Please check your inbox.'
      };
    } catch (error) {
      console.error('Error requesting verification:', error);
      return { success: false, message: 'Internal server error' };
    }
  }

  /**
   * Verify a user's email with the provided token
   * @param {string} email - The user's email
   * @param {string} token - The verification token
   * @returns {Promise<Object>} Result of the verification
   */
  static async verifyEmailWithToken(email, token) {
    try {
      // Cleanup expired tokens first
      await this.cleanupExpiredCodes();
      
      // Find the user
      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) {
        return { success: false, message: 'User not found' };
      }
      
      // Check if email is already verified
      if (user.isEmailVerified) {
        return { success: true, message: 'Email is already verified' };
      }
      
      // Check if the verification token exists and hasn't expired
      if (!user.verificationToken || !user.verificationTokenExpires) {
        return { success: false, message: 'Invalid or expired verification link. Please request a new verification email.' };
      }
      
      // Check if token has expired
      if (new Date() > user.verificationTokenExpires) {
        return { success: false, message: 'Verification link has expired. Please request a new verification email.' };
      }
      
      // Check if the token matches
      if (user.verificationToken !== token) {
        return { success: false, message: 'Invalid verification link' };
      }
      
      // Mark the email as verified and clear verification data
      user.isEmailVerified = true;
      user.verificationToken = null;
      user.verificationTokenExpires = null;
      user.verificationCode = null;
      user.verificationCodeExpires = null;
      
      await user.save();
      
      // Send a confirmation email
      await this.sendVerificationSuccessEmail(user.email, user.name);
      
      return { success: true, message: 'Email verified successfully' };
    } catch (error) {
      console.error('Error verifying email with token:', error);
      return { success: false, message: 'Internal server error' };
    }
  }

  /**
   * Request a password reset for a user
   * @param {string} email - The user's email
   * @returns {Promise<Object>} Result of the request
   */
  static async requestPasswordReset(email) {
    try {
      // Cleanup expired tokens first
      await this.cleanupExpiredCodes();

      // Find user by email
      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) {
        // Don't reveal if email exists for security reasons
        return { success: true, message: 'If your email is registered, a password reset link has been sent to your email' };
      }

      // Generate a reset token
      const resetToken = this.generateToken();
      
      // Set expiration for 1 hour from now
      const resetTokenExpires = new Date();
      resetTokenExpires.setHours(resetTokenExpires.getHours() + 1);
      
      // Update the user's reset information
      user.resetToken = resetToken;
      user.resetTokenExpires = resetTokenExpires;
      
      await user.save();
      
      // Send the reset email with link
      const emailResult = await emailService.sendPasswordResetEmail({
        email: user.email,
        token: resetToken,
        name: user.name,
        userType: 'user'
      });
      
      if (!emailResult) {
        return { 
          success: false, 
          message: 'Failed to send password reset email. Email service might not be configured correctly.'
        };
      }
      
      return { 
        success: true, 
        message: 'If your email is registered, a password reset link has been sent to your email'
      };
    } catch (error) {
      console.error('Error requesting password reset:', error);
      return { success: false, message: 'Internal server error' };
    }
  }

  /**
   * Reset a user's password with the provided token
   * @param {string} email - The user's email
   * @param {string} token - The reset token
   * @param {string} newPassword - The new password
   * @returns {Promise<Object>} Result of the reset operation
   */
  static async resetPasswordWithToken(email, token, newPassword) {
    try {
      // Cleanup expired tokens first
      await this.cleanupExpiredCodes();
      
      // Find the user
      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) {
        return { success: false, message: 'Invalid or expired reset link' };
      }
      
      // Check if the reset token exists and hasn't expired
      if (!user.resetToken || !user.resetTokenExpires) {
        return { success: false, message: 'Invalid or expired reset link. Please request a new password reset.' };
      }
      
      // Check if token has expired
      if (new Date() > user.resetTokenExpires) {
        return { success: false, message: 'Password reset link has expired. Please request a new password reset.' };
      }
      
      // Check if the token matches
      if (user.resetToken !== token) {
        return { success: false, message: 'Invalid password reset link' };
      }
      
      // Hash the new password
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      
      // Update user's password
      user.password = hashedPassword;
      
      // Clear reset data
      user.resetToken = null;
      user.resetTokenExpires = null;
      
      await user.save();
      
      return { 
        success: true, 
        message: 'Your password has been successfully reset. You can now log in with your new password.'
      };
    } catch (error) {
      console.error('Error resetting password with token:', error);
      return { success: false, message: 'Internal server error' };
    }
  }

  /**
   * Send a verification success email
   * @param {string} email - The recipient's email
   * @param {string} name - The recipient's name
   * @returns {Promise<boolean>} Whether the email was sent successfully
   */
  static async sendVerificationSuccessEmail(email, name) {
    try {
      const subject = 'Email Verification Successful - UplinkBe';
      
      const text = `
        Hello ${name},
        
        Your email has been successfully verified!
        
        You now have full access to all features of the UplinkBe platform.
        
        Thank you,
        The UplinkBe Team
      `;
      
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #38a169;">Email Verification Successful</h2>
          <p>Hello ${name},</p>
          <p>Your email has been successfully verified!</p>
          
          <div style="margin: 20px 0; text-align: center;">
            <div style="background-color: #f0fff4; padding: 15px; border-radius: 5px; border: 1px solid #c6f6d5;">
              <p style="color: #38a169; font-size: 18px; margin: 0;">✓ Verification Complete</p>
              <p style="margin: 5px 0 0 0;">You now have full access to all features of the UplinkBe platform.</p>
            </div>
          </div>
          
          <p>Thank you,<br>The UplinkBe Team</p>
        </div>
      `;
      
      return await emailService.sendEmail({ to: email, subject, text, html });
    } catch (error) {
      console.error('Error sending verification success email:', error);
      return false;
    }
  }

  // Helper methods

  /**
   * Generate a random password
   * @returns {string} A random password
   */
  static generateRandomPassword() {
    // Generate a random password with 10 characters
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 10; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  // Kept for backward compatibility
  static async sendPasswordResetEmail(email, name, code) {
    try {
      const subject = 'Password Reset Request - UplinkBe';
      
      const text = `
        Hello ${name},
        
        Your password reset code is: ${code}
        
        This code is valid for 10 minutes.
        
        If you didn't request this code, please ignore this email.
        
        Thank you,
        The UplinkBe Team
      `;
      
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #3182ce;">Password Reset Request</h2>
          <p>Hello ${name},</p>
          <p>Please use the following code to reset your password:</p>
          
          <div style="margin: 20px 0; text-align: center;">
            <div style="background-color: #f8fafc; padding: 15px; border-radius: 5px; font-size: 24px; letter-spacing: 5px; font-weight: bold;">
              ${code}
            </div>
          </div>
          
          <p>This code is valid for <strong>10 minutes</strong>.</p>
          <p>If you didn't request this code, please ignore this email.</p>
          
          <p>Thank you,<br>The UplinkBe Team</p>
        </div>
      `;
      
      return await emailService.sendEmail({ to: email, subject, text, html });
    } catch (error) {
      console.error('Error sending password reset email:', error);
      return false;
    }
  }

  // Kept for backward compatibility
  static async sendPasswordRecoveryEmail(email, name, password) {
    try {
      const subject = 'Your Password Recovery - UplinkBe';
      
      const text = `
        Hello ${name},
        
        As requested, here is your new temporary password: ${password}
        
        Please log in as soon as possible and change your password.
        
        For security reasons, we recommend changing your password immediately after logging in.
        
        Thank you,
        The UplinkBe Team
      `;
      
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #3182ce;">Your Password Recovery</h2>
          <p>Hello ${name},</p>
          <p>As requested, here is your new temporary password:</p>
          
          <div style="margin: 20px 0; text-align: center;">
            <div style="background-color: #f8fafc; padding: 15px; border-radius: 5px; font-size: 16px; font-family: monospace; word-break: break-all;">
              ${password}
            </div>
          </div>
          
          <p style="color: #e53e3e; font-weight: bold;">Please log in as soon as possible and change your password.</p>
          <p>For security reasons, we recommend changing your password immediately after logging in.</p>
          
          <p>Thank you,<br>The UplinkBe Team</p>
        </div>
      `;
      
      return await emailService.sendEmail({ to: email, subject, text, html });
    } catch (error) {
      console.error('Error sending password recovery email:', error);
      return false;
    }
  }

  /**
   * Verify a user's email with the provided OTP code
   * @param {string} userId - The user's ID
   * @param {string} code - The verification code
   * @returns {Promise<Object>} Result of the verification
   */
  static async verifyEmail(userId, code) {
    try {
      // Cleanup expired codes first
      await this.cleanupExpiredCodes();
      
      // Find the user
      const user = await User.findById(userId);
      if (!user) {
        return { success: false, message: 'User not found' };
      }
      
      // Check if email is already verified
      if (user.isEmailVerified) {
        return { success: true, message: 'Email is already verified', isVerified: true };
      }
      
      // Check if the verification OTP exists and hasn't expired
      if (!user.verificationOTP || !user.verificationOTPExpires) {
        return { 
          success: false, 
          message: 'Invalid or expired verification code. Please request a new one.', 
          isVerified: false 
        };
      }
      
      // Check if OTP has expired
      if (new Date() > user.verificationOTPExpires) {
        return { 
          success: false, 
          message: 'Verification code has expired. Please request a new one.', 
          isVerified: false 
        };
      }
      
      // Check if the code matches
      if (user.verificationOTP !== code) {
        return { 
          success: false, 
          message: 'Invalid verification code', 
          isVerified: false 
        };
      }
      
      // Mark email as verified
      user.isEmailVerified = true;
      user.verificationToken = null;
      user.verificationTokenExpires = null;
      user.verificationOTP = null;
      user.verificationOTPExpires = null;
      
      await user.save();
      
      // Send success email
      try {
        await this.sendVerificationSuccessEmail(user.email, user.name);
      } catch (emailError) {
        console.error('Failed to send verification success email:', emailError);
        // Continue even if email fails
      }
      
      return { 
        success: true, 
        message: 'Email verified successfully', 
        isVerified: true 
      };
    } catch (error) {
      console.error('Error verifying email:', error);
      return { 
        success: false, 
        message: 'Internal server error', 
        isVerified: false 
      };
    }
  }
}

module.exports = VerificationService; 