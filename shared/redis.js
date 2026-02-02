const redis = require('redis');
const { createLogger } = require('./logger');

const logger = createLogger('redis');

class RedisClient {
  constructor() {
    this.client = null;
    this.subscriber = null;
    this.publisher = null;
  }

  /**
   * Initialize Redis client
   * @returns {Promise<void>}
   */
  async connect() {
    if (this.client) {
      return this.client;
    }

    const config = {
      socket: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
      },
    };

    if (process.env.REDIS_PASSWORD) {
      config.password = process.env.REDIS_PASSWORD;
    }

    try {
      // Main client for get/set operations
      this.client = redis.createClient(config);
      
      this.client.on('error', err => {
        logger.error('Redis Client Error', { error: err.message });
      });

      this.client.on('connect', () => {
        logger.info('Redis client connected');
      });

      await this.client.connect();

      // Separate publisher and subscriber for Pub/Sub
      this.publisher = this.client.duplicate();
      await this.publisher.connect();

      this.subscriber = this.client.duplicate();
      await this.subscriber.connect();

      logger.info('Redis connections established');
      return this.client;
    } catch (error) {
      logger.error('Failed to connect to Redis', { error: error.message });
      throw error;
    }
  }

  /**
   * Get value from Redis
   * @param {string} key
   * @returns {Promise<string|null>}
   */
  async get(key) {
    try {
      return await this.client.get(key);
    } catch (error) {
      logger.error('Redis GET error', { key, error: error.message });
      throw error;
    }
  }

  /**
   * Set value in Redis
   * @param {string} key
   * @param {string} value
   * @param {number} expirySeconds - Optional expiry in seconds
   * @returns {Promise<string>}
   */
  async set(key, value, expirySeconds = null) {
    try {
      if (expirySeconds) {
        return await this.client.setEx(key, expirySeconds, value);
      }
      return await this.client.set(key, value);
    } catch (error) {
      logger.error('Redis SET error', { key, error: error.message });
      throw error;
    }
  }

  /**
   * Delete key from Redis
   * @param {string} key
   * @returns {Promise<number>}
   */
  async del(key) {
    try {
      return await this.client.del(key);
    } catch (error) {
      logger.error('Redis DEL error', { key, error: error.message });
      throw error;
    }
  }

  /**
   * Set hash field
   * @param {string} key
   * @param {string} field
   * @param {string} value
   * @returns {Promise<number>}
   */
  async hSet(key, field, value) {
    try {
      return await this.client.hSet(key, field, value);
    } catch (error) {
      logger.error('Redis HSET error', { key, field, error: error.message });
      throw error;
    }
  }

  /**
   * Get hash field
   * @param {string} key
   * @param {string} field
   * @returns {Promise<string|null>}
   */
  async hGet(key, field) {
    try {
      return await this.client.hGet(key, field);
    } catch (error) {
      logger.error('Redis HGET error', { key, field, error: error.message });
      throw error;
    }
  }

  /**
   * Get all hash fields
   * @param {string} key
   * @returns {Promise<object>}
   */
  async hGetAll(key) {
    try {
      return await this.client.hGetAll(key);
    } catch (error) {
      logger.error('Redis HGETALL error', { key, error: error.message });
      throw error;
    }
  }

  /**
   * Delete hash field
   * @param {string} key
   * @param {string} field
   * @returns {Promise<number>}
   */
  async hDel(key, field) {
    try {
      return await this.client.hDel(key, field);
    } catch (error) {
      logger.error('Redis HDEL error', { key, field, error: error.message });
      throw error;
    }
  }

  /**
   * Publish message to channel
   * @param {string} channel
   * @param {object} message
   * @returns {Promise<number>}
   */
  async publish(channel, message) {
    try {
      const payload = JSON.stringify(message);
      const result = await this.publisher.publish(channel, payload);
      logger.info('Published message', { channel, subscribers: result });
      return result;
    } catch (error) {
      logger.error('Redis PUBLISH error', { channel, error: error.message });
      throw error;
    }
  }

  /**
   * Subscribe to channel
   * @param {string} channel
   * @param {Function} callback
   * @returns {Promise<void>}
   */
  async subscribe(channel, callback) {
    try {
      await this.subscriber.subscribe(channel, (message, ch) => {
        try {
          const payload = JSON.parse(message);
          callback(payload, ch);
        } catch (error) {
          logger.error('Error processing subscribed message', {
            channel: ch,
            error: error.message,
          });
        }
      });
      logger.info('Subscribed to channel', { channel });
    } catch (error) {
      logger.error('Redis SUBSCRIBE error', { channel, error: error.message });
      throw error;
    }
  }

  /**
   * Unsubscribe from channel
   * @param {string} channel
   * @returns {Promise<void>}
   */
  async unsubscribe(channel) {
    try {
      await this.subscriber.unsubscribe(channel);
      logger.info('Unsubscribed from channel', { channel });
    } catch (error) {
      logger.error('Redis UNSUBSCRIBE error', { channel, error: error.message });
      throw error;
    }
  }

  /**
   * Close all Redis connections
   * @returns {Promise<void>}
   */
  async disconnect() {
    try {
      if (this.client) await this.client.quit();
      if (this.publisher) await this.publisher.quit();
      if (this.subscriber) await this.subscriber.quit();
      logger.info('Redis connections closed');
    } catch (error) {
      logger.error('Error closing Redis connections', { error: error.message });
    }
  }
}

// Singleton instance
const redisClient = new RedisClient();

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Closing Redis connections...');
  await redisClient.disconnect();
  process.exit(0);
});

module.exports = redisClient;
