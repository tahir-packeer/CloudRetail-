const { database } = require('@cloudretail/shared');
const axios = require('axios');

const DB_NAME = process.env.DB_NAME_ANALYTICS || 'analytics_db';
const ORDER_SERVICE_URL = process.env.ORDER_SERVICE_URL || 'http://localhost:3004';
const PAYMENT_SERVICE_URL = process.env.PAYMENT_SERVICE_URL || 'http://localhost:3005';

class Analytics {
  /**
   * Get platform dashboard metrics (calculated from live order data)
   */
  static async getDashboardMetrics(startDate, endDate) {
    const ORDER_DB = 'order_db';
    
    // Get total orders and revenue
    const query = `
      SELECT 
        COUNT(*) as total_orders,
        COALESCE(SUM(total), 0) as total_revenue,
        COALESCE(AVG(total), 0) as avg_order_value,
        COUNT(DISTINCT buyer_id) as total_customers
      FROM orders
      WHERE status != 'cancelled'
        AND DATE(created_at) BETWEEN ? AND ?
    `;

    const results = await database.query(ORDER_DB, query, [startDate, endDate]);
    const metrics = results[0];

    return {
      totalOrders: parseInt(metrics.total_orders) || 0,
      totalRevenue: parseFloat(metrics.total_revenue) || 0,
      averageOrderValue: parseFloat(metrics.avg_order_value) || 0,
      totalCustomers: parseInt(metrics.total_customers) || 0,
    };
  }

