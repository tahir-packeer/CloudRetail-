require('dotenv').config({ path: '../../.env' });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { createLogger, database } = require('@cloudretail/shared');
const paymentRoutes = require('./routes/paymentRoutes');

const logger = createLogger('payment-service');
const app = express();
const PORT = process.env.PAYMENT_SERVICE_PORT || 3005;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));

// Webhook route needs raw body - must be before express.json()
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));

// JSON parsing for all other routes
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
    service: 'payment-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    stripe: !!process.env.STRIPE_SECRET_KEY,
  });
});

// Routes - mount at /api/payments to match gateway expectations
app.use('/api/payments', paymentRoutes);

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

// Initialize database
const initializeDatabase = async () => {
  try {
    await database.createPool('payment_db');
    logger.info('Database connection initialized');
  } catch (error) {
    logger.error('Database initialization failed', { error: error.message });
    throw error;
  }
};

// Start server
const startServer = async () => {
  try {
    // Check Stripe configuration
    if (!process.env.STRIPE_SECRET_KEY) {
      logger.warn('STRIPE_SECRET_KEY not configured - payment processing will fail');
    }
    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      logger.warn('STRIPE_WEBHOOK_SECRET not configured - webhooks will fail');
    }

    await initializeDatabase();

    app.listen(PORT, () => {
      logger.info(`Payment service listening on port ${PORT}`);
      console.log(`Payment service running at http://localhost:${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/health`);
      console.log(`Stripe configured: ${!!process.env.STRIPE_SECRET_KEY}`);
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

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Start the application
startServer();
