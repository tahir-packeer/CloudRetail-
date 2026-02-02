-- ===================================
-- Auth Service Database Schema
-- ===================================
USE auth_db;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    phone VARCHAR(15),
    role ENUM('buyer', 'seller', 'admin') NOT NULL DEFAULT 'buyer',
    status ENUM('active', 'inactive', 'blocked') NOT NULL DEFAULT 'active',
    email_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL,
    INDEX idx_email (email),
    INDEX idx_role (role),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Refresh tokens table
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token VARCHAR(500) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    revoked BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_token (token),
    INDEX idx_user_id (user_id),
    INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seller profiles table
CREATE TABLE IF NOT EXISTS seller_profiles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    business_name VARCHAR(200) NOT NULL,
    business_description TEXT,
    business_address TEXT,
    verification_status ENUM('pending', 'verified', 'rejected') NOT NULL DEFAULT 'pending',
    verification_date TIMESTAMP NULL,
    rating DECIMAL(3, 2) DEFAULT 0.00,
    total_sales INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_verification_status (verification_status),
    INDEX idx_rating (rating)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default admin user (password: Admin@123)
INSERT INTO users (email, password_hash, first_name, last_name, role, status, email_verified)
VALUES 
('admin@cloudretail.com', '$2b$10$Xh5R5Y9K3xqF7tZKZJUvOuVzK5YwY8/hzJ.XD7mH3eGN5X8FqEDGi', 'System', 'Admin', 'admin', 'active', TRUE),
('seller@cloudretail.com', '$2b$10$Xh5R5Y9K3xqF7tZKZJUvOuVzK5YwY8/hzJ.XD7mH3eGN5X8FqEDGi', 'Demo', 'Seller', 'seller', 'active', TRUE),
('buyer@cloudretail.com', '$2b$10$Xh5R5Y9K3xqF7tZKZJUvOuVzK5YwY8/hzJ.XD7mH3eGN5X8FqEDGi', 'Demo', 'Buyer', 'buyer', 'active', TRUE)
ON DUPLICATE KEY UPDATE id=id;

-- Insert seller profile for demo seller
INSERT INTO seller_profiles (user_id, business_name, business_description, verification_status)
SELECT id, 'Demo Seller Store', 'Demo seller for testing purposes', 'verified'
FROM users WHERE email = 'seller@cloudretail.com'
ON DUPLICATE KEY UPDATE user_id=user_id;

SELECT 'Auth database schema created successfully!' AS message;
