require('dotenv').config();
const emailService = require('./utils/emailService');

async function testEmail() {
  console.log('Testing email service...');
  console.log('Email credentials:');
  console.log('GMAIL_USER:', process.env.GMAIL_USER ? '✓ Set' : '✗ Missing');
  console.log('GMAIL_PASSWORD:', process.env.GMAIL_PASSWORD ? '✓ Set' : '✗ Missing');
  
  try {
    const result = await emailService.sendEmail({
      to: 'myashmengwal@gmail.com', // Replace with your email for testing
      subject: 'Test Email from UplinkBe',
      text: 'This is a test email to verify that the email service is working correctly.',
      html: '<div><h1>Test Email</h1><p>This is a test email to verify that the email service is working correctly.</p></div>'
    });
    
    if (result) {
      console.log('✓ Email sent successfully');
    } else {
      console.log('✗ Failed to send email - email service reported failure');
    }
  } catch (error) {
    console.error('✗ Error sending email:', error);
  }
}

testEmail(); 