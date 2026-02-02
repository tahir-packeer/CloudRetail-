# CloudRetail E-commerce Platform

A full-stack e-commerce platform built with microservices architecture featuring role-based dashboards for Buyers, Sellers, and Admins.

## 🚀 Project Overview

**Assignment:** COMP60010-ECDWA2 E-commerce Platform  
**Student:** Tahir  
**Due Date:** February 5, 2026  
**Status:** ✅ Complete

CloudRetail is a modern e-commerce platform that demonstrates:

- Microservices architecture with 6 independent backend services
- API Gateway for centralized request routing and rate limiting
- Role-based access control (Buyer, Seller, Admin)
- Stripe payment integration with demo mode
- Real-time analytics and reporting
- Responsive React frontend with TailwindCSS

## 🏗️ Architecture

### Backend Services (Node.js + Express)

1. **Auth Service** (Port 3001) - JWT authentication, user management
2. **Catalog Service** (Port 3002) - Products, categories, search
3. **Cart Service** (Port 3003) - Shopping cart with Redis
4. **Order Service** (Port 3004) - Order management, fulfillment
5. **Payment Service** (Port 3005) - Stripe integration, payment processing
6. **Analytics Service** (Port 3006) - Business intelligence, metrics

### Infrastructure

- **API Gateway** (Port 3000) - Request routing, rate limiting (100 req/min), CORS
- **Frontend** (Port 5173) - React + Vite, TailwindCSS, Stripe Elements
- **Database** - MySQL 8.0 (6 separate databases)
- **Shared Library** - `@cloudretail/shared` for common utilities

## 📋 Features

### Buyer Features

✅ Product browsing with search and filters  
✅ Shopping cart management  
✅ Secure checkout with Stripe  
✅ Order history and tracking  
✅ Category filtering

### Seller Features

✅ Product management (CRUD)  
✅ Inventory tracking  
✅ Order fulfillment workflow  
✅ Sales analytics dashboard  
✅ Revenue metrics

### Admin Features

✅ User management (activate/deactivate)  
✅ Seller verification and approval  
✅ Platform-wide analytics  
✅ Revenue reporting  
✅ System health monitoring

## 🚀 Quick Start

### Prerequisites

- Node.js v24+ installed
- MySQL 8.0 running
- PowerShell (Windows)

### Start All Services

```powershell
# Navigate to project directory
cd c:\Users\tahir\Downloads\CloudRetail\cloudretail-app

# Start all 7 backend services + frontend (opens 8 PowerShell windows)
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'services\auth-service'; node src/index.js"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'services\catalog-service'; node src/index.js"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'services\cart-service'; node src/index.js"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'services\order-service'; node src/index.js"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'services\payment-service'; node src/index.js"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'services\analytics-service'; node src/index.js"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'services\api-gateway'; node src/index.js"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'frontend'; npm run dev"
```

### Access the Application

- **Frontend:** http://localhost:5173
- **API Gateway:** http://localhost:3000/health

### Demo Accounts

- **Buyer:** buyer@cloudretail.com / Buyer@123
- **Seller:** seller@cloudretail.com / Seller@123
- **Admin:** admin@cloudretail.com / Admin@123

## 🧪 Testing

### Run All Tests

```powershell
# Gateway integration tests (9 tests)
.\test-gateway.ps1

# Frontend integration tests (7 tests)
.\test-frontend-integration.ps1
```

**Test Results:** All 16 tests passing ✅

## 🛠️ Technology Stack

**Backend:** Node.js, Express.js, MySQL, Redis, JWT, Stripe SDK  
**Frontend:** React 18, Vite, TailwindCSS, React Router, Stripe Elements  
**Tools:** Axios, Winston, Helmet, CORS, express-rate-limit

## 📊 Key Endpoints

### Authentication

- POST `/api/auth/register` - Create account
- POST `/api/auth/login` - Login (returns JWT)

### Products

- GET `/api/products/search` - Search products
- GET `/api/products/:id` - Product details
- POST `/api/products` - Create product (seller)

### Cart & Orders

- GET `/api/cart` - Get user's cart
- POST `/api/cart/items` - Add item to cart
- POST `/api/orders` - Create order
- GET `/api/orders/my-orders` - User's orders

### Payments

- POST `/api/payments/create-intent` - Create payment intent
- GET `/api/payments/history` - Payment history

### Analytics

- GET `/api/analytics/dashboard` - Platform metrics (admin)
- GET `/api/analytics/seller/me` - Seller metrics

## 🎯 Assignment Requirements Met

✅ Microservices Architecture (6 services)  
✅ API Gateway with rate limiting  
✅ Role-Based Access Control  
✅ Payment Integration (Stripe)  
✅ React Frontend (Buyer/Seller/Admin)  
✅ Database Design (Normalized, 6 DBs)  
✅ Authentication (JWT)  
✅ Testing (16 integration tests)  
✅ Documentation (Complete)

## 📁 Project Structure

```
cloudretail-app/
├── services/
│   ├── auth-service/          # User authentication (3001)
│   ├── catalog-service/       # Product catalog (3002)
│   ├── cart-service/          # Shopping cart (3003)
│   ├── order-service/         # Order management (3004)
│   ├── payment-service/       # Payment processing (3005)
│   ├── analytics-service/     # Analytics (3006)
│   └── api-gateway/           # API Gateway (3000)
├── frontend/                  # React frontend (5173)
├── shared/                    # Shared utilities library
├── database/                  # SQL schemas
├── test-gateway.ps1           # Gateway tests
└── test-frontend-integration.ps1  # Frontend tests
```

## 🔒 Security Features

- JWT-based authentication
- Password hashing (bcrypt)
- Role-based access control
- Rate limiting (100 req/min)
- CORS protection
- SQL injection prevention
- XSS protection (Helmet)

## 📈 Performance

- API response time: < 100ms
- Rate limit: 100 req/min per IP
- Concurrent users: 100+
- Database queries: Optimized with indexes

## 👨‍💻 Development

### Installation

```bash
# Install shared library
cd shared && npm install && npm link

# Install all services
cd services/auth-service && npm install
# Repeat for all services

# Install frontend
cd frontend && npm install
```

### Environment Setup

Each service needs a `.env` file with database credentials and JWT secret.

## 🎉 Status

**Backend:** ✅ 100% Complete (All 6 services + Gateway)  
**Frontend:** ✅ 100% Complete (Buyer + Seller + Admin)  
**Testing:** ✅ All tests passing (16/16)  
**Documentation:** ✅ Complete

---

**Project Ready for Submission** 🚀
