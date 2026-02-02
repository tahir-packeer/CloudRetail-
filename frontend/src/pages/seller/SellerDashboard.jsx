import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { Package, Plus, Edit, Trash2, TrendingUp, ShoppingBag, DollarSign } from 'lucide-react';

const SellerDashboard = () => {
  const [stats, setStats] = useState({ totalOrders: 0, totalSales: 0, averageOrderValue: 0 });
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      console.log('Fetching dashboard data...');
      const [productsRes, ordersRes, analyticsRes] = await Promise.all([
        api.get('/products/search?page=1&limit=100&seller=' + encodeURIComponent('me')), // Filter by current seller
        api.get('/orders/seller-orders'),
        api.get('/analytics/seller/me') // New endpoint for current seller
      ]);

      console.log('Orders response:', ordersRes.data);
      console.log('Orders data:', ordersRes.data.data);
      console.log('Orders array length:', ordersRes.data.data?.length);
      setProducts(productsRes.data.data || []);
      setOrders(ordersRes.data.data || []);
      setStats(analyticsRes.data.data || { totalOrders: 0, totalSales: 0, averageOrderValue: 0 });
    } catch (error) {
      console.error('Dashboard data error:', error);
      console.error('Error response:', error.response?.data);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const deleteProduct = async (productId) => {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
      await api.delete(`/products/${productId}`);
      toast.success('Product deleted');
      fetchDashboardData();
    } catch (error) {
      toast.error('Failed to delete product');
    }
  };

  const updateOrderStatus = async (orderId, status) => {
    try {
      await api.patch(`/orders/${orderId}/status`, { status });
      toast.success('Order status updated');
      fetchDashboardData();
    } catch (error) {
      toast.error('Failed to update order status');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Seller Dashboard</h1>
        <Link to="/seller/products/new" className="btn btn-primary flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Add Product
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Total Products</p>
              <p className="text-3xl font-bold mt-1">{products.length}</p>
            </div>
            <Package className="h-12 w-12 text-primary-600 opacity-20" />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Total Orders</p>
              <p className="text-3xl font-bold mt-1">{stats.totalOrders || 0}</p>
            </div>
            <ShoppingBag className="h-12 w-12 text-green-600 opacity-20" />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Total Revenue</p>
              <p className="text-3xl font-bold mt-1">LKR {stats.totalSales || '0.00'}</p>
            </div>
            <DollarSign className="h-12 w-12 text-yellow-600 opacity-20" />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Avg Order Value</p>
              <p className="text-3xl font-bold mt-1">LKR {stats.averageOrderValue || '0.00'}</p>
            </div>
            <TrendingUp className="h-12 w-12 text-blue-600 opacity-20" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b mb-6">
        <nav className="flex gap-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-4 font-medium ${
              activeTab === 'overview'
                ? 'border-b-2 border-primary-600 text-primary-600'
                : 'text-gray-600'
            }`}
          >
            Products
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`pb-4 font-medium ${
              activeTab === 'orders'
                ? 'border-b-2 border-primary-600 text-primary-600'
                : 'text-gray-600'
            }`}
          >
            Orders
          </button>
        </nav>
      </div>

      {/* Products Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          {products.length === 0 ? (
            <div className="card text-center py-12">
              <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">No products yet</p>
              <Link to="/seller/products/new" className="btn btn-primary">
                Add Your First Product
              </Link>
            </div>
          ) : (
            products.map((product) => (
              <div key={product.id} className="card flex gap-4">
                <div className="w-24 h-24 bg-gray-200 rounded-lg flex-shrink-0 overflow-hidden">
                  {product.images?.[0] ? (
                    <img 
                      src={product.images[0]} 
                      alt={product.name}
                      className="w-full h-full object-cover object-center rounded-lg"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.parentElement.innerHTML = '<div class="w-full h-full flex items-center justify-center text-gray-400 text-xs">No Image</div>';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                      No Image
                    </div>
                  )}
                </div>

                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{product.name}</h3>
                  <p className="text-gray-600 text-sm mb-2">{product.categoryName}</p>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-primary-600 font-bold">LKR {product.price}</span>
                    <span className="text-gray-600">Stock: {product.stock || product.stockQuantity || 0}</span>
                    <span className={`badge ${product.status === 'active' ? 'badge-success' : 'badge-warning'}`}>
                      {product.status}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    to={`/seller/products/${product.id}/edit`}
                    className="btn btn-secondary"
                  >
                    <Edit className="h-4 w-4" />
                  </Link>
                  <button
                    onClick={() => deleteProduct(product.id)}
                    className="btn btn-danger"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Orders Tab */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          {orders.length === 0 ? (
            <div className="card text-center py-12">
              <ShoppingBag className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No orders yet</p>
            </div>
          ) : (
            orders.map((order) => (
              <div key={order.id} className="card">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-semibold">Order #{order.id}</h3>
                    <p className="text-sm text-gray-600">{order.buyerName}</p>
                  </div>
                  <span className={`badge ${
                    order.status === 'delivered' ? 'badge-success' :
                    order.status === 'cancelled' ? 'badge-danger' :
                    'badge-warning'
                  }`}>
                    {order.status}
                  </span>
                </div>

                <div className="text-sm text-gray-600 mb-4">
                  <p>Items: {order.items?.length || 0}</p>
                  <p>Total: LKR {order.totalAmount || order.total}</p>
                  <p>Shipping: {
                    typeof order.shippingAddress === 'object' 
                      ? `${order.shippingAddress.line1}, ${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.postalCode}`
                      : order.shippingAddress
                  }</p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => updateOrderStatus(order.id, 'processing')}
                    disabled={order.status !== 'pending'}
                    className="btn btn-secondary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Process
                  </button>
                  <button
                    onClick={() => updateOrderStatus(order.id, 'shipped')}
                    disabled={order.status !== 'processing'}
                    className="btn btn-secondary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Ship
                  </button>
                  <button
                    onClick={() => updateOrderStatus(order.id, 'delivered')}
                    disabled={order.status !== 'shipped'}
                    className="btn btn-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Deliver
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default SellerDashboard;
