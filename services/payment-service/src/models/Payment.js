const { database } = require('@cloudretail/shared');

const DB_NAME = process.env.DB_NAME_PAYMENT || 'payment_db';

class Payment {
  /**
   * Create payment transaction record
   */
  static async create(paymentData) {
    const {
      orderId,
      userId,
      amount,
      currency,
      paymentMethod,
      paymentIntentId,
      status,
    } = paymentData;

    // Generate unique transaction ID
    const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    const query = `
      INSERT INTO payment_transactions (
        transaction_id, order_id, buyer_id, amount, currency, payment_method,
        provider_payment_intent_id, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const result = await database.query(DB_NAME, query, [
      transactionId,
      orderId,
      userId,
      amount,
      currency || 'USD',
      paymentMethod || 'card',
      paymentIntentId,
      status || 'pending',
    ]);

    return this.findById(result.insertId);
  }

  /**
   * Find payment by ID
   */
  static async findById(paymentId) {
    const query = `SELECT * FROM payment_transactions WHERE id = ?`;
    const results = await database.query(DB_NAME, query, [paymentId]);
    
    if (results.length === 0) return null;
    return this.mapFromDB(results[0]);
  }

  /**
   * Find payment by order ID
   */
  static async findByOrderId(orderId) {
    const query = `
      SELECT * FROM payment_transactions 
      WHERE order_id = ? 
      ORDER BY created_at DESC
    `;
    const results = await database.query(DB_NAME, query, [orderId]);
    return results.map(row => this.mapFromDB(row));
  }

  /**
   * Find payment by provider transaction ID (Stripe payment intent ID)
   */
  static async findByProviderTransactionId(providerTransactionId) {
    const query = `
      SELECT * FROM payment_transactions 
      WHERE provider_payment_intent_id = ?
    `;
    const results = await database.query(DB_NAME, query, [providerTransactionId]);
    
    if (results.length === 0) return null;
    return this.mapFromDB(results[0]);
  }

  /**
   * Update payment status
   */
  static async updateStatus(paymentId, status, metadata = null) {
    const query = `
      UPDATE payment_transactions
      SET status = ?, metadata = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    await database.query(DB_NAME, query, [
      status,
      metadata ? JSON.stringify(metadata) : null,
      paymentId,
    ]);

    return this.findById(paymentId);
  }

  /**
   * Link payment to order
   */
  static async linkToOrder(paymentId, orderId) {
    const query = `UPDATE payment_transactions SET order_id = ? WHERE id = ?`;
    await database.query(DB_NAME, query, [orderId, paymentId]);
  }

  /**
   * Create refund record
   */
  static async createRefund(refundData) {
    const {
      paymentTransactionId,
      amount,
      reason,
      providerRefundId,
      status,
    } = refundData;

    const query = `
      INSERT INTO payment_refunds (
        payment_transaction_id, amount, reason, 
        provider_refund_id, status
      ) VALUES (?, ?, ?, ?, ?)
    `;

    const result = await database.query(DB_NAME, query, [
      paymentTransactionId,
      amount,
      reason || null,
      providerRefundId,
      status || 'pending',
    ]);

    return this.findRefundById(result.insertId);
  }

  /**
   * Find refund by ID
   */
  static async findRefundById(refundId) {
    const query = `SELECT * FROM payment_refunds WHERE id = ?`;
    const results = await database.query(DB_NAME, query, [refundId]);
    
    if (results.length === 0) return null;
    return this.mapRefundFromDB(results[0]);
  }

  /**
   * Get refunds for payment transaction
   */
  static async getRefundsByPaymentId(paymentTransactionId) {
    const query = `
      SELECT * FROM payment_refunds 
      WHERE payment_transaction_id = ?
      ORDER BY created_at DESC
    `;
    const results = await database.query(DB_NAME, query, [paymentTransactionId]);
    return results.map(row => this.mapRefundFromDB(row));
  }

  /**
   * Get user payment history
   */
  static async getPaymentHistory(userId, options = {}) {
    const { page = 1, limit = 20, status = null } = options;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE buyer_id = ?';
    const params = [userId];

    if (status) {
      whereClause += ' AND status = ?';
      params.push(status);
    }

    // Count total
    const countQuery = `SELECT COUNT(*) as total FROM payment_transactions ${whereClause}`;
    const countResult = await database.query(DB_NAME, countQuery, params);
    const total = countResult[0].total;

    // Get payments
    const paymentsQuery = `
      SELECT * FROM payment_transactions
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}
    `;

    const payments = await database.query(DB_NAME, paymentsQuery, params);

    return {
      data: payments.map(p => this.mapFromDB(p)),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Map database row to payment object
   */
  static mapFromDB(row) {
    return {
      id: row.id,
      orderId: row.order_id,
      userId: row.buyer_id,
      amount: parseFloat(row.amount),
      currency: row.currency,
      paymentMethod: row.payment_method,
      providerTransactionId: row.provider_payment_intent_id,
      status: row.status,
      metadata: row.metadata ? JSON.parse(JSON.stringify(row.metadata)) : null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Map database row to refund object
   */
  static mapRefundFromDB(row) {
    return {
      id: row.id,
      paymentTransactionId: row.payment_transaction_id,
      amount: parseFloat(row.amount),
      reason: row.reason,
      providerRefundId: row.provider_refund_id,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

module.exports = Payment;
