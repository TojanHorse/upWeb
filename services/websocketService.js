/**
 * WebSocket Service - Handles real-time communication for website monitoring
 * 
 * This service provides:
 * - WebSocket connection management
 * - Message validation
 * - Authentication
 * - Real-time monitoring updates
 */

const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const { Contributor } = require('../Database/module.contibuter');
const { User } = require('../Database/module.user');
const { Monitor } = require('../Database/module.monitor');
const { Website } = require('../Database/module.websites');

class WebSocketService {
  constructor(server) {
    this.io = socketIo(server, {
      cors: {
        origin: process.env.FRONTEND_URL || '*',
        methods: ['GET', 'POST'],
        credentials: true
      }
    });
    
    this.userConnections = new Map(); // userId -> socketId
    this.contributorConnections = new Map(); // contributorId -> socketId
    this.adminConnections = new Map(); // adminId -> socketId
    
    this.monitorSubscriptions = new Map(); // monitorId -> Set of socketIds
    this.websiteSubscriptions = new Map(); // websiteId -> Set of socketIds
    
    // Custom event handlers
    this.customEventHandlers = new Map(); // eventName -> handler function
    
    this.setupSocketHandlers();
    
    console.log('WebSocket service initialized');
  }
  
  /**
   * Register a custom event handler
   * @param {string} eventName - The name of the event to handle
   * @param {function} handler - The handler function (async function that receives data and socket)
   */
  registerEvent(eventName, handler) {
    if (typeof handler !== 'function') {
      console.error(`Invalid handler for event ${eventName}`);
      return;
    }
    
    this.customEventHandlers.set(eventName, handler);
    console.log(`Registered custom event handler for: ${eventName}`);
    
    // Add the event handler to all existing sockets
    if (this.io && this.io.sockets && this.io.sockets.sockets) {
      const sockets = Array.from(this.io.sockets.sockets.values());
      
      for (const socket of sockets) {
        this.attachEventHandler(socket, eventName, handler);
      }
    }
  }
  
  /**
   * Attach an event handler to a socket
   * @param {Object} socket - The socket to attach the handler to
   * @param {string} eventName - The name of the event
   * @param {function} handler - The handler function
   */
  attachEventHandler(socket, eventName, handler) {
    // Remove any existing handler
    socket.removeAllListeners(eventName);
    
    // Attach new handler
    socket.on(eventName, async (data) => {
      try {
        const result = await handler(data, socket);
        socket.emit(`${eventName}:result`, result);
      } catch (error) {
        console.error(`Error handling ${eventName} event:`, error);
        socket.emit(`${eventName}:error`, { error: error.message });
      }
    });
  }
  
