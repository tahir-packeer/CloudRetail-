require('dotenv').config({ path: '../../.env' });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const { createLogger, database } = require('@cloudretail/shared');

const productRoutes = require('./routes/productRoutes');
const categoryRoutes = require('./routes/categoryRoutes');

const logger = createLogger('catalog-service');
const app = express();
const PORT = process.env.CATALOG_SERVICE_PORT || 3002;

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allow serving images
}));
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

// Serve static uploads folder
app.use('/uploads', express.static(path.join(__dirname, '..', '..', '..', 'uploads')));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'catalog-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Test search
app.get('/test-search', async (req, res) => {
  try {
    const { database } = require('@cloudretail/shared');
    
    const params = ['active'];
    const limit = 20;
    const offset = 0;
    const query = `
      SELECT p.*, c.name as category_name, c.slug as category_slug
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.status = ?
      ORDER BY p.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
    
    console.log('Running query with params:', params);
    const products = await database.query('catalog_db', query, params);
    res.json({ success: true, count: products.length, products });
  } catch (error) {
    console.error('Test search error:', error);
    res.status(500).json({ success: false, error: error.message, stack: error.stack });
  }
});

// Routes
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);

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

// Initialize database connection
const initializeDatabase = async () => {
  try {
    await database.createPool('catalog_db');
    logger.info('Database connection initialized');
  } catch (error) {
    logger.error('Database initialization failed', { error: error.message });
    throw error;
  }
};

// Start server
const startServer = async () => {
  try {
    await initializeDatabase();

    app.listen(PORT, () => {
      logger.info(`Catalog service listening on port ${PORT}`);
      console.log(`Catalog service running at http://localhost:${PORT}`);
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

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Start the application
startServer();
