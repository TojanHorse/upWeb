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
   * Cleanup expired verification codes
   * @returns {Promise<number>} Number of cleaned up codes
   */
  static async cleanupExpiredCodes() {
    try {
      const result = await User.updateMany(
        { verificationCodeExpires: { $lt: new Date() } },
        { 
          $set: { 
            verificationCode: null,
            verificationCodeExpires: null
          }
        }
      );
      
      console.log(`Cleaned up ${result.modifiedCount} expired verification codes`);
      return result.modifiedCount;
    } catch (error) {
      console.error('Error cleaning up expired codes:', error);
      return 0;
    }
  }

  /**
   * Request an email verification code for a user
   * @param {string} userId - The user's ID
   * @returns {Promise<Object>} Result of the request
   */
  static async requestVerification(userId) {
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
        return { success: false, message: 'Email is already verified' };
      }
      
      // Check if they've reached the daily limit
      if (this.hasReachedDailyLimit(user)) {
        return { 
          success: false, 
          message: 'You have reached the maximum verification attempts for today. Please try again tomorrow.'
        };
      }
      
      // Generate a verification code
      const verificationCode = this.generateVerificationCode();
      
      // Set expiration for 10 minutes from now (changed from 15)
      const verificationCodeExpires = new Date();
      verificationCodeExpires.setMinutes(verificationCodeExpires.getMinutes() + 10);
      
      // Update the user's verification information
      user.verificationCode = verificationCode;
      user.verificationCodeExpires = verificationCodeExpires;
      user.verificationAttempts += 1;
      user.lastVerificationAttempt = new Date();
      
      await user.save();
      
      // Send the verification email
      const emailResult = await this.sendVerificationEmail(user.email, user.name, verificationCode);
      
      if (!emailResult) {
        return { 
          success: false, 
          message: 'Failed to send verification email. Email service might not be configured correctly.'
        };
      }
      
      return { 
        success: true, 
        message: 'Verification code has been sent to your email address'
      };
    } catch (error) {
      console.error('Error requesting verification:', error);
      return { success: false, message: 'Internal server error' };
    }
  }

  /**
   * Verify a user's email with the provided code
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
        return { success: false, message: 'Email is already verified' };
      }
      
      // Check if the verification code exists and hasn't expired
      if (!user.verificationCode || !user.verificationCodeExpires) {
        return { success: false, message: 'No verification code found or code expired. Please request a new code.' };
      }
      
      // Check if code has expired
      if (new Date() > user.verificationCodeExpires) {
        return { success: false, message: 'Verification code has expired. Please request a new code.' };
      }
      
      // Check if the code matches
      if (user.verificationCode !== code) {
        return { success: false, message: 'Invalid verification code' };
      }
      
      // Mark the email as verified and clear verification data
      user.isEmailVerified = true;
      user.verificationCode = null;
      user.verificationCodeExpires = null;
      
      await user.save();
      
      // Send a confirmation email
      await this.sendVerificationSuccessEmail(user.email, user.name);
      
      return { success: true, message: 'Email verified successfully' };
    } catch (error) {
      console.error('Error verifying email:', error);
      return { success: false, message: 'Internal server error' };
    }
  }

  /**
   * Send a verification email
   * @param {string} email - The recipient's email
   * @param {string} name - The recipient's name
   * @param {string} code - The verification code
   * @returns {Promise<boolean>} Whether the email was sent successfully
   */
  static async sendVerificationEmail(email, name, code) {
    try {
      const subject = 'Verify Your Email - UplinkBe';
      
      const text = `
        Hello ${name},
        
        Your email verification code is: ${code}
        
        This code is valid for 10 minutes.
        
        If you didn't request this code, please ignore this email.
        
        Thank you,
        The UplinkBe Team
      `;
      
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #3182ce;">Verify Your Email Address</h2>
          <p>Hello ${name},</p>
          <p>Please use the following code to verify your email address:</p>
          
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
      console.error('Error sending verification email:', error);
      return false;
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

  /**
   * Request a password reset code for a user
   * @param {string} email - The user's email
   * @returns {Promise<Object>} Result of the request
   */
  static async requestPasswordReset(email) {
    try {
      // Cleanup expired codes first
      await this.cleanupExpiredCodes();

      // Find user by email
      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) {
        // Don't reveal if email exists for security reasons
        return { success: true, message: 'If your email is registered, a password reset code has been sent to your email' };
      }

      // Generate a verification code
      const resetCode = this.generateVerificationCode();
      
      // Set expiration for 10 minutes from now
      const resetCodeExpires = new Date();
      resetCodeExpires.setMinutes(resetCodeExpires.getMinutes() + 10);
      
      // Update the user's reset information
      user.resetCode = resetCode;
      user.resetCodeExpires = resetCodeExpires;
      
      await user.save();
      
      // Send the reset email
      const emailResult = await this.sendPasswordResetEmail(user.email, user.name, resetCode);
      
      if (!emailResult) {
        return { 
          success: false, 
          message: 'Failed to send password reset email. Email service might not be configured correctly.'
        };
      }
      
      return { 
        success: true, 
        message: 'If your email is registered, a password reset code has been sent to your email'
      };
    } catch (error) {
      console.error('Error requesting password reset:', error);
      return { success: false, message: 'Internal server error' };
    }
  }

  /**
   * Reset a user's password with the provided code
   * @param {string} email - The user's email
   * @param {string} code - The reset code
   * @returns {Promise<Object>} Result of the reset operation
   */
  static async resetPassword(email, code) {
    try {
      // Cleanup expired codes first
      await this.cleanupExpiredCodes();
      
      // Find the user
      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) {
        return { success: false, message: 'Invalid or expired reset code' };
      }
      
      // Check if the reset code exists and hasn't expired
      if (!user.resetCode || !user.resetCodeExpires) {
        return { success: false, message: 'No reset code found or code expired. Please request a new code.' };
      }
      
      // Check if code has expired
      if (new Date() > user.resetCodeExpires) {
        return { success: false, message: 'Reset code has expired. Please request a new code.' };
      }
      
      // Check if the code matches
      if (user.resetCode !== code) {
        return { success: false, message: 'Invalid reset code' };
      }
      
      // Generate a new random password
      const newPassword = this.generateRandomPassword();
      
      // Hash the new password
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      
      // Update user's password
      user.password = hashedPassword;
      
      // Clear reset data
      user.resetCode = null;
      user.resetCodeExpires = null;
      
      await user.save();
      
      // Send the new password in email
      await this.sendPasswordRecoveryEmail(user.email, user.name, newPassword);
      
      return { 
        success: true, 
        message: 'A new password has been sent to your email address'
      };
    } catch (error) {
      console.error('Error resetting password:', error);
      return { success: false, message: 'Internal server error' };
    }
  }

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

  /**
   * Send a password reset email
   * @param {string} email - The recipient's email
   * @param {string} name - The recipient's name
   * @param {string} code - The reset code
   * @returns {Promise<boolean>} Whether the email was sent successfully
   */
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

  /**
   * Send a password recovery email with the password
   * @param {string} email - The recipient's email
   * @param {string} name - The recipient's name
   * @param {string} password - The user's new plain text password
   * @returns {Promise<boolean>} Whether the email was sent successfully
   */
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
}

module.exports = VerificationService; 