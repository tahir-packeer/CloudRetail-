const { redisClient, database } = require('@cloudretail/shared');

const CART_PREFIX = 'cart:';
const CART_TTL = 7 * 24 * 60 * 60; // 7 days in seconds
const DB_NAME = process.env.DB_NAME_CATALOG || 'catalog_db';

// In-memory fallback storage when Redis is not available
const memoryStorage = new Map();

class Cart {
  /**
   * Check if Redis is available
   */
  static isRedisAvailable() {
    return redisClient && redisClient.isConnected && redisClient.isConnected();
  }

  /**
   * Generate cart key for Redis
   */
  static getCartKey(userId) {
    return `${CART_PREFIX}${userId}`;
  }

  /**
   * Get cart data from storage (Redis or memory)
   */
  static async getCartData(userId) {
    const cartKey = this.getCartKey(userId);
    
    if (this.isRedisAvailable()) {
      return await redisClient.hGetAll(cartKey);
    } else {
      // Use in-memory storage
      return memoryStorage.get(cartKey) || {};
    }
  }

  /**
   * Set cart item in storage
   */
  static async setCartItem(userId, productId, data) {
    const cartKey = this.getCartKey(userId);
    
    if (this.isRedisAvailable()) {
      await redisClient.hSet(cartKey, productId.toString(), JSON.stringify(data));
      await redisClient.expire(cartKey, CART_TTL);
    } else {
      // Use in-memory storage
      const cart = memoryStorage.get(cartKey) || {};
      cart[productId.toString()] = JSON.stringify(data);
      memoryStorage.set(cartKey, cart);
    }
  }

  /**
   * Delete cart item from storage
   */
  static async deleteCartItem(userId, productId) {
    const cartKey = this.getCartKey(userId);
    
    if (this.isRedisAvailable()) {
      await redisClient.hDel(cartKey, productId.toString());
    } else {
      // Use in-memory storage
      const cart = memoryStorage.get(cartKey);
      if (cart) {
        delete cart[productId.toString()];
        memoryStorage.set(cartKey, cart);
      }
    }
  }

  /**
   * Delete entire cart from storage
   */
  static async deleteCart(userId) {
    const cartKey = this.getCartKey(userId);
    
    if (this.isRedisAvailable()) {
      await redisClient.del(cartKey);
    } else {
      // Use in-memory storage
      memoryStorage.delete(cartKey);
    }
  }

  /**
   * Get cart items for user
   */
  static async getCart(userId) {
    const cartData = await this.getCartData(userId);

    if (!cartData || Object.keys(cartData).length === 0) {
      return { items: [], total: 0, itemCount: 0 };
    }

    // Parse cart items and enrich with product data
    const items = await Promise.all(
      Object.entries(cartData).map(async ([productId, data]) => {
        const item = JSON.parse(data);
        
        // Fetch current product data
        const product = await this.getProductData(parseInt(productId));
        
        if (!product) {
          // Product no longer exists, remove from cart
          await this.removeItem(userId, parseInt(productId));
          return null;
        }

        return {
          productId: parseInt(productId),
          quantity: item.quantity,
          product: {
            name: product.name,
            slug: product.slug,
            price: product.price,
            stock: product.stock,
            status: product.status,
            imageUrl: product.imageUrl,
            sellerId: product.seller_id || product.sellerId,
          },
          subtotal: product.price * item.quantity,
          addedAt: item.addedAt,
        };
      })
    );

    // Filter out null items (deleted products)
    const validItems = items.filter(item => item !== null);
    
    const total = validItems.reduce((sum, item) => sum + item.subtotal, 0);
    const itemCount = validItems.reduce((sum, item) => sum + item.quantity, 0);

    return { items: validItems, total, itemCount };
  }

