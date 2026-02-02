require('dotenv').config({ path: '../../.env' });
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const { database, createLogger } = require('@cloudretail/shared');

const analyticsRoutes = require('./routes/analyticsRoutes');

const app = express();
const logger = createLogger('analytics-service');
const PORT = process.env.ANALYTICS_SERVICE_PORT || 3006;
const DB_NAME = process.env.DB_NAME_ANALYTICS || 'analytics_db';

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('combined', {
  stream: {
    write: (message) => logger.info(message.trim()),
  },
}));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'analytics-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Routes
app.use('/api/analytics', analyticsRoutes);

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

// Initialize database and start server
const startServer = async () => {
  try {
    // Initialize analytics database pool
    await database.createPool(DB_NAME, {
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: DB_NAME,
    });

    // Initialize order database pool (needed for seller metrics)
    await database.createPool('order_db', {
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: 'order_db',
    });

    logger.info('Database connections initialized');

    app.listen(PORT, () => {
      logger.info(`Analytics service listening on port ${PORT}`);
      console.log(`Analytics service running at http://localhost:${PORT}`);
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
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

startServer();
