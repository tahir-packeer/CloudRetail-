const { verifyAccessToken } = require('./jwt');
const { createLogger } = require('./logger');

const logger = createLogger('auth-middleware');

/**
 * Authentication middleware - verifies JWT token
 */
const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided',
      });
    }

    const token = authHeader.substring(7);

    try {
      const decoded = verifyAccessToken(token);
      req.user = decoded;
      next();
    } catch (error) {
      if (error.message === 'TOKEN_EXPIRED') {
        return res.status(401).json({
          success: false,
          message: 'Token expired',
          code: 'TOKEN_EXPIRED',
        });
      }
      return res.status(401).json({
        success: false,
        message: 'Invalid token',
      });
    }
  } catch (error) {
    logger.error('Authentication error', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Authentication failed',
    });
  }
};

/**
 * Authorization middleware - checks user role
 * @param {string[]} roles - Allowed roles
 * @returns {Function} - Express middleware
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
    }

    if (!roles.includes(req.user.role)) {
      logger.warn('Unauthorized access attempt', {
        userId: req.user.userId,
        requiredRoles: roles,
        userRole: req.user.role,
      });

      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
      });
    }

    next();
  };
};

/**
 * Optional authentication - attaches user if token exists, but doesn't fail
 */
const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const decoded = verifyAccessToken(token);
        req.user = decoded;
      } catch (error) {
        // Silently fail for optional auth
        logger.debug('Optional auth failed', { error: error.message });
      }
    }

    next();
  } catch (error) {
    logger.error('Optional authentication error', { error: error.message });
    next();
  }
};

module.exports = {
  authenticate,
  authorize,
  optionalAuth,
};
