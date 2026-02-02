const mysql = require('mysql2/promise');
const { createLogger } = require('./logger');

const logger = createLogger('database');

class DatabaseConnection {
  constructor() {
    this.pools = {};
  }

  /**
   * Create a connection pool for a specific database
   * @param {string} dbName - Database name
   * @param {object} config - Connection configuration
   * @returns {Promise<mysql.Pool>}
   */
  async createPool(dbName, config = {}) {
    if (this.pools[dbName]) {
      return this.pools[dbName];
    }

    const poolConfig = {
      host: config.host || process.env.DB_HOST || 'localhost',
      port: config.port || process.env.DB_PORT || 3306,
      user: config.user || process.env.DB_USER,
      password: config.password || process.env.DB_PASSWORD,
      database: dbName,
      waitForConnections: true,
      connectionLimit: config.connectionLimit || 10,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
    };

    try {
      const pool = mysql.createPool(poolConfig);
      
      // Test connection
      const connection = await pool.getConnection();
      logger.info(`Successfully connected to database: ${dbName}`);
      connection.release();
      
      this.pools[dbName] = pool;
      return pool;
    } catch (error) {
      logger.error(`Failed to connect to database: ${dbName}`, { error: error.message });
      throw error;
    }
  }

  /**
   * Get existing pool or create new one
   * @param {string} dbName - Database name
   * @returns {mysql.Pool}
   */
  getPool(dbName) {
    if (!this.pools[dbName]) {
      throw new Error(`Pool for database ${dbName} not initialized`);
    }
    return this.pools[dbName];
  }

  /**
   * Execute query with automatic connection management
   * @param {string} dbName - Database name
   * @param {string} query - SQL query
   * @param {array} params - Query parameters
   * @returns {Promise<any>}
   */
  async query(dbName, query, params = []) {
    const pool = this.getPool(dbName);
    try {
      const [results] = await pool.execute(query, params);
      return results;
    } catch (error) {
      logger.error('Database query error', { dbName, error: error.message, query });
      throw error;
    }
  }

  /**
   * Execute transaction
   * @param {string} dbName - Database name
   * @param {Function} callback - Transaction callback
   * @returns {Promise<any>}
   */
  async transaction(dbName, callback) {
    const pool = this.getPool(dbName);
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();
      const result = await callback(connection);
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      logger.error('Transaction error', { dbName, error: error.message });
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Close all pools
   * @returns {Promise<void>}
   */
  async closeAll() {
    const closePromises = Object.entries(this.pools).map(async ([dbName, pool]) => {
      try {
        await pool.end();
        logger.info(`Closed connection pool for: ${dbName}`);
      } catch (error) {
        logger.error(`Error closing pool for ${dbName}`, { error: error.message });
      }
    });

    await Promise.all(closePromises);
    this.pools = {};
  }
}

// Singleton instance
const dbConnection = new DatabaseConnection();

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Closing database connections...');
  await dbConnection.closeAll();
  process.exit(0);
});

module.exports = dbConnection;
