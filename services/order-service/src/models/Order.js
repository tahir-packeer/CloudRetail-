const { database } = require('@cloudretail/shared');
const { v4: uuidv4 } = require('uuid');

const DB_NAME = process.env.DB_NAME_ORDER || 'order_db';

class Order {
  /**
   * Create new order
   */
  static async create(orderData) {
    const {
      userId,
      items,
      subtotal,
      tax,
      shippingCost,
      total,
      shippingAddress,
      billingAddress,
      paymentMethod,
    } = orderData;

    // Generate unique order number
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    const orderQuery = `
      INSERT INTO orders (
        order_number, buyer_id, status, payment_status,
        subtotal, tax, shipping_cost, total,
        shipping_address_line1, shipping_address_line2, shipping_city,
        shipping_state, shipping_postal_code, shipping_country,
        payment_method
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const result = await database.query(DB_NAME, orderQuery, [
      orderNumber,
      userId,
      'pending',
      'pending',
      subtotal,
      tax,
      shippingCost,
      total,
      shippingAddress.line1,
      shippingAddress.line2 || null,
      shippingAddress.city,
      shippingAddress.state,
      shippingAddress.postalCode,
      shippingAddress.country,
      paymentMethod,
    ]);

    const orderId = result.insertId;

    // Insert order items
    for (const item of items) {
      await this.addOrderItem(orderId, item);
    }

    // Add status history
    await this.addStatusHistory(orderId, 'pending', 'Order created');

    return this.findById(orderId);
  }

  /**
   * Add order item
   */
  static async addOrderItem(orderId, item) {
    const query = `
      INSERT INTO order_items (
        order_id, product_id, seller_id, product_name, quantity, unit_price, subtotal
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    await database.query(DB_NAME, query, [
      orderId,
      item.productId,
      item.sellerId,
      item.productName || '',
      item.quantity,
      item.unitPrice,
      item.subtotal,
    ]);
  }

  /**
   * Add status history entry
   */
  static async addStatusHistory(orderId, newStatus, notes = null, oldStatus = null) {
    const query = `
      INSERT INTO order_status_history (order_id, old_status, new_status, notes)
      VALUES (?, ?, ?, ?)
    `;

    await database.query(DB_NAME, query, [orderId, oldStatus, newStatus, notes]);
  }

  /**
   * Find order by ID
   */
  static async findById(orderId) {
    const query = `
      SELECT * FROM orders WHERE id = ?
    `;

    const results = await database.query(DB_NAME, query, [orderId]);
    if (results.length === 0) return null;

    const order = this.mapOrderFromDB(results[0]);

    // Get order items
    order.items = await this.getOrderItems(orderId);

    return order;
  }

  /**
   * Find order by order number
   */
  static async findByOrderNumber(orderNumber) {
    const query = `
      SELECT * FROM orders WHERE order_number = ?
    `;

    const results = await database.query(DB_NAME, query, [orderNumber]);
    if (results.length === 0) return null;

    const order = this.mapOrderFromDB(results[0]);
    order.items = await this.getOrderItems(order.id);

    return order;
  }

  /**
   * Get order items
   */
  static async getOrderItems(orderId) {
    const query = `
      SELECT oi.*, p.name as product_name, p.slug as product_slug
      FROM order_items oi
      LEFT JOIN catalog_db.products p ON oi.product_id = p.id
      WHERE oi.order_id = ?
    `;

    const items = await database.query(DB_NAME, query, [orderId]);
    return items.map(item => ({
      id: item.id,
      productId: item.product_id,
      productName: item.product_name,
      productSlug: item.product_slug,
      sellerId: item.seller_id,
      quantity: item.quantity,
      unitPrice: parseFloat(item.unit_price),
      subtotal: parseFloat(item.subtotal),
    }));
  }

  /**
   * Get user orders
   */
  static async findByUserId(userId, options = {}) {
    const { page = 1, limit = 20, status = null } = options;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE buyer_id = ?';
    const params = [userId];

    if (status) {
      whereClause += ' AND status = ?';
      params.push(status);
    }

    // Count total
    const countQuery = `SELECT COUNT(*) as total FROM orders ${whereClause}`;
    const countResult = await database.query(DB_NAME, countQuery, params);
    const total = countResult[0].total;

    // Get orders
    const ordersQuery = `
      SELECT * FROM orders
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}
    `;

    const orders = await database.query(DB_NAME, ordersQuery, params);

    const ordersWithItems = await Promise.all(
      orders.map(async order => {
        const mappedOrder = this.mapOrderFromDB(order);
        mappedOrder.items = await this.getOrderItems(order.id);
        return mappedOrder;
      })
    );

    return {
      data: ordersWithItems,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Update order status
   */
  static async updateStatus(orderId, newStatus, notes = null) {
    // Get current order to track old status
    const currentOrder = await this.findById(orderId);
    const oldStatus = currentOrder ? currentOrder.status : null;

    const query = `
      UPDATE orders
      SET status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    await database.query(DB_NAME, query, [newStatus, orderId]);
    await this.addStatusHistory(orderId, newStatus, notes, oldStatus);

    return this.findById(orderId);
  }

  /**
   * Update payment status
   */
  static async updatePaymentStatus(orderId, paymentStatus, paymentIntentId = null) {
    const query = `
      UPDATE orders
      SET payment_status = ?, payment_id = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    await database.query(DB_NAME, query, [paymentStatus, paymentIntentId, orderId]);

    return this.findById(orderId);
  }

  /**
   * Get order status history
   */
  static async getStatusHistory(orderId) {
    const query = `
      SELECT * FROM order_status_history
      WHERE order_id = ?
      ORDER BY created_at ASC
    `;

    const history = await database.query(DB_NAME, query, [orderId]);
    return history.map(h => ({
      id: h.id,
      oldStatus: h.old_status,
      newStatus: h.new_status,
      notes: h.notes,
      createdAt: h.created_at,
    }));
  }

  /**
   * Get seller orders
   */
  static async findBySellerId(sellerId, options = {}) {
    const { page = 1, limit = 20, status = null } = options;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE oi.seller_id = ?';
    const params = [sellerId];

    if (status) {
      whereClause += ' AND o.status = ?';
      params.push(status);
    }

    // Count total
    const countQuery = `
      SELECT COUNT(DISTINCT o.id) as total
      FROM orders o
      INNER JOIN order_items oi ON o.id = oi.order_id
      ${whereClause}
    `;
    const countResult = await database.query(DB_NAME, countQuery, params);
    const total = countResult[0].total;

    // Get orders
    const ordersQuery = `
      SELECT DISTINCT o.*
      FROM orders o
      INNER JOIN order_items oi ON o.id = oi.order_id
      ${whereClause}
      ORDER BY o.created_at DESC
      LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}
    `;

    const orders = await database.query(DB_NAME, ordersQuery, params);

    const ordersWithItems = await Promise.all(
      orders.map(async order => {
        const mappedOrder = this.mapOrderFromDB(order);
        // Get only this seller's items
        const allItems = await this.getOrderItems(order.id);
        mappedOrder.items = allItems.filter(item => item.sellerId === sellerId);
        return mappedOrder;
      })
    );

    return {
      data: ordersWithItems,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Map database row to order object
   */
  static mapOrderFromDB(row) {
    return {
      id: row.id,
      orderNumber: row.order_number,
      userId: row.buyer_id,
      status: row.status,
      paymentStatus: row.payment_status,
      paymentIntentId: row.payment_id,
      subtotal: parseFloat(row.subtotal),
      tax: parseFloat(row.tax),
      shippingCost: parseFloat(row.shipping_cost),
      total: parseFloat(row.total),
      shippingAddress: {
        line1: row.shipping_address_line1,
        line2: row.shipping_address_line2,
        city: row.shipping_city,
        state: row.shipping_state,
        postalCode: row.shipping_postal_code,
        country: row.shipping_country,
      },
      paymentMethod: row.payment_method,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

module.exports = Order;
