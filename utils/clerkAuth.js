const { clerkClient } = require('@clerk/clerk-sdk-node');
const jwt = require('jsonwebtoken');
const { User } = require('../Database/module.user');
const { Contributor } = require('../Database/module.contibuter');

/**
 * Middleware to verify Clerk JWT token and attach user info to request
 */
const verifyClerkToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization required' });
    }

    const token = authHeader.split(' ')[1];
    
    // Verify with Clerk
    const session = await clerkClient.sessions.verifySession(token);
    if (!session || !session.userId) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    // Get user from Clerk
    const clerkUser = await clerkClient.users.getUser(session.userId);
    
    // Get user role from public metadata
    const userRole = clerkUser.publicMetadata?.role || 'user';
    
    // Set appropriate request properties based on role
    if (userRole === 'contributor') {
      // Find contributor in MongoDB by clerkId
      const contributor = await Contributor.findOne({ clerkId: session.userId });
      
      if (!contributor) {
        // Create contributor record if it doesn't exist
        const newContributor = new Contributor({
          name: `${clerkUser.firstName} ${clerkUser.lastName}`,
          email: clerkUser.emailAddresses[0].emailAddress,
          isEmailVerified: clerkUser.emailAddresses[0].verification?.status === 'verified',
          clerkId: session.userId
        });
        await newContributor.save();
        req.contributor = { contributorId: newContributor._id, email: newContributor.email };
      } else {
        req.contributor = { contributorId: contributor._id, email: contributor.email };
      }
    } else {
      // Find user in MongoDB by clerkId
      const user = await User.findOne({ clerkId: session.userId });
      
      if (!user) {
        // Create user record if it doesn't exist
        const newUser = new User({
          name: `${clerkUser.firstName} ${clerkUser.lastName}`,
          email: clerkUser.emailAddresses[0].emailAddress,
          isEmailVerified: clerkUser.emailAddresses[0].verification?.status === 'verified',
          clerkId: session.userId
        });
        await newUser.save();
        req.user = { userId: newUser._id, email: newUser.email };
      } else {
        req.user = { userId: user._id, email: user.email };
      }
    }
    
    next();
  } catch (error) {
    console.error('Clerk authentication error:', error);
    return res.status(401).json({ error: 'Authentication failed' });
  }
};

/**
 * User auth middleware using Clerk
 */
const authenticateClerkUser = async (req, res, next) => {
  try {
    await verifyClerkToken(req, res, () => {
      if (!req.user) {
        return res.status(403).json({ error: 'Access denied. User role required.' });
      }
      next();
    });
  } catch (error) {
    res.status(401).json({ error: 'Authentication failed' });
  }
};

/**
 * Contributor auth middleware using Clerk
 */
const authenticateClerkContributor = async (req, res, next) => {
  try {
    await verifyClerkToken(req, res, () => {
      if (!req.contributor) {
        return res.status(403).json({ error: 'Access denied. Contributor role required.' });
      }
      next();
    });
  } catch (error) {
    res.status(401).json({ error: 'Authentication failed' });
  }
};

module.exports = {
  verifyClerkToken,
  authenticateClerkUser,
  authenticateClerkContributor
}; 