  /**
   * Add item to cart
   */
  static async addItem(userId, productId, quantity) {
    // Validate product exists and has stock
    const product = await this.getProductData(productId);
    
    if (!product) {
      throw new Error('Product not found');
    }

    if (product.status !== 'active') {
      throw new Error('Product is not available');
    }

    // Get current cart item
    const cartData = await this.getCartData(userId);
    const existingData = cartData[productId.toString()];
    
    let newQuantity = quantity;
    if (existingData) {
      const existing = JSON.parse(existingData);
      newQuantity = existing.quantity + quantity;
    }

    // Check stock availability
    if (newQuantity > product.stock) {
      throw new Error(`Only ${product.stock} items available in stock`);
    }

    // Update cart
    const itemData = {
      quantity: newQuantity,
      addedAt: existingData ? JSON.parse(existingData).addedAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await this.setCartItem(userId, productId, itemData);

    return this.getCart(userId);
  }

  /**
   * Update item quantity
   */
  static async updateItem(userId, productId, quantity) {
    if (quantity <= 0) {
      return this.removeItem(userId, productId);
    }

    // Validate product and stock
    const product = await this.getProductData(productId);
    
    if (!product) {
      throw new Error('Product not found');
    }

    if (quantity > product.stock) {
      throw new Error(`Only ${product.stock} items available in stock`);
    }

    const cartData = await this.getCartData(userId);
    const existingData = cartData[productId.toString()];
    
    if (!existingData) {
      throw new Error('Item not in cart');
    }

    const existing = JSON.parse(existingData);
    const itemData = {
      quantity,
      addedAt: existing.addedAt,
      updatedAt: new Date().toISOString(),
    };

    await this.setCartItem(userId, productId, itemData);

    return this.getCart(userId);
  }

  /**
   * Remove item from cart
   */
  static async removeItem(userId, productId) {
    await this.deleteCartItem(userId, productId);
    return this.getCart(userId);
  }

  /**
   * Clear entire cart
   */
  static async clearCart(userId) {
    await this.deleteCart(userId);
    return { items: [], total: 0, itemCount: 0 };
  }

  /**
   * Merge guest cart into user cart (when user logs in)
   */
  static async mergeCart(guestUserId, loggedInUserId) {
    const guestCart = await this.getCartData(guestUserId);
    
    if (!guestCart || Object.keys(guestCart).length === 0) {
      return this.getCart(loggedInUserId);
    }

    // Merge items
    for (const [productId, data] of Object.entries(guestCart)) {
      const guestItem = JSON.parse(data);
      const userCart = await this.getCartData(loggedInUserId);
      const existingData = userCart[productId];
      
      if (existingData) {
        // Merge quantities
        const existing = JSON.parse(existingData);
        const product = await this.getProductData(parseInt(productId));
        
        if (product) {
          const newQuantity = Math.min(
            existing.quantity + guestItem.quantity,
            product.stock
          );
          
          await this.setCartItem(loggedInUserId, parseInt(productId), {
            quantity: newQuantity,
            addedAt: existing.addedAt, // Keep original addedAt
            updatedAt: new Date().toISOString(),
          });
        }
      } else {
        // Add guest item to user cart
        await this.setCartItem(loggedInUserId, parseInt(productId), guestItem);
      }
    }

    // Delete guest cart
    await this.deleteCart(guestUserId);

    return this.getCart(loggedInUserId);
  }

  /**
   * Get product data from catalog database
   */
  static async getProductData(productId) {
    const query = `
      SELECT 
        p.id, p.name, p.slug, p.price, p.stock, p.status,
        pi.image_url as image_url
      FROM products p
      LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_primary = 1
      WHERE p.id = ?
      LIMIT 1
    `;

    const results = await database.query(DB_NAME, query, [productId]);
    
    if (results.length === 0) {
      return null;
    }

    const row = results[0];
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      price: parseFloat(row.price),
      stock: row.stock,
      status: row.status,
      imageUrl: row.image_url || '/uploads/products/placeholder.jpg',
    };
  }

  /**
   * Validate cart before checkout
   */
  static async validateCart(userId) {
    const cart = await this.getCart(userId);
    const errors = [];

    for (const item of cart.items) {
      const product = await this.getProductData(item.productId);

      if (!product) {
        errors.push({
          productId: item.productId,
          error: 'Product no longer available',
        });
        continue;
      }

      if (product.status !== 'active') {
        errors.push({
          productId: item.productId,
          error: 'Product is no longer active',
        });
      }

      if (item.quantity > product.stock) {
        errors.push({
          productId: item.productId,
          error: `Only ${product.stock} items in stock, but cart has ${item.quantity}`,
        });
      }

      if (product.price !== item.product.price) {
        errors.push({
          productId: item.productId,
          error: `Price changed from ${item.product.price} to ${product.price}`,
          newPrice: product.price,
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      cart,
    };
  }
}

module.exports = Cart;
