/**
 * Email Configuration Test Script
 * 
 * Run this script to test your email configuration with:
 * node utils/setup-email.js
 */

require('dotenv').config();
const nodemailer = require('nodemailer');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Check if email credentials are set in .env
const emailUser = process.env.GMAIL_USER;
const emailPassword = process.env.GMAIL_PASSWORD;

console.log('===== UplinkBe Email Configuration Test =====\n');

if (!emailUser || !emailPassword) {
  console.log('Email credentials not found in .env file.');
  console.log('Please add the following to your .env file:');
  console.log(`
GMAIL_USER=your-email@gmail.com
GMAIL_PASSWORD=your-app-password
  `);
  console.log('For GMAIL_PASSWORD, use an App Password from Google Account Security settings.');
  
  rl.question('Would you like to enter email credentials now for testing? (y/n): ', async (answer) => {
    if (answer.toLowerCase() === 'y') {
      await promptEmailCredentials();
    } else {
      console.log('\nExiting. Please update your .env file manually.');
      rl.close();
    }
  });
} else {
  console.log('Email credentials found in .env file!');
  testEmailConfiguration(emailUser, emailPassword);
}

async function promptEmailCredentials() {
  rl.question('Enter Gmail address: ', (email) => {
    rl.question('Enter Gmail app password: ', (password) => {
      console.log('\nTesting with provided credentials...');
      testEmailConfiguration(email, password);
    });
  });
}

async function testEmailConfiguration(email, password) {
  try {
    console.log('Creating test transporter...');
    
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: email,
        pass: password
      }
    });
    
    console.log('Verifying connection to email server...');
    await transporter.verify();
    console.log('✅ Connection successful!\n');
    
    rl.question('Would you like to send a test email? (y/n): ', async (answer) => {
      if (answer.toLowerCase() === 'y') {
        rl.question('Enter recipient email address: ', async (recipient) => {
          try {
            console.log(`Sending test email to ${recipient}...`);
            
            const info = await transporter.sendMail({
              from: email,
              to: recipient,
              subject: 'UplinkBe Email Test',
              text: 'This is a test email from your UplinkBe application.',
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #3182ce;">UplinkBe Email Test</h2>
                  <p>This is a test email from your UplinkBe application.</p>
                  <p>Your email configuration is working correctly!</p>
                  <p>Time: ${new Date().toLocaleString()}</p>
                </div>
              `
            });
            
            console.log('✅ Test email sent successfully!');
            console.log(`Message ID: ${info.messageId}`);
            console.log('\nYour email configuration is working correctly.');
            
            if (email !== process.env.GMAIL_USER || password !== process.env.GMAIL_PASSWORD) {
              console.log('\nTo save these credentials, add the following to your .env file:');
              console.log(`
GMAIL_USER=${email}
GMAIL_PASSWORD=${password}
              `);
            }
            
            rl.close();
          } catch (error) {
            console.error('❌ Failed to send test email:', error.message);
            console.log('\nPlease verify your email and password are correct.');
            rl.close();
          }
        });
      } else {
        console.log('\nSkipping test email. Your connection is verified.');
        
        if (email !== process.env.GMAIL_USER || password !== process.env.GMAIL_PASSWORD) {
          console.log('\nTo save these credentials, add the following to your .env file:');
          console.log(`
GMAIL_USER=${email}
GMAIL_PASSWORD=${password}
          `);
        }
        
        rl.close();
      }
    });
  } catch (error) {
    console.error('❌ Email configuration test failed:', error.message);
    console.log('\nPossible issues:');
    console.log('1. Your Gmail credentials are incorrect');
    console.log('2. Less secure app access is not enabled');
    console.log('3. You need to use an App Password if 2FA is enabled');
    console.log('\nPlease check your credentials and try again.');
    rl.close();
  }
}

rl.on('close', () => {
  console.log('\n===== Email Test Completed =====');
  process.exit(0);
}); 