  /**
   * Set up main socket connection handlers
   */
  setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`New WebSocket connection: ${socket.id}`);
      
      // Authentication handler
      socket.on('authenticate', async (data) => this.handleAuthentication(socket, data));
      
      // Monitoring subscription handlers
      socket.on('subscribe:monitor', (data) => this.handleMonitorSubscribe(socket, data));
      socket.on('unsubscribe:monitor', (data) => this.handleMonitorUnsubscribe(socket, data));
      socket.on('subscribe:website', (data) => this.handleWebsiteSubscribe(socket, data));
      socket.on('unsubscribe:website', (data) => this.handleWebsiteUnsubscribe(socket, data));
      
      // Dashboard data handlers
      socket.on('request:dashboard:user', async (data) => this.handleUserDashboardRequest(socket, data));
      socket.on('request:dashboard:contributor', async (data) => this.handleContributorDashboardRequest(socket, data));
      
      // Validation test handler
      socket.on('validate', (data) => this.handleValidation(socket, data));
      
      // Attach any registered custom event handlers
      for (const [eventName, handler] of this.customEventHandlers.entries()) {
        this.attachEventHandler(socket, eventName, handler);
      }
      
      // Cleanup on disconnect
      socket.on('disconnect', () => this.handleDisconnect(socket));
    });
  }
  
  /**
   * Validate a socket message
   * @param {Object} message - The message to validate
   * @param {Array} requiredFields - List of required fields
   * @returns {Object} - Validation result with success and error message
   */
  validateMessage(message, requiredFields = []) {
    // Validate message exists
    if (!message || typeof message !== 'object') {
      return { 
        success: false, 
        error: 'Invalid message format' 
      };
    }
    
    // Validate required fields
    const missingFields = requiredFields.filter(field => !message[field]);
    if (missingFields.length > 0) {
      return {
        success: false,
        error: `Missing required fields: ${missingFields.join(', ')}`
      };
    }
    
    return { success: true };
  }
  
  /**
   * Handle user authentication
   * @param {Object} socket - The socket connection
   * @param {Object} data - Authentication data with token
   */
  async handleAuthentication(socket, data) {
    console.log(`Authentication attempt from socket: ${socket.id}`);
    
    // Validate message format
    const validation = this.validateMessage(data, ['token']);
    if (!validation.success) {
      socket.emit('auth:error', { error: validation.error });
      return;
    }
    
    try {
      // User JWT Secret
      const userJwtSecret = process.env.USER_JWT_SECRET;
      const contributorJwtSecret = process.env.CONTRIBUTOR_JWT_SECRET;
      const adminJwtSecret = process.env.ADMIN_JWT_SECRET;
      
      // Try to decode token with different secrets
      let decoded;
      let userType;
      
      try {
        decoded = jwt.verify(data.token, userJwtSecret);
        userType = 'user';
      } catch (e) {
        try {
          decoded = jwt.verify(data.token, contributorJwtSecret);
          userType = 'contributor';
        } catch (e) {
          try {
            decoded = jwt.verify(data.token, adminJwtSecret);
            userType = 'admin';
          } catch (e) {
            throw new Error('Invalid token');
          }
        }
      }
      
      // Store connection based on user type
      if (userType === 'user' && decoded.userId) {
        this.userConnections.set(decoded.userId, socket.id);
        socket.userId = decoded.userId;
        socket.userType = 'user';
      } else if (userType === 'contributor' && decoded.contributorId) {
        this.contributorConnections.set(decoded.contributorId, socket.id);
        socket.contributorId = decoded.contributorId;
        socket.userType = 'contributor';
      } else if (userType === 'admin' && decoded.adminId) {
        this.adminConnections.set(decoded.adminId, socket.id);
        socket.adminId = decoded.adminId;
        socket.userType = 'admin';
      } else {
        throw new Error('Invalid token payload');
      }
      
      // Notify client of successful authentication
      socket.emit('auth:success', { 
        userType, 
        id: decoded.userId || decoded.contributorId || decoded.adminId 
      });
      
      console.log(`Authenticated ${userType}: ${socket.id}`);
      
    } catch (error) {
      console.error('Authentication error:', error.message);
      socket.emit('auth:error', { error: 'Authentication failed: ' + error.message });
    }
  }
  
  /**
   * Handle subscription to a specific monitor
   * @param {Object} socket - The socket connection
   * @param {Object} data - Subscription data with monitorId
   */
  handleMonitorSubscribe(socket, data) {
    const validation = this.validateMessage(data, ['monitorId']);
    if (!validation.success) {
      socket.emit('error', { error: validation.error });
      return;
    }
    
    const { monitorId } = data;
    
    // Add to monitor subscriptions
    if (!this.monitorSubscriptions.has(monitorId)) {
      this.monitorSubscriptions.set(monitorId, new Set());
    }
    
    this.monitorSubscriptions.get(monitorId).add(socket.id);
    
    socket.emit('subscribe:monitor:success', { 
      monitorId, 
      message: 'Successfully subscribed to monitor updates' 
    });
    
    console.log(`Socket ${socket.id} subscribed to monitor ${monitorId}`);
  }
  
  /**
   * Handle unsubscribe from a specific monitor
   * @param {Object} socket - The socket connection
   * @param {Object} data - Subscription data with monitorId
   */
  handleMonitorUnsubscribe(socket, data) {
    const validation = this.validateMessage(data, ['monitorId']);
    if (!validation.success) {
      socket.emit('error', { error: validation.error });
      return;
    }
    
    const { monitorId } = data;
    
    // Remove from monitor subscriptions
    if (this.monitorSubscriptions.has(monitorId)) {
      this.monitorSubscriptions.get(monitorId).delete(socket.id);
      
      // Clean up empty sets
      if (this.monitorSubscriptions.get(monitorId).size === 0) {
        this.monitorSubscriptions.delete(monitorId);
      }
    }
    
    socket.emit('unsubscribe:monitor:success', { 
      monitorId, 
      message: 'Successfully unsubscribed from monitor updates' 
    });
    
    console.log(`Socket ${socket.id} unsubscribed from monitor ${monitorId}`);
  }
  
  /**
   * Handle subscription to a website (all monitors)
   * @param {Object} socket - The socket connection
   * @param {Object} data - Subscription data with websiteId
   */
  handleWebsiteSubscribe(socket, data) {
    const validation = this.validateMessage(data, ['websiteId']);
    if (!validation.success) {
      socket.emit('error', { error: validation.error });
      return;
    }
    
    const { websiteId } = data;
    
    // Add to website subscriptions
    if (!this.websiteSubscriptions.has(websiteId)) {
      this.websiteSubscriptions.set(websiteId, new Set());
    }
    
    this.websiteSubscriptions.get(websiteId).add(socket.id);
    
    socket.emit('subscribe:website:success', { 
      websiteId, 
      message: 'Successfully subscribed to website updates' 
    });
    
    console.log(`Socket ${socket.id} subscribed to website ${websiteId}`);
  }
  
  /**
   * Handle unsubscribe from a website
   * @param {Object} socket - The socket connection
   * @param {Object} data - Subscription data with websiteId
   */
  handleWebsiteUnsubscribe(socket, data) {
    const validation = this.validateMessage(data, ['websiteId']);
    if (!validation.success) {
      socket.emit('error', { error: validation.error });
      return;
    }
    
    const { websiteId } = data;
    
    // Remove from website subscriptions
    if (this.websiteSubscriptions.has(websiteId)) {
      this.websiteSubscriptions.get(websiteId).delete(socket.id);
      
      // Clean up empty sets
      if (this.websiteSubscriptions.get(websiteId).size === 0) {
        this.websiteSubscriptions.delete(websiteId);
      }
    }
    
    socket.emit('unsubscribe:website:success', { 
      websiteId, 
      message: 'Successfully unsubscribed from website updates' 
    });
    
    console.log(`Socket ${socket.id} unsubscribed from website ${websiteId}`);
  }
  
  /**
   * Handle user dashboard data request
   * @param {Object} socket - The socket connection
   * @param {Object} data - Request data
   */
  async handleUserDashboardRequest(socket, data) {
    // Check if user is authenticated
    if (!socket.userId) {
      socket.emit('error', { error: 'Authentication required' });
      return;
    }
    
    try {
      // Find user and their monitors
      const user = await User.findById(socket.userId);
      
      if (!user) {
        socket.emit('error', { error: 'User not found' });
        return;
      }
      
      const websites = await Website.find({ owner: user._id });
      
      if (!websites || websites.length === 0) {
        socket.emit('dashboard:user', { 
          websites: [],
          monitors: [],
          stats: {
            totalMonitors: 0,
            monitorsUp: 0,
            monitorsDown: 0,
            averageUptime: 0
          }
        });
        return;
      }
      
      const websiteIds = websites.map(w => w._id);
      const monitors = await Monitor.find({ website: { $in: websiteIds } });
      
      // Calculate basic stats
      const monitorsUp = monitors.filter(m => m.status === 'up').length;
      const monitorsDown = monitors.filter(m => m.status === 'down').length;
      
      // Send dashboard data
      socket.emit('dashboard:user', {
        websites: websites.map(w => ({
          id: w._id,
          name: w.name,
          url: w.url,
          status: w.status || 'unknown'
        })),
        monitors: monitors.map(m => ({
          id: m._id,
          name: m.name,
          url: m.url,
          type: m.type,
          status: m.status || 'unknown',
          uptime: m.uptime || 100,
          responseTime: m.averageResponseTime || 0,
          lastChecked: m.lastChecked
        })),
        stats: {
          totalMonitors: monitors.length,
          monitorsUp,
          monitorsDown,
          averageUptime: monitors.length > 0 
            ? monitors.reduce((sum, m) => sum + (m.uptime || 0), 0) / monitors.length 
            : 0
        }
      });
      
    } catch (error) {
      console.error('Error handling user dashboard request:', error);
      socket.emit('error', { error: 'Failed to retrieve dashboard data' });
    }
  }
  
  /**
   * Handle contributor dashboard data request
   * @param {Object} socket - The socket connection
   * @param {Object} data - Request data
   */
  async handleContributorDashboardRequest(socket, data) {
    // Check if contributor is authenticated
    if (!socket.contributorId) {
      socket.emit('error', { error: 'Authentication required' });
      return;
    }
    
    try {
      // Find contributor and assigned websites
      const contributor = await Contributor.findById(socket.contributorId);
      
      if (!contributor) {
        socket.emit('error', { error: 'Contributor not found' });
        return;
      }
      
      const websites = await Website.find({ contributors: contributor._id });
      
      if (!websites || websites.length === 0) {
        socket.emit('dashboard:contributor', { 
          websites: [],
          monitors: [],
          stats: {
            totalMonitors: 0,
            monitorsUp: 0,
            monitorsDown: 0,
            averageUptime: 0
          }
        });
        return;
      }
      
      const websiteIds = websites.map(w => w._id);
      const monitors = await Monitor.find({ website: { $in: websiteIds } });
      
      // Calculate basic stats
      const monitorsUp = monitors.filter(m => m.status === 'up').length;
      const monitorsDown = monitors.filter(m => m.status === 'down').length;
      
      // Send dashboard data
      socket.emit('dashboard:contributor', {
        websites: websites.map(w => ({
          id: w._id,
          name: w.name,
          url: w.url,
          status: w.status || 'unknown'
        })),
        monitors: monitors.map(m => ({
          id: m._id,
          name: m.name,
          url: m.url,
          type: m.type,
          status: m.status || 'unknown',
          uptime: m.uptime || 100,
          responseTime: m.averageResponseTime || 0,
          lastChecked: m.lastChecked
        })),
        stats: {
          totalMonitors: monitors.length,
          monitorsUp,
          monitorsDown,
          averageUptime: monitors.length > 0 
            ? monitors.reduce((sum, m) => sum + (m.uptime || 0), 0) / monitors.length 
            : 0
        }
      });
      
    } catch (error) {
      console.error('Error handling contributor dashboard request:', error);
      socket.emit('error', { error: 'Failed to retrieve dashboard data' });
    }
  }
  
  /**
   * Handle validation requests (for testing)
   * @param {Object} socket - The socket connection
   * @param {Object} data - Data to validate
   */
  handleValidation(socket, data) {
    console.log('Validation request:', data);
    
    const requiredFields = data.fields || [];
    const validation = this.validateMessage(data.payload, requiredFields);
    
    if (validation.success) {
      socket.emit('validate:success', { 
        message: 'Validation successful',
        payload: data.payload
      });
    } else {
      socket.emit('validate:error', {
        error: validation.error,
        payload: data.payload
      });
    }
  }
  
  /**
   * Handle socket disconnection
   * @param {Object} socket - The socket that disconnected
   */
  handleDisconnect(socket) {
    console.log(`Socket disconnected: ${socket.id}`);
    
    // Clean up user connections
    if (socket.userId) {
      this.userConnections.delete(socket.userId);
    }
    
    if (socket.contributorId) {
      this.contributorConnections.delete(socket.contributorId);
    }
    
    if (socket.adminId) {
      this.adminConnections.delete(socket.adminId);
    }
    
    // Clean up subscriptions
    for (const [monitorId, subscribers] of this.monitorSubscriptions.entries()) {
      if (subscribers.has(socket.id)) {
        subscribers.delete(socket.id);
        
        // Clean up empty sets
        if (subscribers.size === 0) {
          this.monitorSubscriptions.delete(monitorId);
        }
      }
    }
    
    for (const [websiteId, subscribers] of this.websiteSubscriptions.entries()) {
      if (subscribers.has(socket.id)) {
        subscribers.delete(socket.id);
        
        // Clean up empty sets
        if (subscribers.size === 0) {
          this.websiteSubscriptions.delete(websiteId);
        }
      }
    }
  }
  
  /**
   * Broadcast a status update for a monitor to all subscribed clients
   * @param {string} monitorId - The ID of the monitor
   * @param {Object} status - Status information to broadcast
   * @returns {number} - Number of clients the update was sent to
   */
  broadcastMonitorStatus(monitorId, status) {
    if (!this.monitorSubscriptions.has(monitorId)) {
      console.log(`No subscribers for monitor ${monitorId}`);
      return 0;
    }
    
    const subscribers = this.monitorSubscriptions.get(monitorId);
    console.log(`Broadcasting monitor status to ${subscribers.size} subscribers`);
    
    for (const socketId of subscribers) {
      const socket = this.io.sockets.sockets.get(socketId);
      if (socket) {
        socket.emit('monitor:status:update', {
          monitorId,
          ...status
        });
      }
    }
    
    return subscribers.size;
  }
  
  /**
   * Broadcast an alert for a monitor to all relevant subscribers
   * @param {string} monitorId - The ID of the monitor
   * @param {Object} alert - Alert information to broadcast
   */
  broadcastAlert(monitorId, alert) {
    // First, broadcast to monitor subscribers
    if (this.monitorSubscriptions.has(monitorId)) {
      const subscribers = this.monitorSubscriptions.get(monitorId);
      console.log(`Broadcasting alert to ${subscribers.size} monitor subscribers`);
      
      for (const socketId of subscribers) {
        const socket = this.io.sockets.sockets.get(socketId);
        if (socket) {
          socket.emit('monitor:alert', {
            monitorId,
            ...alert
          });
        }
      }
    }
    
    // Also broadcast to website subscribers if we can find the monitor's website
    try {
      const Monitor = require('../Database/module.monitor').Monitor;
      Monitor.findById(monitorId).then(monitor => {
        if (!monitor || !monitor.website) return;
        
        const websiteId = monitor.website.toString();
        if (this.websiteSubscriptions.has(websiteId)) {
          const subscribers = this.websiteSubscriptions.get(websiteId);
          console.log(`Broadcasting alert to ${subscribers.size} website subscribers`);
          
          for (const socketId of subscribers) {
            const socket = this.io.sockets.sockets.get(socketId);
            if (socket) {
              socket.emit('website:alert', {
                websiteId,
                monitorId,
                ...alert
              });
            }
          }
        }
      }).catch(err => {
        console.error('Error finding monitor:', err);
      });
    } catch (err) {
      console.error('Error broadcasting to website subscribers:', err);
    }
  }
}

module.exports = WebSocketService; 