const nodemailer = require('nodemailer');

/**
 * Email service for sending notifications and alerts
 */
class EmailService {
  constructor() {
    this.transporter = null;
    this.initialized = false;
    this.initializeTransporter();
  }

  /**
   * Initialize the email transporter with credentials from environment variables
   */
  initializeTransporter() {
    const emailUser = process.env.GMAIL_USER;
    const emailPassword = process.env.GMAIL_PASSWORD;

    if (!emailUser || !emailPassword) {
      console.warn('Email credentials not found. Email functionality limited.');
      this.initialized = false;
      return;
    }

    try {
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: emailUser,
          pass: emailPassword
        }
      });
      this.initialized = true;
      console.log('Email service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize email service:', error);
      this.initialized = false;
    }
  }

  /**
   * Send an email using the configured transporter
   * @param {Object} options - Email options
   * @param {string} options.to - Recipient email address
   * @param {string} options.subject - Email subject
   * @param {string} options.text - Plain text email body
   * @param {string} options.html - HTML email body (optional)
   * @returns {Promise<boolean>} - Success status
   */
  async sendEmail({ to, subject, text, html }) {
    if (!this.initialized) {
      console.warn('Email service not initialized. Cannot send email to:', to);
      return false;
    }

    try {
      console.log(`Attempting to send email to: ${to} with subject: ${subject}`);
      
      const mailOptions = {
        from: process.env.GMAIL_USER,
        to,
        subject,
        text,
        html: html || text
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log(`Email sent successfully to ${to} (Message ID: ${info.messageId})`);
      return true;
    } catch (error) {
      console.error(`Failed to send email to ${to}:`, error.message);
      return false;
    }
  }

  /**
   * Send a verification email with a link to the email verification page
   * @param {Object} options - Verification options
   * @param {string} options.email - Recipient email address
   * @param {string} options.token - Verification token
   * @param {string} options.name - User's name
   * @param {string} options.userType - Type of user (user, contributor, admin)
   * @returns {Promise<boolean>} - Success status
   */
  async sendVerificationEmail({ email, token, name, userType }) {
    const baseUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3000}`;
    const verificationUrl = `${baseUrl}/verify-email?email=${encodeURIComponent(email)}&token=${token}&type=${userType}`;
    
    const subject = `Verify Your Email - UpWeb Monitoring`;
    
    const text = `
      Hello ${name},
      
      Thank you for registering with UpWeb Monitoring as a ${userType}.
      
      Please verify your email address by clicking on the link below:
      ${verificationUrl}
      
      This link will expire in 24 hours.
      
      If you did not create an account, please ignore this email.
      
      Best regards,
      The UpWeb Monitoring Team
    `;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #3182ce;">Verify Your Email Address</h2>
        <p>Hello ${name},</p>
        <p>Thank you for registering with UpWeb Monitoring as a ${userType}.</p>
        <p>Please verify your email address by clicking on the button below:</p>
        
        <div style="margin: 30px 0; text-align: center;">
          <a href="${verificationUrl}" 
             style="background-color: #3182ce; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
            Verify Email Address
          </a>
        </div>
        
        <p>Or copy and paste this link in your browser:</p>
        <p style="word-break: break-all; color: #4a5568;">
          <a href="${verificationUrl}">${verificationUrl}</a>
        </p>
        
        <p>This link will expire in 24 hours.</p>
        <p>If you did not create an account, please ignore this email.</p>
        <p>Best regards,<br>The UpWeb Monitoring Team</p>
      </div>
    `;
    
    return this.sendEmail({ to: email, subject, text, html });
  }

  /**
   * Send a password reset email with a link to the reset password page
   * @param {Object} options - Reset options
   * @param {string} options.email - Recipient email address
   * @param {string} options.token - Reset token
   * @param {string} options.name - User's name
   * @param {string} options.userType - Type of user (user, contributor, admin)
   * @returns {Promise<boolean>} - Success status
   */
  async sendPasswordResetEmail({ email, token, name, userType }) {
    const baseUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3000}`;
    const resetUrl = `${baseUrl}/reset-password?email=${encodeURIComponent(email)}&token=${token}&type=${userType}`;
    
    const subject = `Reset Your Password - UpWeb Monitoring`;
    
    const text = `
      Hello ${name},
      
      We received a request to reset your password for your UpWeb Monitoring account.
      
      Please click on the link below to reset your password:
      ${resetUrl}
      
      This link will expire in 1 hour.
      
      If you did not request a password reset, please ignore this email.
      
      Best regards,
      The UpWeb Monitoring Team
    `;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #3182ce;">Reset Your Password</h2>
        <p>Hello ${name},</p>
        <p>We received a request to reset your password for your UpWeb Monitoring account.</p>
        <p>Please click on the button below to reset your password:</p>
        
        <div style="margin: 30px 0; text-align: center;">
          <a href="${resetUrl}" 
             style="background-color: #3182ce; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
            Reset Password
          </a>
        </div>
        
        <p>Or copy and paste this link in your browser:</p>
        <p style="word-break: break-all; color: #4a5568;">
          <a href="${resetUrl}">${resetUrl}</a>
        </p>
        
        <p>This link will expire in 1 hour.</p>
        <p>If you did not request a password reset, please ignore this email.</p>
        <p>Best regards,<br>The UpWeb Monitoring Team</p>
      </div>
    `;
    
    return this.sendEmail({ to: email, subject, text, html });
  }

  /**
   * Send a monitor alert notification
   * @param {Object} options - Alert options
   * @param {string} options.email - Recipient email address
   * @param {string} options.monitorName - Name of the monitor triggering the alert
   * @param {string} options.websiteName - Name of the website
   * @param {string} options.status - Current status of the monitor
   * @param {string} options.url - URL being monitored
   * @param {string} options.reason - Reason for the alert
   * @param {Object} options.location - Location details where the check was performed
   * @param {boolean} options.isOwner - Whether the recipient is the website owner
   * @returns {Promise<boolean>} - Success status
   */
  async sendMonitorAlert({ email, monitorName, websiteName, status, url, reason, location = {}, isOwner = false }) {
    const statusText = status.toUpperCase();
    const subject = isOwner
      ? `[URGENT] Your Website ${websiteName} is ${statusText}!`
      : `[ALERT] ${websiteName} Monitor Status: ${statusText}`;
    
    const locationInfo = `
      Region: ${location.region || 'Unknown'}
      City: ${location.city || 'Unknown'}
      Country: ${location.country || 'Unknown'}
      ${location.coordinates ? `Coordinates: ${location.coordinates.lat}, ${location.coordinates.lng}` : ''}
      ${location.ip ? `IP Address: ${location.ip}` : ''}
    `;
    
    const text = `
      ${isOwner ? '⚠️ URGENT ALERT' : 'Monitor Alert'} for ${websiteName}
      
      Status: ${statusText}
      Monitor Name: ${monitorName}
      URL: ${url}
      Reason: ${reason}
      
      Check performed from:
      ${locationInfo}
      
      Time: ${new Date().toLocaleString()}
      
      ${isOwner && status === 'down' ? 'Your website appears to be down. Please take immediate action to resolve this issue.' : ''}
      This is an automated message from UplinkBe monitoring service.
    `;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: ${status === 'down' ? '#e53e3e' : '#38a169'};">
          ${isOwner ? '⚠️ URGENT ALERT' : 'Monitor Alert'} for ${websiteName}
        </h2>
        <p style="font-weight: bold; color: ${status === 'down' ? '#e53e3e' : '#38a169'};">
          Status: ${statusText}
        </p>
        <div style="margin: 20px 0; border: 1px solid #e2e8f0; border-radius: 5px; padding: 15px;">
          <p><strong>Monitor Name:</strong> ${monitorName}</p>
          <p><strong>URL:</strong> <a href="${url}" target="_blank">${url}</a></p>
          <p><strong>Reason:</strong> ${reason}</p>
          <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
        </div>
        
        <div style="margin: 20px 0; border: 1px solid #e2e8f0; border-radius: 5px; padding: 15px; background-color: #f8fafc;">
          <h3 style="margin-top: 0;">Check performed from:</h3>
          <p><strong>Region:</strong> ${location.region || 'Unknown'}</p>
          <p><strong>City:</strong> ${location.city || 'Unknown'}</p>
          <p><strong>Country:</strong> ${location.country || 'Unknown'}</p>
          ${location.coordinates ? `<p><strong>Coordinates:</strong> ${location.coordinates.lat}, ${location.coordinates.lng}</p>` : ''}
          ${location.ip ? `<p><strong>IP Address:</strong> ${location.ip}</p>` : ''}
        </div>
        
        ${isOwner && status === 'down' ? `
        <div style="margin: 20px 0; border: 1px solid #e53e3e; border-radius: 5px; padding: 15px; background-color: #fff5f5;">
          <p style="color: #e53e3e; font-weight: bold;">Your website appears to be down. Please take immediate action to resolve this issue.</p>
        </div>
        ` : ''}
        
        <p style="color: #718096; font-size: 12px;">
          This is an automated message from UplinkBe monitoring service.
        </p>
      </div>
    `;
    
    return this.sendEmail({ to: email, subject, text, html });
  }

  /**
   * Send a welcome email to new users
   * @param {Object} options - Welcome email options
   * @param {string} options.email - Recipient email address
   * @param {string} options.name - User's name
   * @param {string} options.userType - Type of user (user, contributor, admin)
   * @returns {Promise<boolean>} - Success status
   */
  async sendWelcomeEmail({ email, name, userType }) {
    const subject = `Welcome to UplinkBe - Your Account is Ready`;
    
    const text = `
      Welcome to UplinkBe, ${name}!
      
      Your ${userType} account has been successfully created. You can now log in and start using our platform.
      
      Thank you for joining our service.
      
      The UplinkBe Team
    `;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #3182ce;">Welcome to UplinkBe, ${name}!</h2>
        <p>
          Your ${userType} account has been successfully created. You can now log in and start using our platform.
        </p>
        <div style="margin: 20px 0; text-align: center;">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/login" 
             style="background-color: #3182ce; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
            Go to Dashboard
          </a>
        </div>
        <p>Thank you for joining our service.</p>
        <p><strong>The UplinkBe Team</strong></p>
      </div>
    `;
    
    return this.sendEmail({ to: email, subject, text, html });
  }
}

// Create and export a singleton instance
const emailService = new EmailService();

module.exports = emailService; 