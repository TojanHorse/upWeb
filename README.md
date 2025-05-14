# UplinkBe - Website Monitoring Platform API

UplinkBe is a decentralized website monitoring platform API that allows users to monitor their websites for uptime and performance. Contributors can provide monitoring services and earn rewards for their contribution.

## Features

- **User Management**: API endpoints for user registration and authentication
- **Contributor System**: API for contributors to provide monitoring services
- **Admin Management**: API to manage users, websites, and monitor statuses
- **Real-time Updates**: WebSocket support for instant notifications
- **Email Alerts**: Email notification system for critical events
- **Clerk Authentication**: Secure authentication with Clerk
- **Terminal Monitoring**: Command-line tool for website monitoring

## Tech Stack

- **Backend**: Node.js, Express, MongoDB
- **Authentication**: Clerk Auth
- **Real-time Updates**: Socket.io
- **Monitoring**: Custom monitoring service

## Installation and Setup

### Prerequisites

- Node.js (v16 or higher)
- MongoDB
- Clerk account (for authentication)

### Environment Variables

Create a `.env` file for the backend using the provided template:

```
# MongoDB Configuration
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/dbname
DB_NAME=Downtimemonitor

# Server Configuration
PORT=3001
NODE_ENV=development

# Clerk Authentication
CLERK_SECRET_KEY=your_clerk_secret_key
CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key

# JWT Configuration
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=7d
JWT_ADMIN_SECRET=your_admin_jwt_secret
JWT_CONTRIBUTOR_SECRET=your_contributor_jwt_secret
JWT_USER_SECRET=your_user_jwt_secret

# Email Configuration
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_USER=your_email@example.com
EMAIL_PASSWORD=your_email_password
EMAIL_FROM=noreply@yourservice.com

# Cors Configuration
ALLOWED_ORIGINS=http://localhost:5173
```

### Installation

1. Clone the repository:

```bash
git clone https://github.com/your-username/UplinkBe.git
cd UplinkBe
```

2. Install dependencies:

```bash
npm install
```

### Running the Application

**Development Mode**:

```bash
npm run dev
```

**Production Mode**:

```bash
npm start
```

### Terminal Monitoring Tool

UplinkBe includes a terminal-based monitoring tool to check website status directly from the command line:

```bash
npm run monitor
```

The terminal monitor supports the following commands:

- `list` - List all monitors
- `check <id>` - Check status of a specific monitor
- `checkall` - Check all monitors
- `add <url> <name>` - Add a new website to monitor
- `history <id>` - View history of a monitor
- `exit` - Exit the program

## API Endpoints

### User Routes

- `POST /api/user/signup` - Register a new user
- `POST /api/user/signin` - User login
- `GET /api/user/profile` - Get user profile
- `PUT /api/user/update` - Update user profile
- `GET /api/user/wallet` - Get user wallet

### Contributor Routes

- `POST /api/contributor/signup` - Register a new contributor
- `POST /api/contributor/signin` - Contributor login
- `GET /api/contributor/websites` - Get websites for a contributor
- `GET /api/contributor/wallet` - Get contributor wallet

### Monitor Routes

- `GET /api/monitor/available` - Get available monitors
- `POST /api/monitor` - Create a new monitor
- `POST /api/monitor/check/:id` - Check a specific monitor
- `GET /api/monitor/history` - Get monitor history

### Admin Routes

- `GET /api/admin/users` - Get all users
- `GET /api/admin/websites` - Get all websites
- `PUT /api/admin/websites/:id/status` - Update website status

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit your changes: `git commit -m 'Add some feature'`
4. Push to the branch: `git push origin feature-name`
5. Open a pull request

## License

This project is licensed under the ISC License. 