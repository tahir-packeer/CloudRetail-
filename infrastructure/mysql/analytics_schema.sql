-- ===================================
-- Analytics Service Database Schema
-- ===================================
USE analytics_db;

-- Daily sales aggregation table
CREATE TABLE IF NOT EXISTS daily_sales (
    id INT AUTO_INCREMENT PRIMARY KEY,
    date DATE NOT NULL,
    seller_id INT,
    category_id INT,
    total_orders INT DEFAULT 0,
    total_revenue DECIMAL(12, 2) DEFAULT 0.00,
    total_items_sold INT DEFAULT 0,
    average_order_value DECIMAL(10, 2) DEFAULT 0.00,
    new_customers INT DEFAULT 0,
    returning_customers INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_date_seller_category (date, seller_id, category_id),
    INDEX idx_date (date),
    INDEX idx_seller_id (seller_id),
    INDEX idx_category_id (category_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Product performance metrics
CREATE TABLE IF NOT EXISTS product_metrics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    seller_id INT NOT NULL,
    date DATE NOT NULL,
    views INT DEFAULT 0,
    clicks INT DEFAULT 0,
    add_to_cart INT DEFAULT 0,
    purchases INT DEFAULT 0,
    revenue DECIMAL(10, 2) DEFAULT 0.00,
    conversion_rate DECIMAL(5, 2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_product_date (product_id, date),
    INDEX idx_product_id (product_id),
    INDEX idx_seller_id (seller_id),
    INDEX idx_date (date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seller performance metrics
CREATE TABLE IF NOT EXISTS seller_metrics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    seller_id INT NOT NULL,
    date DATE NOT NULL,
    total_sales DECIMAL(12, 2) DEFAULT 0.00,
    total_orders INT DEFAULT 0,
    average_order_value DECIMAL(10, 2) DEFAULT 0.00,
    total_products INT DEFAULT 0,
    active_products INT DEFAULT 0,
    out_of_stock_products INT DEFAULT 0,
    total_views INT DEFAULT 0,
    rating DECIMAL(3, 2) DEFAULT 0.00,
    review_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_seller_date (seller_id, date),
    INDEX idx_seller_id (seller_id),
    INDEX idx_date (date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Platform-wide metrics
CREATE TABLE IF NOT EXISTS platform_metrics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    date DATE NOT NULL UNIQUE,
    total_users INT DEFAULT 0,
    active_users INT DEFAULT 0,
    new_users INT DEFAULT 0,
    total_sellers INT DEFAULT 0,
    active_sellers INT DEFAULT 0,
    total_products INT DEFAULT 0,
    total_orders INT DEFAULT 0,
    gross_merchandise_value DECIMAL(15, 2) DEFAULT 0.00,
    platform_revenue DECIMAL(12, 2) DEFAULT 0.00,
    average_order_value DECIMAL(10, 2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_date (date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Event stream table (for event sourcing and audit)
CREATE TABLE IF NOT EXISTS event_stream (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL,
    aggregate_type VARCHAR(50) NOT NULL,
    aggregate_id VARCHAR(100) NOT NULL,
    event_data JSON NOT NULL,
    user_id INT,
    correlation_id VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_event_type (event_type),
    INDEX idx_aggregate (aggregate_type, aggregate_id),
    INDEX idx_correlation_id (correlation_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Top products view (materialized for performance)
CREATE TABLE IF NOT EXISTS top_products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    period ENUM('daily', 'weekly', 'monthly') NOT NULL,
    period_start DATE NOT NULL,
    sales_count INT DEFAULT 0,
    revenue DECIMAL(10, 2) DEFAULT 0.00,
    product_rank INT DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_product_period (product_id, period, period_start),
    INDEX idx_period (period, period_start),
    INDEX idx_rank (product_rank)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SELECT 'Analytics database schema created successfully!' AS message;
