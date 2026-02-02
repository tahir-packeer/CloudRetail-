require('dotenv').config({ path: '../../.env' });
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { v4: uuidv4 } = require('uuid');
const { createLogger } = require('@cloudretail/shared');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const logger = createLogger('api-gateway');
const PORT = process.env.GATEWAY_PORT || 3000;

// Service URLs
const SERVICES = {
  auth: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
  catalog: process.env.CATALOG_SERVICE_URL || 'http://localhost:3002',
  cart: process.env.CART_SERVICE_URL || 'http://localhost:3003',
  order: process.env.ORDER_SERVICE_URL || 'http://localhost:3004',
  payment: process.env.PAYMENT_SERVICE_URL || 'http://localhost:3005',
  analytics: process.env.ANALYTICS_SERVICE_URL || 'http://localhost:3006',
};

// Middleware
app.use(helmet());

// CORS configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: { success: false, message: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Request correlation ID
app.use((req, res, next) => {
  req.correlationId = req.headers['x-correlation-id'] || uuidv4();
  res.setHeader('X-Correlation-ID', req.correlationId);
  next();
});

// Logging
app.use(morgan('combined', {
  stream: {
    write: (message) => logger.info(message.trim()),
  },
}));

// Health check aggregation
app.get('/health', async (req, res) => {
  const axios = require('axios');
  const serviceHealth = {};

  for (const [name, url] of Object.entries(SERVICES)) {
    try {
      const response = await axios.get(`${url}/health`, { timeout: 2000 });
      serviceHealth[name] = {
        status: response.data.status || 'healthy',
        url,
      };
    } catch (error) {
      serviceHealth[name] = {
        status: 'unhealthy',
        url,
        error: error.message,
      };
    }
  }

  const allHealthy = Object.values(serviceHealth).every(s => s.status === 'healthy');

  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'healthy' : 'degraded',
    gateway: 'api-gateway',
    timestamp: new Date().toISOString(),
    services: serviceHealth,
  });
});

// Proxy configuration
const proxyOptions = (serviceName) => ({
  target: SERVICES[serviceName],
  changeOrigin: true,
  logLevel: 'error',
  onProxyReq: (proxyReq, req, res) => {
    // Add correlation ID to downstream services
    proxyReq.setHeader('X-Correlation-ID', req.correlationId);
    
    // Log proxy request
    logger.info(`Proxying ${req.method} ${req.path} to ${serviceName}`, {
      correlationId: req.correlationId,
      service: serviceName,
    });
  },
  onError: (err, req, res) => {
    logger.error(`Proxy error for ${serviceName}`, {
      error: err.message,
      correlationId: req.correlationId,
      service: serviceName,
    });
    
    res.status(503).json({
      success: false,
      message: `Service ${serviceName} is currently unavailable`,
      correlationId: req.correlationId,
    });
  },
});

// Service routes
app.use('/api/auth', createProxyMiddleware(proxyOptions('auth')));
app.use('/api/products', createProxyMiddleware(proxyOptions('catalog')));
app.use('/api/categories', createProxyMiddleware(proxyOptions('catalog')));
app.use('/api/cart', createProxyMiddleware(proxyOptions('cart')));
app.use('/api/orders', createProxyMiddleware(proxyOptions('order')));
app.use('/api/payments', createProxyMiddleware(proxyOptions('payment')));
app.use('/api/analytics', createProxyMiddleware(proxyOptions('analytics')));

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.path,
    correlationId: req.correlationId,
  });
});

// Error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    correlationId: req.correlationId,
  });
  
  res.status(500).json({
    success: false,
    message: 'Internal gateway error',
    correlationId: req.correlationId,
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// Start server
app.listen(PORT, () => {
  logger.info(`API Gateway listening on port ${PORT}`);
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  CloudRetail API Gateway`);
  console.log(`${'='.repeat(60)}`);
  console.log(`  Gateway URL: http://localhost:${PORT}`);
  console.log(`  Health Check: http://localhost:${PORT}/health`);
  console.log(`${'='.repeat(60)}`);
  console.log(`\n  Service Routes:`);
  console.log(`    /api/auth       -> ${SERVICES.auth}`);
  console.log(`    /api/products   -> ${SERVICES.catalog}`);
  console.log(`    /api/categories -> ${SERVICES.catalog}`);
  console.log(`    /api/cart       -> ${SERVICES.cart}`);
  console.log(`    /api/orders     -> ${SERVICES.order}`);
  console.log(`    /api/payments   -> ${SERVICES.payment}`);
  console.log(`    /api/analytics  -> ${SERVICES.analytics}`);
  console.log(`${'='.repeat(60)}\n`);
});

// Graceful shutdown
const shutdown = () => {
  logger.info('Shutting down gracefully...');
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
