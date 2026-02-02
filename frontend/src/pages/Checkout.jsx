import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { 
  Elements, 
  CardNumberElement, 
  CardExpiryElement, 
  CardCvcElement, 
  useStripe, 
  useElements 
} from '@stripe/react-stripe-js';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { CreditCard, MapPin, Lock, Calendar, Key } from 'lucide-react';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY || 'pk_test_demo');

const CheckoutForm = () => {
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(false);
  const [address, setAddress] = useState({
    line1: '',
    line2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'USA'
  });
  const stripe = useStripe();
  const elements = useElements();
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
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!stripe || !elements) {
      toast.error('Payment system is loading...');
      return;
    }
    
    if (!address.line1 || !address.city || !address.state || !address.postalCode) {
      toast.error('Please fill in all required address fields');
      return;
    }

    setLoading(true);

    try {
      // Calculate total amount
      const totalAmount = cart.items.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);

      // Step 1: Create payment intent FIRST (before creating order)
      let clientSecret, tempPaymentId, isDemoMode;
      try {
        const paymentResponse = await api.post('/payments/create-temp-intent', {
          amount: totalAmount,
          currency: 'lkr',
          items: cart.items.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.product.price,
            name: item.product.name
          }))
        });
        clientSecret = paymentResponse.data.data.clientSecret;
        tempPaymentId = paymentResponse.data.data.paymentId;
        isDemoMode = paymentResponse.data.data.demoMode;
      } catch (paymentError) {
        console.error('Payment intent creation failed:', paymentError);
        toast.error('Failed to initialize payment. Please try again.');
        return;
      }

      // Step 2: Process payment with Stripe (or simulate in demo mode)
      let paymentIntent;
      if (isDemoMode) {
        // Demo mode - simulate successful payment
        toast('Demo mode: Payment simulated', { duration: 2000, icon: 'ℹ️' });
        paymentIntent = {
          id: clientSecret,
          status: 'succeeded'
        };
      } else {
        const { error, paymentIntent: realPaymentIntent } = await stripe.confirmCardPayment(clientSecret, {
          payment_method: {
            card: elements.getElement(CardNumberElement),
            billing_details: {
              address: {
                line1: address.line1,
                line2: address.line2 || '',
                city: address.city,
                state: address.state,
                postal_code: address.postalCode,
                country: address.country
              }
            }
          }
        });

        if (error) {
          // Payment failed - no order created
          toast.error(`Payment failed: ${error.message}`);
          return;
        }

        if (realPaymentIntent.status !== 'succeeded') {
          toast.error('Payment was not successful. Please try again.');
          return;
        }
        
        paymentIntent = realPaymentIntent;
      }

      // Step 3: Payment succeeded! Now create the order
      let orderId;
      try {
        console.log('Creating order with data:', {
          shippingAddress: address,
          paymentIntentId: paymentIntent.id,
          items: cart.items.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.product.price
          }))
        });
        const orderResponse = await api.post('/orders', {
          shippingAddress: address,
          paymentIntentId: paymentIntent.id,
          items: cart.items.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.product.price
          }))
        });
        orderId = orderResponse.data.data.order.id;
        console.log('Order created successfully:', orderId);
      } catch (orderError) {
        console.error('Order creation failed after successful payment:', orderError);
        console.error('Error response:', orderError.response?.data);
        toast.error('Payment succeeded but order creation failed. Please contact support with payment ID: ' + paymentIntent.id);
        return;
      }

      // Step 4: Link payment to order
      try {
        await api.post('/payments/link-to-order', {
          paymentId: tempPaymentId,
          orderId: orderId,
          paymentIntentId: paymentIntent.id
        });
      } catch (linkError) {
        console.error('Failed to link payment to order:', linkError);
        // Continue anyway - order and payment both exist
      }

      // Step 5: Success! Clear cart and redirect
      toast.success('Payment successful!', { duration: 3000 });
      
      for (const item of cart.items) {
        await api.delete(`/cart/items/${item.productId}`).catch(err => console.error(err));
      }
      
      navigate('/', { replace: true });
      setTimeout(() => {
        toast.success(`Order #${orderId} completed! Thank you for your purchase. 🎉`, { 
          duration: 5000
        });
      }, 500);
      
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error(error.response?.data?.message || 'Failed to process checkout');
    } finally {
      setLoading(false);
    }
  };

  const totalAmount = cart?.items?.reduce((sum, item) => sum + (item.product.price * item.quantity), 0) || 0;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Checkout</h1>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Shipping Info */}
        <div className="card">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Shipping Address
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Street Address <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={address.line1}
                onChange={(e) => setAddress({...address, line1: e.target.value})}
                required
                className="input"
                placeholder="123 Main Street"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Apartment, suite, etc. (optional)
              </label>
              <input
                type="text"
                value={address.line2}
                onChange={(e) => setAddress({...address, line2: e.target.value})}
                className="input"
                placeholder="Apt 4B"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  City <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={address.city}
                  onChange={(e) => setAddress({...address, city: e.target.value})}
                  required
                  className="input"
                  placeholder="New York"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  State <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={address.state}
                  onChange={(e) => setAddress({...address, state: e.target.value})}
                  required
                  className="input"
                  placeholder="NY"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Postal Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={address.postalCode}
                  onChange={(e) => setAddress({...address, postalCode: e.target.value})}
                  required
                  className="input"
                  placeholder="10001"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Country <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={address.country}
                  onChange={(e) => setAddress({...address, country: e.target.value})}
                  required
                  className="input"
                  placeholder="USA"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Payment Info */}
        <div className="card">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment Details
          </h2>
          
          {/* Card Number */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Card Number
            </label>
            <div className="border border-gray-300 rounded-lg p-3 hover:border-primary-400 focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-200 transition-all">
              <CardNumberElement
                options={{
                  style: {
                    base: {
                      fontSize: '16px',
                      color: '#1f2937',
                      '::placeholder': {
                        color: '#9ca3af',
                      },
                    },
                    invalid: {
                      color: '#ef4444',
                    },
                  },
                  placeholder: '4242 4242 4242 4242',
                }}
              />
            </div>
          </div>

          {/* Expiry and CVC */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Expiry Date
              </label>
              <div className="border border-gray-300 rounded-lg p-3 hover:border-primary-400 focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-200 transition-all">
                <CardExpiryElement
                  options={{
                    style: {
                      base: {
                        fontSize: '16px',
                        color: '#1f2937',
                        '::placeholder': {
                          color: '#9ca3af',
                        },
                      },
                      invalid: {
                        color: '#ef4444',
                      },
                    },
                    placeholder: 'MM / YY',
                  }}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Key className="h-4 w-4" />
                CVC
              </label>
              <div className="border border-gray-300 rounded-lg p-3 hover:border-primary-400 focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-200 transition-all">
                <CardCvcElement
                  options={{
                    style: {
                      base: {
                        fontSize: '16px',
                        color: '#1f2937',
                        '::placeholder': {
                          color: '#9ca3af',
                        },
                      },
                      invalid: {
                        color: '#ef4444',
                      },
                    },
                    placeholder: '123',
                  }}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
            <Lock className="h-4 w-4 text-green-600" />
            <span>Your payment information is secure and encrypted</span>
          </div>

          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800 font-medium mb-1">Test Card Details:</p>
            <p className="text-xs text-blue-700">Card: 4242 4242 4242 4242</p>
            <p className="text-xs text-blue-700">Expiry: Any future date (e.g., 12/34)</p>
            <p className="text-xs text-blue-700">CVC: Any 3 digits (e.g., 123)</p>
          </div>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-2 card bg-gray-50">
          <h2 className="text-xl font-bold mb-4">Order Summary</h2>
          <div className="space-y-2 mb-4">
            {cart?.items?.map((item) => (
              <div key={item.productId} className="flex justify-between text-sm">
                <span>{item.product.name} × {item.quantity}</span>
                <span>LKR {(item.product.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
            <div className="border-t pt-2 flex justify-between font-bold text-lg">
              <span>Total</span>
              <span className="text-primary-600">LKR {totalAmount.toFixed(2)}</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={!stripe || loading}
            className="w-full btn btn-primary py-3 text-lg"
          >
            {loading ? 'Processing...' : `Pay LKR ${totalAmount.toFixed(2)}`}
          </button>
        </div>
      </form>
    </div>
  );
};

const Checkout = () => {
  return (
    <Elements stripe={stripePromise}>
      <CheckoutForm />
    </Elements>
  );
};

export default Checkout;
