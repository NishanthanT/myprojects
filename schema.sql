-- STN Motors POS System Database Schema
-- Database: stn_motors

CREATE DATABASE IF NOT EXISTS stn_motors;
USE stn_motors;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'cashier') NOT NULL DEFAULT 'cashier',
    status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 2. Categories Table (For future website support and easy categorization)
CREATE TABLE IF NOT EXISTS categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    category_name VARCHAR(100) NOT NULL UNIQUE,
    status ENUM('active', 'inactive') NOT NULL DEFAULT 'active'
);

-- 3. Suppliers Table
CREATE TABLE IF NOT EXISTS suppliers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    supplier_name VARCHAR(100) NOT NULL,
    company_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 4. Products Table (Includes unit type, buying/selling price, and limits)
CREATE TABLE IF NOT EXISTS products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_name VARCHAR(200) NOT NULL,
    product_code VARCHAR(50) NOT NULL UNIQUE,
    barcode VARCHAR(100) NULL UNIQUE,
    category_id INT NULL,
    brand VARCHAR(100) NOT NULL,
    unit_type ENUM('Piece', 'Litre', 'Millilitre', 'Kg', 'Gram') NOT NULL DEFAULT 'Piece',
    buying_price DECIMAL(10, 2) NOT NULL,
    selling_price DECIMAL(10, 2) NOT NULL,
    stock_qty DECIMAL(10, 3) NOT NULL DEFAULT 0.000, -- Decimal for loose selling like 1.5 Litres or 0.250 Kg
    low_stock_limit DECIMAL(10, 3) NOT NULL DEFAULT 5.000,
    supplier_id INT NULL,
    image TEXT NULL, -- Image URL/Base64 string (Future Website Integration)
    status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL
);

-- 5. Customers Table
CREATE TABLE IF NOT EXISTS customers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL UNIQUE,
    address TEXT NULL,
    pending_balance DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    sms_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 6. Sales Table (Tracks billing, discounts, payment methods, and cashiers)
CREATE TABLE IF NOT EXISTS sales (
    id INT AUTO_INCREMENT PRIMARY KEY,
    bill_no VARCHAR(50) NOT NULL UNIQUE,
    customer_id INT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    discount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    total_amount DECIMAL(10, 2) NOT NULL,
    paid_amount DECIMAL(10, 2) NOT NULL,
    balance_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    payment_method ENUM('Cash', 'Card', 'Bank Transfer', 'Credit') NOT NULL DEFAULT 'Cash',
    cashier_id INT NOT NULL,
    sale_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
    FOREIGN KEY (cashier_id) REFERENCES users(id)
);

-- 7. Sale Items Table (Tracks individual products sold, quantity, buying price at the time of sale)
CREATE TABLE IF NOT EXISTS sale_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sale_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity DECIMAL(10, 3) NOT NULL, -- Decimal for loose sale quantities (e.g. 0.5 Litre)
    unit_price DECIMAL(10, 2) NOT NULL,
    buying_price DECIMAL(10, 2) NOT NULL, -- Added to track profit accurately if buying price changes in future
    total_price DECIMAL(10, 2) NOT NULL,
    returned_quantity DECIMAL(10, 3) NOT NULL DEFAULT 0.000,
    FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- 8. Stock History Table (Tracks inventory adjustments, additions, damages, etc.)
CREATE TABLE IF NOT EXISTS stock_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    type ENUM('addition', 'sale', 'adjustment', 'damage_remove') NOT NULL,
    quantity DECIMAL(10, 3) NOT NULL,
    note VARCHAR(255) NULL,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- 9. Offers / Discounts Table
CREATE TABLE IF NOT EXISTS offers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    offer_name VARCHAR(100) NOT NULL,
    offer_type ENUM('Percentage', 'Fixed') NOT NULL DEFAULT 'Percentage',
    discount_value DECIMAL(10, 2) NOT NULL,
    product_id INT NULL,
    category_id INT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);

-- 10. SMS Logs Table (Tracks sent alerts)
CREATE TABLE IF NOT EXISTS sms_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NULL,
    phone VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    status ENUM('sent', 'failed') NOT NULL DEFAULT 'sent',
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
);

-- Indexes for Fast Searches (Product Code, Barcode, Bill Number)
CREATE INDEX idx_products_code ON products(product_code);
CREATE INDEX idx_products_barcode ON products(barcode);
CREATE INDEX idx_sales_bill_no ON sales(bill_no);
CREATE INDEX idx_customers_phone ON customers(phone);

-- ==========================================
-- SEED INITIAL DATA
-- ==========================================

-- Seed Users
-- Password for admin: admin123 (hashed using bcrypt)
-- Password for cashier: cashier123 (hashed using bcrypt)
INSERT INTO users (name, email, password, role, status) VALUES
('Admin User', 'admin@stnmotors.com', '$2a$10$wK10sSlyB6vGZ9J1lKz9.O.Xz15RzBv2t1/948BvewzW9Qy/rPpyW', 'admin', 'active'),
('Cashier User', 'cashier@stnmotors.com', '$2a$10$iM.o5p5U6yqDqJ3nLz29.OGJj7mEwPzB3t1/948BvewzW9Qy/rPpyW', 'cashier', 'active')
ON DUPLICATE KEY UPDATE email=email;

-- Seed Categories
INSERT INTO categories (category_name, status) VALUES
('Bearings', 'active'),
('Engine Oils', 'active'),
('Greases', 'active'),
('Bolts & Nuts', 'active'),
('Tractor Filters', 'active')
ON DUPLICATE KEY UPDATE category_name=category_name;

-- Seed Suppliers
INSERT INTO suppliers (supplier_name, company_name, phone, address) VALUES
('Siva Kumar', 'Lanka Spares Co.', '0771234567', 'Kandy Road, Jaffna'),
('Ajith Perera', 'Chevron Lubricants', '0719876543', 'Orabi Pasha Street, Colombo')
ON DUPLICATE KEY UPDATE phone=phone;

-- Seed Products
INSERT INTO products (product_name, product_code, barcode, category_id, brand, unit_type, buying_price, selling_price, stock_qty, low_stock_limit, supplier_id, status) VALUES
('Bearing 6205', 'BRG6205', '6901234567890', 1, 'SKF', 'Piece', 650.00, 1000.00, 20.000, 5.000, 1, 'active'),
('Engine Oil Super 1L', 'OIL001', '6901234567891', 2, 'Mobil', 'Litre', 1100.00, 1500.00, 45.000, 10.000, 2, 'active'),
('Chassis Grease 250g', 'GRS250', '6901234567892', 3, 'Caltex', 'Gram', 300.00, 450.00, 15.000, 3.000, 2, 'active'),
('Steel Bolt M12', 'BLT012', NULL, 4, 'TVS', 'Piece', 35.00, 60.00, 150.000, 20.000, 1, 'active'),
('Air Filter Massey Ferguson', 'FLT200', '6901234567893', 5, 'Donalson', 'Piece', 1800.00, 2500.00, 4.000, 5.000, 1, 'active')
ON DUPLICATE KEY UPDATE product_code=product_code;

-- Seed Customers
INSERT INTO customers (name, phone, address, pending_balance, sms_enabled) VALUES
('Walk-in Customer', '0000000000', 'Shop Area', 0.00, FALSE),
('K. Ramanathan', '0776543210', 'Main Street, Sithankeny', 1500.00, TRUE)
ON DUPLICATE KEY UPDATE phone=phone;
