/**
 * Utility to generate and validate OTP codes
 */

/**
 * Generate a random numeric OTP of specified length
 * @param {number} length - Length of the OTP (default: 6)
 * @returns {string} - Generated OTP
 */
function generateOTP(length = 6) {
  const digits = '0123456789';
  let otp = '';
  
  for (let i = 0; i < length; i++) {
    otp += digits[Math.floor(Math.random() * 10)];
  }
  
  return otp;
}

/**
 * Generate expiration date for OTP
 * @param {number} expiresInMinutes - Minutes until OTP expires (default: 60)
 * @returns {Date} - Expiration date
 */
function generateOTPExpiry(expiresInMinutes = 60) {
  const expiryDate = new Date();
  expiryDate.setMinutes(expiryDate.getMinutes() + expiresInMinutes);
  return expiryDate;
}

/**
 * Check if OTP is expired
 * @param {Date} expiryDate - OTP expiration date
 * @returns {boolean} - True if expired, false otherwise
 */
function isOTPExpired(expiryDate) {
  if (!expiryDate) return true;
  const now = new Date();
  return now > expiryDate;
}

module.exports = {
  generateOTP,
  generateOTPExpiry,
  isOTPExpired
}; 