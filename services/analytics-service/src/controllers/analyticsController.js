const { createLogger } = require('@cloudretail/shared');
const Analytics = require('../models/Analytics');

const logger = createLogger('analytics-controller');

/**
 * Get dashboard metrics
 */
const getDashboard = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Default to last 30 days if not provided
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const startDateStr = start.toISOString().split('T')[0];
    const endDateStr = end.toISOString().split('T')[0];

    const metrics = await Analytics.getDashboardMetrics(startDateStr, endDateStr);
    const dailySales = await Analytics.getDailySalesData(startDateStr, endDateStr);

    res.json({
      success: true,
      data: {
        summary: metrics,
        dailySales,
        period: {
          startDate: startDateStr,
          endDate: endDateStr,
        },
      },
    });
  } catch (error) {
    logger.error('Get dashboard error', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to get dashboard metrics',
    });
  }
};

/**
 * Get sales data for charts
 */
const getSalesData = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const startDateStr = start.toISOString().split('T')[0];
    const endDateStr = end.toISOString().split('T')[0];

    const salesData = await Analytics.getDailySalesData(startDateStr, endDateStr);

    res.json({
      success: true,
      data: salesData,
    });
  } catch (error) {
    logger.error('Get sales data error', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to get sales data',
    });
  }
};

/**
 * Get top products
 */
const getTopProducts = async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;

    const products = await Analytics.getTopProducts(limit);

    res.json({
      success: true,
      data: products,
    });
  } catch (error) {
    logger.error('Get top products error', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to get top products',
    });
  }
};

/**
 * Get current seller's metrics (for logged-in seller)
 */
const getMySellerMetrics = async (req, res) => {
  try {
    const sellerId = req.user.userId;

    const metrics = await Analytics.getSellerMetrics(sellerId);

    res.json({
      success: true,
      data: metrics || {
        totalOrders: 0,
        totalSales: 0,
        averageOrderValue: 0,
        totalProducts: 0,
      },
    });
  } catch (error) {
    logger.error('Get my seller metrics error', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to get seller metrics',
    });
  }
};

/**
 * Get current seller's sales data over time (for graphs)
 */
const getMySellerSalesData = async (req, res) => {
  try {
    const sellerId = req.user.userId;
    const { startDate, endDate } = req.query;

    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const startDateStr = start.toISOString().split('T')[0];
    const endDateStr = end.toISOString().split('T')[0];

    const salesData = await Analytics.getSellerSalesData(sellerId, startDateStr, endDateStr);

    res.json({
      success: true,
      data: salesData,
      period: {
        startDate: startDateStr,
        endDate: endDateStr,
      },
    });
  } catch (error) {
    logger.error('Get my seller sales data error', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to get seller sales data',
    });
  }
};

/**
 * Get seller metrics
 */
const getSellerMetrics = async (req, res) => {
  try {
    const { sellerId } = req.params;
    const userRole = req.user.role;
    const userId = req.user.userId;

    // Only allow sellers to view their own metrics, or admins to view any
    if (userRole === 'seller' && parseInt(sellerId) !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    const metrics = await Analytics.getSellerMetrics(sellerId);

    if (!metrics) {
      return res.status(404).json({
        success: false,
        message: 'Seller metrics not found',
      });
    }

    res.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    logger.error('Get seller metrics error', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to get seller metrics',
    });
  }
};

/**
 * Get top sellers (admin only)
 */
const getTopSellers = async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;

    const sellers = await Analytics.getTopSellers(limit);

    res.json({
      success: true,
      data: sellers,
    });
  } catch (error) {
    logger.error('Get top sellers error', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to get top sellers',
    });
  }
};

/**
 * Refresh metrics from live data (admin only)
 */
const refreshMetrics = async (req, res) => {
  try {
    const authToken = req.headers.authorization;

    logger.info('Starting metrics refresh...');
    const result = await Analytics.refreshMetrics(authToken);

    logger.info('Metrics refresh completed', result);

    res.json({
      success: true,
      message: 'Metrics refreshed successfully',
      data: result,
    });
  } catch (error) {
    logger.error('Refresh metrics error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Failed to refresh metrics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

module.exports = {
  getDashboard,
  getSalesData,
  getTopProducts,
  getMySellerMetrics,
  getSellerMetrics,  getMySellerSalesData,  getTopSellers,
  refreshMetrics,
};
