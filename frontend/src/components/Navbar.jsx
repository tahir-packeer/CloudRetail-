import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShoppingCart, User, LogOut, LayoutDashboard, Package, BarChart3 } from 'lucide-react';

const Navbar = () => {
  const { user, logout, isAdmin, isSeller } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <Package className="h-8 w-8 text-primary-600" />
            <span className="text-xl font-bold text-gray-900">CloudRetail</span>
          </Link>

          {/* Navigation Links */}
          <div className="flex items-center space-x-6">
            {user ? (
              <>
                <Link to="/" className="text-gray-700 hover:text-primary-600 transition-colors">
                  Shop
                </Link>
                
                {isSeller && (
                  <Link to="/seller" className="flex items-center space-x-1 text-gray-700 hover:text-primary-600 transition-colors">
                    <LayoutDashboard className="h-4 w-4" />
                    <span>Seller Dashboard</span>
                  </Link>
                )}
                
                {isAdmin && (
                  <Link to="/admin" className="flex items-center space-x-1 text-gray-700 hover:text-primary-600 transition-colors">
                    <BarChart3 className="h-4 w-4" />
                    <span>Admin Panel</span>
                  </Link>
                )}

                <Link to="/cart" className="flex items-center space-x-1 text-gray-700 hover:text-primary-600 transition-colors">
                  <ShoppingCart className="h-5 w-5" />
                  <span>Cart</span>
                </Link>

                <div className="flex items-center space-x-3 border-l pl-6">
                  <div className="flex items-center space-x-2">
                    <User className="h-5 w-5 text-gray-600" />
                    <span className="text-sm text-gray-700">{user.firstName}</span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="flex items-center space-x-1 text-gray-700 hover:text-red-600 transition-colors"
                  >
                    <LogOut className="h-5 w-5" />
                    <span>Logout</span>
                  </button>
                </div>
              </>
            ) : (
              <>
                <Link to="/login" className="text-gray-700 hover:text-primary-600 transition-colors">
                  Login
                </Link>
                <Link to="/register" className="btn btn-primary">
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
