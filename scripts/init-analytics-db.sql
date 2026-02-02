-- Analytics Service Database Initialization
CREATE DATABASE IF NOT EXISTS analytics_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE analytics_db;

-- Daily Sales Aggregation Table
CREATE TABLE IF NOT EXISTS daily_sales (
    id INT AUTO_INCREMENT PRIMARY KEY,
    date DATE NOT NULL UNIQUE,
    total_orders INT DEFAULT 0,
    total_revenue DECIMAL(12, 2) DEFAULT 0.00,
    successful_payments INT DEFAULT 0,
    failed_payments INT DEFAULT 0,
    average_order_value DECIMAL(10, 2) DEFAULT 0.00,
    new_buyers INT DEFAULT 0,
    returning_buyers INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_date (date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Product Performance Metrics Table
CREATE TABLE IF NOT EXISTS product_metrics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    product_name VARCHAR(255),
    total_orders INT DEFAULT 0,
    total_quantity_sold INT DEFAULT 0,
    total_revenue DECIMAL(12, 2) DEFAULT 0.00,
    average_price DECIMAL(10, 2) DEFAULT 0.00,
    last_order_date TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_product (product_id),
    INDEX idx_revenue (total_revenue),
    INDEX idx_quantity (total_quantity_sold)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seller Performance Metrics Table
CREATE TABLE IF NOT EXISTS seller_metrics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    seller_id INT NOT NULL,
    total_products INT DEFAULT 0,
    total_orders INT DEFAULT 0,
    total_revenue DECIMAL(12, 2) DEFAULT 0.00,
    average_order_value DECIMAL(10, 2) DEFAULT 0.00,
    successful_deliveries INT DEFAULT 0,
    pending_orders INT DEFAULT 0,
    rating_average DECIMAL(3, 2) DEFAULT 0.00,
    total_reviews INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_seller (seller_id),
    INDEX idx_revenue (total_revenue)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SELECT 'Analytics database initialized successfully!' AS message;
