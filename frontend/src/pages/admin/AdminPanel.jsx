import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { Users, ShoppingBag, DollarSign, TrendingUp, Check, X, UserCheck } from 'lucide-react';
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';

const AdminPanel = () => {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [timeRange, setTimeRange] = useState('30'); // days
  const [salesData, setSalesData] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [topSellers, setTopSellers] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, [timeRange]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      
      if (timeRange === 'all') {
        startDate.setFullYear(2020, 0, 1); // Start from 2020
      } else {
        startDate.setDate(startDate.getDate() - parseInt(timeRange));
      }

      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      const [usersRes, analyticsRes, salesRes, productsRes, sellersRes] = await Promise.all([
        api.get('/auth/users'),
        api.get(`/analytics/dashboard?startDate=${startDateStr}&endDate=${endDateStr}`),
        api.get(`/analytics/sales?startDate=${startDateStr}&endDate=${endDateStr}`),
        api.get('/analytics/products/top?limit=5'),
        api.get('/analytics/sellers/top?limit=5')
      ]);

      console.log('Analytics response:', analyticsRes.data);
      const allUsers = usersRes.data.data || [];
      setUsers(allUsers);
      setSellers(allUsers.filter(u => u.role === 'seller'));
      setStats(analyticsRes.data.data.summary || {});
      setSalesData(salesRes.data.data || []);
      setTopProducts(productsRes.data.data || []);
      setTopSellers(sellersRes.data.data || []);
    } catch (error) {
      console.error('Admin dashboard error:', error);
      toast.error('Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  const updateUserStatus = async (userId, status) => {
    try {
      await api.patch(`/auth/users/${userId}/status`, { status });
      toast.success(`User ${status === 'active' ? 'activated' : 'deactivated'} successfully`);
      fetchDashboardData();
    } catch (error) {
      console.error('Update status error:', error);
      toast.error(error.response?.data?.message || 'Failed to update user status');
    }
  };

  const verifySeller = async (sellerId) => {
    try {
      await api.patch(`/auth/users/${sellerId}/verify-seller`);
      toast.success('Seller verified successfully');
      fetchDashboardData();
    } catch (error) {
      console.error('Verify seller error:', error);
      toast.error(error.response?.data?.message || 'Failed to verify seller');
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
        <h1 className="text-3xl font-bold">Admin Panel</h1>
        
        {/* Time Range Filter */}
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Time Range:</label>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="1">Today</option>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="all">All time</option>
          </select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Total Users</p>
              <p className="text-3xl font-bold mt-1">{users.length}</p>
            </div>
            <Users className="h-12 w-12 text-primary-600 opacity-20" />
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
              <p className="text-3xl font-bold mt-1">LKR {stats.totalRevenue || '0.00'}</p>
            </div>
            <DollarSign className="h-12 w-12 text-yellow-600 opacity-20" />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Avg Order Value</p>
              <p className="text-3xl font-bold mt-1">LKR {stats.avgOrderValue || '0.00'}</p>
            </div>
            <TrendingUp className="h-12 w-12 text-blue-600 opacity-20" />
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Sales Trend Chart */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Sales Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={salesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="totalRevenue" stroke="#8b5cf6" name="Revenue (LKR)" />
              <Line type="monotone" dataKey="totalOrders" stroke="#10b981" name="Orders" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Top Products Chart */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Top Products by Sales</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topProducts}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="productName" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="totalSales" fill="#8b5cf6" name="Total Sales (LKR)" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* User Role Distribution */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">User Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={[
                  { name: 'Buyers', value: users.filter(u => u.role === 'buyer').length },
                  { name: 'Sellers', value: users.filter(u => u.role === 'seller').length },
                  { name: 'Admins', value: users.filter(u => u.role === 'admin').length }
                ]}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                <Cell fill="#3b82f6" />
                <Cell fill="#10b981" />
                <Cell fill="#f59e0b" />
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Top Sellers Chart */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Top Sellers by Revenue</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topSellers} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="sellerName" type="category" width={100} />
              <Tooltip />
              <Legend />
              <Bar dataKey="totalSales" fill="#10b981" name="Total Sales (LKR)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b mb-6">
        <nav className="flex gap-8">`
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-4 font-medium ${
              activeTab === 'overview'
                ? 'border-b-2 border-primary-600 text-primary-600'
                : 'text-gray-600'
            }`}
          >
            Platform Overview
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`pb-4 font-medium ${
              activeTab === 'users'
                ? 'border-b-2 border-primary-600 text-primary-600'
                : 'text-gray-600'
            }`}
          >
            All Users
          </button>
          <button
            onClick={() => setActiveTab('sellers')}
            className={`pb-4 font-medium ${
              activeTab === 'sellers'
                ? 'border-b-2 border-primary-600 text-primary-600'
                : 'text-gray-600'
            }`}
          >
            Seller Verification
          </button>
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h2 className="text-xl font-bold mb-4">Recent Activity</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-gray-700">Active Buyers</span>
                <span className="font-bold">{users.filter(u => u.role === 'buyer' && u.status === 'active').length}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-gray-700">Active Sellers</span>
                <span className="font-bold">{sellers.filter(s => s.status === 'active').length}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-gray-700">Pending Verifications</span>
                <span className="font-bold text-yellow-600">
                  {sellers.filter(s => s.isVerified === false).length}
                </span>
              </div>
            </div>
          </div>

          <div className="card">
            <h2 className="text-xl font-bold mb-4">Sales Metrics</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-gray-700">Total Revenue</span>
                <span className="font-bold text-green-600">LKR {stats.totalRevenue || '0.00'}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-gray-700">Total Orders</span>
                <span className="font-bold">{stats.totalOrders || 0}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-gray-700">Average Order</span>
                <span className="font-bold">LKR {stats.avgOrderValue || '0.00'}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* All Users Tab */}
      {activeTab === 'users' && (
        <div className="card">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">Name</th>
                  <th className="text-left py-3 px-4">Email</th>
                  <th className="text-left py-3 px-4">Role</th>
                  <th className="text-left py-3 px-4">Status</th>
                  <th className="text-left py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">{user.firstName} {user.lastName}</td>
                    <td className="py-3 px-4">{user.email}</td>
                    <td className="py-3 px-4">
                      <span className={`badge ${
                        user.role === 'admin' ? 'badge-danger' :
                        user.role === 'seller' ? 'badge-warning' :
                        'badge-info'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`badge ${
                        user.status === 'active' ? 'badge-success' : 'badge-danger'
                      }`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {user.status === 'active' ? (
                        <button
                          onClick={() => updateUserStatus(user.id, 'inactive')}
                          className="text-red-600 hover:text-red-700 text-sm"
                        >
                          Deactivate
                        </button>
                      ) : (
                        <button
                          onClick={() => updateUserStatus(user.id, 'active')}
                          className="text-green-600 hover:text-green-700 text-sm"
                        >
                          Activate
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sellers Tab */}
      {activeTab === 'sellers' && (
        <div className="space-y-4">
          {sellers.length === 0 ? (
            <div className="card text-center py-12">
              <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No sellers registered yet</p>
            </div>
          ) : (
            sellers.map((seller) => (
              <div key={seller.id} className="card flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg">
                    {seller.firstName} {seller.lastName}
                  </h3>
                  <p className="text-sm text-gray-600">{seller.email}</p>
                  <p className="text-sm text-gray-600">{seller.phone}</p>
                  <div className="flex gap-2 mt-2">
                    <span className={`badge ${
                      seller.status === 'active' ? 'badge-success' : 'badge-danger'
                    }`}>
                      {seller.status}
                    </span>
                    <span className={`badge ${
                      seller.isVerified ? 'badge-success' : 'badge-warning'
                    }`}>
                      {seller.isVerified ? 'Verified' : 'Pending Verification'}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  {!seller.isVerified && (
                    <button
                      onClick={() => verifySeller(seller.id)}
                      className="btn btn-primary flex items-center gap-1"
                    >
                      <UserCheck className="h-4 w-4" />
                      Verify
                    </button>
                  )}
                  {seller.status === 'active' ? (
                    <button
                      onClick={() => updateUserStatus(seller.id, 'inactive')}
                      className="btn btn-danger flex items-center gap-1"
                    >
                      <X className="h-4 w-4" />
                      Deactivate
                    </button>
                  ) : (
                    <button
                      onClick={() => updateUserStatus(seller.id, 'active')}
                      className="btn btn-primary flex items-center gap-1"
                    >
                      <Check className="h-4 w-4" />
                      Activate
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
