const jwt = require('jsonwebtoken');
const { createLogger } = require('./logger');

const logger = createLogger('jwt-helper');

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_change_me';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your_refresh_secret_change_me';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

/**
 * Generate access token
 * @param {object} payload - Token payload
 * @returns {string} - JWT token
 */
const generateAccessToken = payload => {
  try {
    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
      issuer: 'cloudretail-auth',
    });
  } catch (error) {
    logger.error('Error generating access token', { error: error.message });
    throw error;
  }
};

/**
 * Generate refresh token
 * @param {object} payload - Token payload
 * @returns {string} - JWT refresh token
 */
const generateRefreshToken = payload => {
  try {
    return jwt.sign(payload, JWT_REFRESH_SECRET, {
      expiresIn: JWT_REFRESH_EXPIRES_IN,
      issuer: 'cloudretail-auth',
    });
  } catch (error) {
    logger.error('Error generating refresh token', { error: error.message });
    throw error;
  }
};

/**
 * Verify access token
 * @param {string} token - JWT token
 * @returns {object} - Decoded payload
 */
const verifyAccessToken = token => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('TOKEN_EXPIRED');
    }
    if (error.name === 'JsonWebTokenError') {
      throw new Error('INVALID_TOKEN');
    }
    throw error;
  }
};

/**
 * Verify refresh token
 * @param {string} token - JWT refresh token
 * @returns {object} - Decoded payload
 */
const verifyRefreshToken = token => {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('REFRESH_TOKEN_EXPIRED');
    }
    if (error.name === 'JsonWebTokenError') {
      throw new Error('INVALID_REFRESH_TOKEN');
    }
    throw error;
  }
};

/**
 * Decode token without verification (useful for debugging)
 * @param {string} token - JWT token
 * @returns {object} - Decoded payload
 */
const decodeToken = token => {
  try {
    return jwt.decode(token, { complete: true });
  } catch (error) {
    logger.error('Error decoding token', { error: error.message });
    return null;
  }
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  decodeToken,
};
