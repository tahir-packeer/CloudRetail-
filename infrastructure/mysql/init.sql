-- ===================================
-- CloudRetail Database Initialization
-- ===================================
-- This script creates all required databases for CloudRetail microservices
-- Run as MySQL root user

-- Create user for CloudRetail services
CREATE USER IF NOT EXISTS 'cloudretail_user'@'%' IDENTIFIED BY 'CloudRetail@2026';
CREATE USER IF NOT EXISTS 'cloudretail_user'@'localhost' IDENTIFIED BY 'CloudRetail@2026';

-- Create databases for each microservice
CREATE DATABASE IF NOT EXISTS auth_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS catalog_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS cart_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS order_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS payment_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS analytics_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Grant privileges to cloudretail_user
GRANT ALL PRIVILEGES ON auth_db.* TO 'cloudretail_user'@'%';
GRANT ALL PRIVILEGES ON catalog_db.* TO 'cloudretail_user'@'%';
GRANT ALL PRIVILEGES ON cart_db.* TO 'cloudretail_user'@'%';
GRANT ALL PRIVILEGES ON order_db.* TO 'cloudretail_user'@'%';
GRANT ALL PRIVILEGES ON payment_db.* TO 'cloudretail_user'@'%';
GRANT ALL PRIVILEGES ON analytics_db.* TO 'cloudretail_user'@'%';

GRANT ALL PRIVILEGES ON auth_db.* TO 'cloudretail_user'@'localhost';
GRANT ALL PRIVILEGES ON catalog_db.* TO 'cloudretail_user'@'localhost';
GRANT ALL PRIVILEGES ON cart_db.* TO 'cloudretail_user'@'localhost';
GRANT ALL PRIVILEGES ON order_db.* TO 'cloudretail_user'@'localhost';
GRANT ALL PRIVILEGES ON payment_db.* TO 'cloudretail_user'@'localhost';
GRANT ALL PRIVILEGES ON analytics_db.* TO 'cloudretail_user'@'localhost';

FLUSH PRIVILEGES;

SELECT 'CloudRetail databases created successfully!' AS message;
