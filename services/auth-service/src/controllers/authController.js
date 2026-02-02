const { jwt, validation, createLogger } = require('@cloudretail/shared');
const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');

const logger = createLogger('auth-controller');

/**
 * Register a new user
 */
const register = async (req, res) => {
  try {
    const { isValid, errors, value } = validation.validate(
      validation.userRegisterSchema,
      req.body
    );

    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors,
      });
    }

    // Check if user already exists
    const existingUser = await User.findByEmail(value.email);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User with this email already exists',
      });
    }

    // Create user
    const user = await User.create(value);

    // If seller role, create seller profile
    if (value.role === 'seller' && req.body.businessName) {
      await User.createSellerProfile(user.id, {
        businessName: req.body.businessName,
        businessDescription: req.body.businessDescription,
        businessAddress: req.body.businessAddress,
      });
    }

    logger.info('User registered successfully', { userId: user.id, role: user.role });

    // Generate tokens
    const accessToken = jwt.generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    const refreshToken = jwt.generateRefreshToken({
      userId: user.id,
    });

    // Save refresh token
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    await RefreshToken.create(user.id, refreshToken, expiresAt);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        },
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    logger.error('Registration error', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Login user
 */
const login = async (req, res) => {
  try {
    const { isValid, errors, value } = validation.validate(
      validation.userLoginSchema,
      req.body
    );

    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors,
      });
    }

    // Find user
    const user = await User.findByEmail(value.email);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // Check if user is blocked or inactive
    if (user.status === 'blocked') {
      return res.status(403).json({
        success: false,
        message: 'Your account has been blocked',
      });
    }

    if (user.status === 'inactive') {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated',
      });
    }

    // Verify password
    const isPasswordValid = await User.verifyPassword(value.password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // Update last login
    await User.updateLastLogin(user.id);

    // Get seller profile if applicable
    let sellerProfile = null;
    if (user.role === 'seller') {
      sellerProfile = await User.getSellerProfile(user.id);
    }

    logger.info('User logged in successfully', { userId: user.id, role: user.role });

    // Generate tokens
    const accessToken = jwt.generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    const refreshToken = jwt.generateRefreshToken({
      userId: user.id,
    });

    // Save refresh token
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    await RefreshToken.create(user.id, refreshToken, expiresAt);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          status: user.status,
          sellerProfile,
        },
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    logger.error('Login error', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Refresh access token
 */
const refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required',
      });
    }

    // Verify refresh token
    let decoded;
    try {
      decoded = jwt.verifyRefreshToken(refreshToken);
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired refresh token',
      });
    }

    // Check if refresh token exists and is not revoked
    const tokenRecord = await RefreshToken.findByToken(refreshToken);
    if (!tokenRecord || tokenRecord.revoked) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token has been revoked',
      });
    }

    // Check if token is expired
    if (new Date() > new Date(tokenRecord.expiresAt)) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token has expired',
      });
    }

    // Get user
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found',
      });
    }

    if (user.status === 'blocked') {
      return res.status(401).json({
        success: false,
        message: 'Your account has been blocked',
      });
    }

    if (user.status === 'inactive') {
      return res.status(401).json({
        success: false,
        message: 'Your account has been deactivated',
      });
    }

    // Generate new access token
    const accessToken = jwt.generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        accessToken,
      },
    });
  } catch (error) {
    logger.error('Token refresh error', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Token refresh failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Logout user
 */
const logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      await RefreshToken.revoke(refreshToken);
    }

    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    logger.error('Logout error', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Logout failed',
    });
  }
};

/**
 * Get current user profile
 */
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Get seller profile if applicable
    let sellerProfile = null;
    if (user.role === 'seller') {
      sellerProfile = await User.getSellerProfile(user.id);
    }

    res.json({
      success: true,
      data: {
        user: {
          ...user,
          sellerProfile,
        },
      },
    });
  } catch (error) {
    logger.error('Get profile error', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to get profile',
    });
  }
};

/**
 * Verify token (used by other services)
 */
const verifyToken = async (req, res) => {
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
      const decoded = jwt.verifyAccessToken(token);
      res.json({
        success: true,
        data: decoded,
      });
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token',
      });
    }
  } catch (error) {
    logger.error('Token verification error', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Token verification failed',
    });
  }
};

/**
 * Get all users (Admin only)
 */
const getAllUsers = async (req, res) => {
  try {
    const users = await User.findAll();
    
    // Remove sensitive data
    const sanitizedUsers = users.map(user => ({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      status: user.status,
      isVerified: user.isVerified,
      phone: user.phone,
      createdAt: user.createdAt
    }));

    res.status(200).json({
      success: true,
      data: sanitizedUsers,
    });
  } catch (error) {
    logger.error('Get all users error', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users',
    });
  }
};

/**
 * Get user by ID
 */
const getUserById = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Remove sensitive data
    const sanitizedUser = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      name: `${user.firstName} ${user.lastName}`,
      role: user.role,
      status: user.status,
      phone: user.phone,
    };

    res.status(200).json({
      success: true,
      data: sanitizedUser,
    });
  } catch (error) {
    logger.error('Get user by ID error', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user',
    });
  }
};

/**
 * Update user status (Admin only)
 */
const updateUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { status } = req.body;

    if (!['active', 'inactive', 'suspended'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value',
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    await User.updateStatus(userId, status);

    logger.info('User status updated', { userId, status, adminId: req.user.userId });

    res.status(200).json({
      success: true,
      message: 'User status updated successfully',
    });
  } catch (error) {
    logger.error('Update user status error', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to update user status',
    });
  }
};

/**
 * Verify seller (Admin only)
 */
const verifySeller = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    if (user.role !== 'seller') {
      return res.status(400).json({
        success: false,
        message: 'User is not a seller',
      });
    }

    await User.verifySeller(userId);

    logger.info('Seller verified', { userId, adminId: req.user.userId });

    res.status(200).json({
      success: true,
      message: 'Seller verified successfully',
    });
  } catch (error) {
    logger.error('Verify seller error', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to verify seller',
    });
  }
};

module.exports = {
  register,
  login,
  refresh,
  logout,
  getProfile,
  verifyToken,
  getAllUsers,
  getUserById,
  updateUserStatus,
  verifySeller,
};
