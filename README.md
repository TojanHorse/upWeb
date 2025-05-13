# UplinkBe - Decentralized Website Monitoring API

This is the backend API for the Uplink platform, a decentralized system for website monitoring where users can earn money by performing checks and contributors can pay to have their websites monitored.

## Features

- User authentication and management
- Admin dashboard and management
- Contributor website management
- Website monitoring (HTTP, HTTPS, DNS, SSL, TCP, Ping)
- Decentralized monitoring system (users perform checks and get paid)
- Subscription plans for contributors
- RazorPay integration for payments
- Wallet system for users and contributors
- Incident tracking and reporting
- Location-aware monitoring with detailed geolocation data
- Enhanced email notifications with precise failure location information
- Email verification system with rate limiting

## Tech Stack

- Node.js with Express
- MongoDB with Mongoose
- JWT for authentication
- bcrypt for password hashing
- Axios for HTTP requests
- RazorPay for payment processing

## Setup

1. Clone the repository:
```
git clone <repository-url>
cd UplinkBe
```

2. Install dependencies:
```
npm install
```

3. Create a `.env` file in the root directory:
```
# Server configuration
PORT=3000

# MongoDB connection
MONGODB_URI=mongodb://localhost:27017/uplinkdb

# JWT Secrets
USER_JWT_SECRET=user_jwt_secret_dev_only
ADMIN_JWT_SECRET=admin_jwt_secret_dev_only
CONTRIBUTOR_JWT_SECRET=contributor_jwt_secret_dev_only

# RazorPay Integration (optional - leave empty for demo mode)
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=

# Email Configuration (Gmail)
GMAIL_USER=your-email@gmail.com
GMAIL_PASSWORD=your-app-password

# Monitoring Settings
PAYMENT_PER_CHECK=5 # Amount in cents paid to users per check
```

4. Start the development server:
```
npm run dev
```

## Email Notifications

The system includes email notifications for:

- Welcome emails to new users and contributors
- Monitor status alerts (when a monitor goes down or comes back up)
- Enhanced alerts for website owners with detailed location information about failures
- Email verification codes for new users

### Email Verification

The system includes a complete email verification flow:

- New users automatically receive a verification code on signup
- Users can request up to 5 verification codes per day
- Verification codes expire after 15 minutes
- Unverified users can continue using the platform with limited access
- Status tracking for verification attempts and success

### Email Configuration

To enable email functionality, you need to set up Gmail credentials in your `.env` file:

1. Use a Gmail account for sending emails
2. Set `GMAIL_USER` to your Gmail address
3. For `GMAIL_PASSWORD`, use an "App Password" (not your regular password)
   - Go to your Google Account > Security
   - Enable 2-Step Verification if not already enabled
   - Go to App Passwords, select "Mail" and "Other", name it "UplinkBe"
   - Use the generated 16-character password

If these values are not set, the system will still work but email notifications will be disabled.

## Location-Aware Monitoring

The system collects and uses detailed location information from users who perform monitoring checks:

- Automatically identifies user's location (city, region, country) via browser geolocation API
- Captures precise coordinates for pinpointing where issues occur
- Uses IP-based geolocation as fallback when browser geolocation is unavailable
- Includes location details in email alerts to website owners
- Provides website owners with insights about where their services might be experiencing issues

### Location Data Privacy

Users' location data is:

- Only collected when explicitly performing a monitor check
- Used solely for monitoring purposes and alert notifications
- Shared only with website owners during downtime incidents
- Never used for advertising or tracking
- Stored securely and in compliance with privacy regulations

## API Endpoints

### User Routes

- `POST /user/signup` - Create a new user account
- `POST /user/signin` - Sign in to user account
- `PUT /user/update` - Update user profile
- `GET /user/profile` - Get user profile and wallet information

### Admin Routes

- `POST /admin/signup` - Create a new admin account
- `POST /admin/signin` - Sign in to admin account
- `PUT /admin/update` - Update admin profile
- `GET /admin/websites` - Get all websites
- `PUT /admin/websites/:id/status` - Update website status

### Contributor Routes

- `POST /contributor/signup` - Create a new contributor account
- `POST /contributor/signin` - Sign in to contributor account
- `PUT /contributor/update` - Update contributor profile
- `GET /contributor/profile` - Get contributor profile, wallet, and assigned websites

### Monitor Routes

#### For Users
- `GET /monitor/available` - Get available monitors to check
- `POST /monitor/check/:id` - Perform a check on a monitor
- `GET /monitor/history` - Get user's check history

#### For Contributors
- `POST /monitor` - Create a new monitor
- `GET /monitor/contributor` - Get all monitors for the contributor
- `PUT /monitor/:id` - Update a monitor
- `DELETE /monitor/:id` - Delete a monitor
- `POST /monitor/subscription` - Create a new subscription
- `GET /monitor/subscription` - Get all subscriptions
- `PUT /monitor/subscription/:id/cancel` - Cancel a subscription
- `POST /monitor/subscription/verify-payment` - Verify payment for subscription

#### For Admins
- `GET /monitor/admin` - Get all monitors
- `GET /monitor/admin/incidents` - Get all incidents
- `GET /monitor/admin/subscriptions` - Get all subscriptions

## Subscription Plans

The platform offers three subscription plans for contributors:

1. **Basic Plan** - $80/month
   - 5 monitors
   - 5-minute check interval

2. **Standard Plan** - $150/month
   - 10 monitors
   - 3-minute check interval

3. **Premium Plan** - $300/month
   - 20 monitors
   - 1-minute check interval

## How It Works

1. **Contributors** sign up and add their websites.
2. They create a subscription to monitor their websites.
3. **Users** sign up and perform monitoring checks on available websites.
4. Users get paid a small amount (default: 5 cents) per successful check.
5. When a check fails, an incident is created and can be tracked.
6. **Admins** can monitor all activities, users, and websites.

## Development

- Run in development mode: `npm run dev`
- Run in production mode: `npm start` 