-- ===================================
-- Catalog Service Database Schema
-- ===================================
USE catalog_db;

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    parent_id INT NULL,
    image_url VARCHAR(500),
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL,
    INDEX idx_slug (slug),
    INDEX idx_parent_id (parent_id),
    INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Products table
CREATE TABLE IF NOT EXISTS products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    seller_id INT NOT NULL,
    category_id INT NOT NULL,
    name VARCHAR(200) NOT NULL,
    slug VARCHAR(200) NOT NULL UNIQUE,
    description TEXT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    compare_price DECIMAL(10, 2),
    cost_per_item DECIMAL(10, 2),
    stock INT NOT NULL DEFAULT 0,
    sku VARCHAR(100) UNIQUE,
    barcode VARCHAR(100),
    weight DECIMAL(8, 2),
    weight_unit ENUM('kg', 'g', 'lb', 'oz') DEFAULT 'kg',
    status ENUM('active', 'inactive', 'out_of_stock') NOT NULL DEFAULT 'active',
    featured BOOLEAN DEFAULT FALSE,
    rating DECIMAL(3, 2) DEFAULT 0.00,
    review_count INT DEFAULT 0,
    view_count INT DEFAULT 0,
    sales_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT,
    INDEX idx_seller_id (seller_id),
    INDEX idx_category_id (category_id),
    INDEX idx_slug (slug),
    INDEX idx_status (status),
    INDEX idx_price (price),
    INDEX idx_rating (rating),
    INDEX idx_featured (featured),
    FULLTEXT INDEX idx_search (name, description)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Product images table
CREATE TABLE IF NOT EXISTS product_images (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    image_url VARCHAR(500) NOT NULL,
    thumbnail_url VARCHAR(500),
    alt_text VARCHAR(200),
    display_order INT DEFAULT 0,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    INDEX idx_product_id (product_id),
    INDEX idx_is_primary (is_primary)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Product variants table (for future use - size, color, etc.)
CREATE TABLE IF NOT EXISTS product_variants (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    variant_name VARCHAR(100) NOT NULL,
    variant_value VARCHAR(100) NOT NULL,
    price_adjustment DECIMAL(10, 2) DEFAULT 0.00,
    stock INT DEFAULT 0,
    sku VARCHAR(100) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    INDEX idx_product_id (product_id),
    UNIQUE KEY unique_variant (product_id, variant_name, variant_value)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert sample categories
INSERT INTO categories (name, slug, description) VALUES
('Electronics', 'electronics', 'Electronic devices and accessories'),
('Clothing', 'clothing', 'Fashion and apparel'),
('Home & Garden', 'home-garden', 'Home decor and gardening supplies'),
('Books', 'books', 'Books and literature'),
('Sports', 'sports', 'Sports equipment and accessories'),
('Toys', 'toys', 'Toys and games'),
('Beauty', 'beauty', 'Beauty and personal care'),
('Automotive', 'automotive', 'Automotive parts and accessories')
ON DUPLICATE KEY UPDATE id=id;

-- Insert sample products (assuming seller_id 2 is the demo seller)
INSERT INTO products (seller_id, category_id, name, slug, description, price, stock, status, featured) VALUES
(2, 1, 'Wireless Bluetooth Headphones', 'wireless-bluetooth-headphones', 'High-quality wireless headphones with noise cancellation and 20-hour battery life.', 79.99, 50, 'active', TRUE),
(2, 1, 'Smart Watch Fitness Tracker', 'smart-watch-fitness-tracker', 'Track your fitness goals with heart rate monitoring, GPS, and water resistance.', 149.99, 30, 'active', TRUE),
(2, 2, 'Men Cotton T-Shirt', 'men-cotton-tshirt', 'Comfortable 100% cotton t-shirt available in multiple colors.', 19.99, 100, 'active', FALSE),
(2, 3, 'Indoor Plant Pot Set', 'indoor-plant-pot-set', 'Set of 3 ceramic plant pots perfect for indoor gardening.', 34.99, 25, 'active', FALSE),
(2, 4, 'Science Fiction Novel Collection', 'scifi-novel-collection', 'Bestselling science fiction novels bundle - 5 books.', 59.99, 15, 'active', FALSE)
ON DUPLICATE KEY UPDATE id=id;

-- Insert sample images
INSERT INTO product_images (product_id, image_url, is_primary) VALUES
(1, '/uploads/products/headphones-1.jpg', TRUE),
(2, '/uploads/products/smartwatch-1.jpg', TRUE),
(3, '/uploads/products/tshirt-1.jpg', TRUE),
(4, '/uploads/products/plantpot-1.jpg', TRUE),
(5, '/uploads/products/books-1.jpg', TRUE)
ON DUPLICATE KEY UPDATE id=id;

SELECT 'Catalog database schema created successfully!' AS message;
