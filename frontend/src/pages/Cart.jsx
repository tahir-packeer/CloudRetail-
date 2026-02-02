import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { Trash2, Plus, Minus, ShoppingBag } from 'lucide-react';

const Cart = () => {
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchCart();
  }, []);

  const fetchCart = async () => {
    try {
      const response = await api.get('/cart');
      setCart(response.data.data.cart);
    } catch (error) {
      toast.error('Failed to load cart');
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = async (itemId, quantity) => {
    if (quantity < 1) return;
    try {
      await api.put(`/cart/items/${itemId}`, { quantity });
      fetchCart();
      toast.success('Cart updated');
    } catch (error) {
      toast.error('Failed to update cart');
    }
  };

  const removeItem = async (itemId) => {
    try {
      await api.delete(`/cart/items/${itemId}`);
      fetchCart();
      toast.success('Item removed');
    } catch (error) {
      toast.error('Failed to remove item');
    }
  };

  const handleCheckout = () => {
    if (!cart?.items || cart.items.length === 0) {
      toast.error('Your cart is empty');
      return;
    }
    navigate('/checkout');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const totalAmount = cart?.items?.reduce((sum, item) => sum + (item.product.price * item.quantity), 0) || 0;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold mb-8">Shopping Cart</h1>

      {!cart?.items || cart.items.length === 0 ? (
        <div className="text-center py-12 card">
          <ShoppingBag className="h-24 w-24 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg mb-4">Your cart is empty</p>
          <button onClick={() => navigate('/')} className="btn btn-primary">
            Continue Shopping
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {cart.items.map((item) => (
              <div key={item.productId} className="card flex gap-4">
                <div className="w-24 h-24 bg-gray-200 rounded-lg flex-shrink-0">
                  {item.product.imageUrl && (
                    <img 
                      src={item.product.imageUrl} 
                      alt={item.product.name}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  )}
                </div>

                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-1">{item.product.name}</h3>
                  <p className="text-gray-600 text-sm mb-2">
                    LKR {item.product.price} each
                  </p>

                  <div className="flex items-center gap-4">
                    <div className="flex items-center border rounded-lg">
                      <button
                        onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                        className="p-2 hover:bg-gray-100"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="px-4 py-2 border-x">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                        className="p-2 hover:bg-gray-100"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>

                    <button
                      onClick={() => removeItem(item.productId)}
                      className="text-red-600 hover:text-red-700 flex items-center gap-1"
                    >
                      <Trash2 className="h-4 w-4" />
                      Remove
                    </button>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-xl font-bold text-primary-600">
                    LKR {(item.product.price * item.quantity).toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="card sticky top-4">
              <h2 className="text-xl font-bold mb-4">Order Summary</h2>
              
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal ({cart.items.length} items)</span>
                  <span>LKR {totalAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Shipping</span>
                  <span>Calculated at checkout</span>
                </div>
                <div className="border-t pt-2 flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span className="text-primary-600">LKR {totalAmount.toFixed(2)}</span>
                </div>
              </div>

              <button
                onClick={handleCheckout}
                className="w-full btn btn-primary py-3 text-lg"
              >
                Proceed to Checkout
              </button>

              <button
                onClick={() => navigate('/')}
                className="w-full btn btn-secondary mt-2"
              >
                Continue Shopping
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Cart;
