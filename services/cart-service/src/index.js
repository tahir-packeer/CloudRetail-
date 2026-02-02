require('dotenv').config({ path: '../../.env' });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { createLogger, database, redisClient } = require('@cloudretail/shared');
const cartRoutes = require('./routes/cartRoutes');

const logger = createLogger('cart-service');
const app = express();
const PORT = process.env.CART_SERVICE_PORT || 3003;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Morgan logging integrated with Winston
const morganStream = {
  write: (message) => logger.info(message.trim()),
};
app.use(morgan('combined', { stream: morganStream }));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'cart-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Routes
app.use('/api/cart', cartRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// Error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error', { error: err.message, stack: err.stack });
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// Initialize connections
const initializeConnections = async () => {
  try {
    // Try to initialize Redis (non-blocking)
    redisClient.connect().catch(error => {
      logger.warn('Redis not available, using in-memory storage', { error: error.message });
    });

    // Initialize database connection for product lookups
    await database.createPool('catalog_db');
    logger.info('Database connection initialized');
    logger.info('Using in-memory cart storage (Redis not available)');
  } catch (error) {
    logger.error('Connection initialization failed', { error: error.message });
    throw error;
  }
};

// Start server
const startServer = async () => {
  try {
    await initializeConnections();

    app.listen(PORT, () => {
      logger.info(`Cart service listening on port ${PORT}`);
      console.log(`Cart service running at http://localhost:${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    logger.error('Failed to start server', { error: error.message });
    process.exit(1);
  }
};

// Graceful shutdown
const shutdown = async () => {
  logger.info('Shutting down gracefully...');
  await database.closeAll();
  await redisClient.disconnect();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Start the application
startServer();