  /**
   * Get daily sales data for charts (calculated from live order data)
   */
  static async getDailySalesData(startDate, endDate) {
    const ORDER_DB = 'order_db';
    
    const query = `
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as total_orders,
        COALESCE(SUM(total), 0) as total_revenue,
        COALESCE(AVG(total), 0) as average_order_value
      FROM orders
      WHERE status != 'cancelled'
        AND DATE(created_at) BETWEEN ? AND ?
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;

    const results = await database.query(ORDER_DB, query, [startDate, endDate]);
    return results.map(row => ({
      date: row.date.toISOString().split('T')[0], // Format as YYYY-MM-DD
      totalOrders: parseInt(row.total_orders),
      totalRevenue: parseFloat(row.total_revenue),
      averageOrderValue: parseFloat(row.average_order_value),
    }));
  }

  /**
   * Get top selling products (calculated from live order data)
   */
  static async getTopProducts(limit = 10) {
    const ORDER_DB = 'order_db';
    
    const query = `
      SELECT 
        oi.product_id,
        oi.product_name as productName,
        COUNT(DISTINCT o.id) as total_orders,
        SUM(oi.quantity) as total_quantity,
        COALESCE(SUM(oi.subtotal), 0) as total_sales
      FROM order_items oi
      INNER JOIN orders o ON oi.order_id = o.id
      WHERE o.status != 'cancelled'
      GROUP BY oi.product_id, oi.product_name
      ORDER BY total_sales DESC
      LIMIT ${parseInt(limit)}
    `;

    const results = await database.query(ORDER_DB, query, []);
    return results.map(row => ({
      productId: row.product_id,
      productName: row.productName,
      totalOrders: parseInt(row.total_orders) || 0,
      totalQuantity: parseInt(row.total_quantity) || 0,
      totalSales: parseFloat(row.total_sales) || 0,
    }));
  }

  /**
   * Get seller performance metrics (calculated live from order data)
   */
  static async getSellerMetrics(sellerId) {
    // Get metrics directly from order database
    const query = `
      SELECT 
        COUNT(DISTINCT o.id) as total_orders,
        COALESCE(SUM(oi.subtotal), 0) as total_sales,
        COALESCE(AVG(o.total), 0) as avg_order_value,
        COUNT(DISTINCT oi.product_id) as total_products
      FROM orders o
      INNER JOIN order_items oi ON o.id = oi.order_id
      WHERE oi.seller_id = ?
        AND o.status != 'cancelled'
    `;

    const ORDER_DB = 'order_db';
    const results = await database.query(ORDER_DB, query, [sellerId]);
    
    if (results.length === 0) {
      return {
        sellerId: parseInt(sellerId),
        totalSales: 0,
        totalOrders: 0,
        averageOrderValue: 0,
        totalProducts: 0,
      };
    }

    const row = results[0];
    return {
      sellerId: parseInt(sellerId),
      totalSales: parseFloat(row.total_sales) || 0,
      totalOrders: parseInt(row.total_orders) || 0,
      averageOrderValue: parseFloat(row.avg_order_value) || 0,
      totalProducts: parseInt(row.total_products) || 0,
    };
  }

  /**
   * Get seller sales data over time for charts
   */
  static async getSellerSalesData(sellerId, startDate, endDate) {
    const query = `
      SELECT 
        DATE(o.created_at) as date,
        COUNT(DISTINCT o.id) as orders,
        COALESCE(SUM(oi.subtotal), 0) as revenue
      FROM orders o
      INNER JOIN order_items oi ON o.id = oi.order_id
      WHERE oi.seller_id = ?
        AND o.status != 'cancelled'
        AND DATE(o.created_at) BETWEEN ? AND ?
      GROUP BY DATE(o.created_at)
      ORDER BY date ASC
    `;

    const ORDER_DB = 'order_db';
    const results = await database.query(ORDER_DB, query, [sellerId, startDate, endDate]);
    return results.map(row => ({
      date: row.date,
      orders: parseInt(row.orders),
      revenue: parseFloat(row.revenue),
    }));
  }

  /**
   * Get all sellers ranked by revenue (calculated from live order data)
   */
  static async getTopSellers(limit = 10) {
    const ORDER_DB = 'order_db';
    
    const query = `
      SELECT 
        oi.seller_id,
        COUNT(DISTINCT o.id) as total_orders,
        COALESCE(SUM(oi.subtotal), 0) as total_sales,
        COUNT(DISTINCT oi.product_id) as total_products
      FROM order_items oi
      INNER JOIN orders o ON oi.order_id = o.id
      WHERE o.status != 'cancelled'
      GROUP BY oi.seller_id
      ORDER BY total_sales DESC
      LIMIT ${parseInt(limit)}
    `;

    const results = await database.query(ORDER_DB, query, []);
    
    // Fetch seller names from auth service
    const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
    const sellersWithNames = await Promise.all(
      results.map(async (row) => {
        try {
          const response = await axios.get(`${AUTH_SERVICE_URL}/api/auth/users/${row.seller_id}`);
          const sellerName = response.data.data?.name || `Seller ${row.seller_id}`;
          return {
            sellerId: row.seller_id,
            sellerName: sellerName,
            totalSales: parseFloat(row.total_sales) || 0,
            totalOrders: parseInt(row.total_orders) || 0,
            totalProducts: parseInt(row.total_products) || 0,
          };
        } catch (error) {
          return {
            sellerId: row.seller_id,
            sellerName: `Seller ${row.seller_id}`,
            totalSales: parseFloat(row.total_sales) || 0,
            totalOrders: parseInt(row.total_orders) || 0,
            totalProducts: parseInt(row.total_products) || 0,
          };
        }
      })
    );
    
    return sellersWithNames;
  }

  /**
   * Refresh metrics from live data (for development/testing)
   * In production, this would be run as a scheduled job
   */
  static async refreshMetrics(authToken) {
    try {
      // For now, just return success - in production this would fetch from Order Service
      // or listen to events via Redis pub/sub
      
      // Get existing orders from database directly (if Order Service shared the DB)
      // For MVP, we'll just ensure tables exist and return success
      
      return {
        dailySalesUpdated: 0,
        productsUpdated: 0,
        sellersUpdated: 0,
        message: 'Metrics refresh not yet implemented - requires Order Service integration or event streaming',
      };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = Analytics;
