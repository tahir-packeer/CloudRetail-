-- ===================================
-- Payment Service Database Schema
-- ===================================
USE payment_db;

-- Payment transactions table
CREATE TABLE
IF NOT EXISTS payment_transactions
(
    id INT AUTO_INCREMENT PRIMARY KEY,
    transaction_id VARCHAR
(255) NOT NULL UNIQUE,
    order_id INT NULL,
    buyer_id INT NOT NULL,
    amount DECIMAL
(10, 2) NOT NULL,
    currency VARCHAR
(3) DEFAULT 'USD',
    payment_method VARCHAR
(50) NOT NULL,
    payment_provider VARCHAR
(50) DEFAULT 'stripe',
    provider_transaction_id VARCHAR
(255),
    provider_payment_intent_id VARCHAR
(255),
    status ENUM
('pending', 'processing', 'succeeded', 'failed', 'cancelled', 'refunded') NOT NULL DEFAULT 'pending',
    failure_code VARCHAR
(100),
    failure_message TEXT,
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON
UPDATE CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
NULL,
    INDEX idx_transaction_id
(transaction_id),
    INDEX idx_order_id
(order_id),
    INDEX idx_buyer_id
(buyer_id),
    INDEX idx_status
(status),
    INDEX idx_provider_transaction_id
(provider_transaction_id),
    INDEX idx_created_at
(created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Payment methods table (saved payment methods for users)
CREATE TABLE
IF NOT EXISTS payment_methods
(
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    payment_type ENUM
('card', 'bank_account', 'digital_wallet') NOT NULL DEFAULT 'card',
    provider VARCHAR
(50) DEFAULT 'stripe',
    provider_payment_method_id VARCHAR
(255) NOT NULL,
    card_brand VARCHAR
(50),
    card_last4 VARCHAR
(4),
    card_exp_month INT,
    card_exp_year INT,
    is_default BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON
UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_is_default (is_default),
    INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Refunds table
CREATE TABLE
IF NOT EXISTS refunds
(
    id INT AUTO_INCREMENT PRIMARY KEY,
    refund_id VARCHAR
(255) NOT NULL UNIQUE,
    transaction_id INT NOT NULL,
    order_id INT NOT NULL,
    amount DECIMAL
(10, 2) NOT NULL,
    currency VARCHAR
(3) DEFAULT 'USD',
    reason VARCHAR
(200),
    provider_refund_id VARCHAR
(255),
    status ENUM
('pending', 'succeeded', 'failed', 'cancelled') NOT NULL DEFAULT 'pending',
    notes TEXT,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON
UPDATE CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
NULL,
    FOREIGN KEY
(transaction_id) REFERENCES payment_transactions
(id) ON
DELETE RESTRICT,
    INDEX idx_refund_id (refund_id),
    INDEX idx_transaction_id
(transaction_id),
    INDEX idx_order_id
(order_id),
    INDEX idx_status
(status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Payment webhooks log (for Stripe webhook events)
CREATE TABLE
IF NOT EXISTS webhook_events
(
    id INT AUTO_INCREMENT PRIMARY KEY,
    event_id VARCHAR
(255) NOT NULL UNIQUE,
    event_type VARCHAR
(100) NOT NULL,
    provider VARCHAR
(50) DEFAULT 'stripe',
    payload JSON NOT NULL,
    processed BOOLEAN DEFAULT FALSE,
    processed_at TIMESTAMP NULL,
    error_message TEXT,
    retry_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_event_id
(event_id),
    INDEX idx_event_type
(event_type),
    INDEX idx_processed
(processed),
    INDEX idx_created_at
(created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SELECT 'Payment database schema created successfully!' AS message;
