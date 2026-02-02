import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { Search, ShoppingCart, Star, Filter } from 'lucide-react';

const Home = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearch, setActiveSearch] = useState(''); // The actual search query being used
  const [selectedCategory, setSelectedCategory] = useState('');
  const [page, setPage] = useState(1);
  const navigate = useNavigate();

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [page, selectedCategory, activeSearch]);

  const fetchCategories = async () => {
    try {
      const response = await api.get('/categories');
      setCategories(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: 12
      };
      if (selectedCategory) params.category = selectedCategory;
      if (activeSearch) params.q = activeSearch;

      const response = await api.get('/products/search', { params });
      setProducts(response.data.data || []);
    } catch (error) {
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setActiveSearch(searchQuery);
    setPage(1);
  };

  const addToCart = async (productId) => {
    try {
      await api.post('/cart/items', { productId, quantity: 1 });
      toast.success('Added to cart!');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add to cart');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-800 rounded-2xl p-8 md:p-12 mb-8 text-white">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">Welcome to CloudRetail</h1>
        <p className="text-xl mb-8">Discover amazing products from trusted sellers</p>
        
        {/* Search Bar */}
        <form onSubmit={handleSearch} className="flex gap-3 w-full">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for products..."
              className="w-full pl-12 pr-4 py-4 rounded-xl text-gray-900 text-lg focus:ring-4 focus:ring-white/30 transition-all"
            />
          </div>
          <button type="submit" className="btn bg-white text-primary-600 hover:bg-gray-100 px-10 py-4 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all">
            Search
          </button>
        </form>
      </div>

      {/* Filters */}
      <div className="mb-6 flex items-center gap-4">
        <Filter className="h-5 w-5 text-gray-600" />
        <select
          value={selectedCategory}
          onChange={(e) => {
            setSelectedCategory(e.target.value);
            setPage(1);
          }}
          className="input max-w-xs px-4 py-2.5 text-base"
        >
          <option value="">All Categories</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
        
        {(activeSearch || selectedCategory) && (
          <button
            onClick={() => {
              setSearchQuery('');
              setActiveSearch('');
              setSelectedCategory('');
              setPage(1);
            }}
            className="text-sm text-primary-600 hover:text-primary-700 underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Products Grid */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No products found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((product) => (
            <div key={product.id} className="card hover:shadow-xl transition-shadow duration-200">
              <div 
                className="aspect-square bg-gray-200 rounded-lg mb-4 overflow-hidden cursor-pointer"
                onClick={() => navigate(`/product/${product.id}`)}
              >
                {(product.images && product.images[0]) || product.imageUrl ? (
                  <img 
                    src={product.images?.[0] || product.imageUrl} 
                    alt={product.name}
                    className="w-full h-full object-cover object-center"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.parentElement.innerHTML = '<div class="w-full h-full flex items-center justify-center text-gray-400">No Image</div>';
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    No Image
                  </div>
                )}
              </div>
              
              <h3 
                className="font-semibold text-lg mb-2 cursor-pointer hover:text-primary-600"
                onClick={() => navigate(`/product/${product.id}`)}
              >
                {product.name}
              </h3>
              
              <div className="flex items-center mb-2">
                <Star className="h-4 w-4 text-yellow-400 fill-current" />
                <span className="ml-1 text-sm text-gray-600">
                  {product.rating || 'N/A'}
                </span>
                <span className="mx-2 text-gray-300">|</span>
                <span className="text-sm text-gray-600">
                  {product.stock} in stock
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-primary-600">
                  LKR {product.price}
                </span>
                <button
                  onClick={() => addToCart(product.id)}
                  disabled={product.stock === 0}
                  className="btn btn-primary flex items-center space-x-1"
                >
                  <ShoppingCart className="h-4 w-4" />
                  <span>Add</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {!loading && products.length > 0 && (
        <div className="mt-8 flex justify-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="btn btn-secondary"
          >
            Previous
          </button>
          <span className="px-4 py-2 text-gray-700">Page {page}</span>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={products.length < 12}
            className="btn btn-secondary"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default Home;
