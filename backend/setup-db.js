import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';

dotenv.config();

const run = async () => {
  const dbHost = process.env.DB_HOST || 'localhost';
  const dbUser = process.env.DB_USER || 'root';
  const dbPassword = process.env.DB_PASSWORD || '';
  const dbPort = parseInt(process.env.DB_PORT || '3306');
  const dbName = process.env.DB_NAME || 'stn_motors';

  console.log('=== STN Motors Database Setup ===');
  console.log(`Connecting to ${dbHost}:${dbPort} as ${dbUser}...`);

  // 1. Create database
  const adminConn = await mysql.createConnection({ host: dbHost, user: dbUser, password: dbPassword, port: dbPort });
  await adminConn.query(`DROP DATABASE IF EXISTS \`${dbName}\``);
  await adminConn.query(`CREATE DATABASE \`${dbName}\``);
  await adminConn.end();
  console.log(`✅ Database "${dbName}" created fresh.`);

  // 2. Connect to new database with multipleStatements
  const conn = await mysql.createConnection({
    host: dbHost, user: dbUser, password: dbPassword, port: dbPort, database: dbName, multipleStatements: true
  });

  // 3. Create all tables
  console.log('Creating tables...');
  await conn.query(`
    CREATE TABLE users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(100) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      role ENUM('admin', 'cashier') NOT NULL DEFAULT 'cashier',
      status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    );

    CREATE TABLE categories (
      id INT AUTO_INCREMENT PRIMARY KEY,
      category_name VARCHAR(100) NOT NULL UNIQUE,
      status ENUM('active', 'inactive') NOT NULL DEFAULT 'active'
    );

    CREATE TABLE suppliers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      supplier_name VARCHAR(100) NOT NULL,
      company_name VARCHAR(100) NOT NULL,
      phone VARCHAR(20) NOT NULL,
      address TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    );

    CREATE TABLE products (
      id INT AUTO_INCREMENT PRIMARY KEY,
      product_name VARCHAR(200) NOT NULL,
      product_code VARCHAR(50) NOT NULL UNIQUE,
      barcode VARCHAR(100) NULL UNIQUE,
      category_id INT NULL,
      brand VARCHAR(100) NOT NULL,
      unit_type ENUM('Piece', 'Litre', 'Millilitre', 'Kg', 'Gram') NOT NULL DEFAULT 'Piece',
      buying_price DECIMAL(10, 2) NOT NULL,
      selling_price DECIMAL(10, 2) NOT NULL,
      stock_qty DECIMAL(10, 3) NOT NULL DEFAULT 0.000,
      low_stock_limit DECIMAL(10, 3) NOT NULL DEFAULT 5.000,
      supplier_id INT NULL,
      image TEXT NULL,
      status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL
    );

    CREATE TABLE customers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      phone VARCHAR(20) NOT NULL UNIQUE,
      address TEXT NULL,
      pending_balance DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
      sms_enabled BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    );

    CREATE TABLE sales (
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

    CREATE TABLE sale_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      sale_id INT NOT NULL,
      product_id INT NOT NULL,
      quantity DECIMAL(10, 3) NOT NULL,
      unit_price DECIMAL(10, 2) NOT NULL,
      buying_price DECIMAL(10, 2) NOT NULL,
      total_price DECIMAL(10, 2) NOT NULL,
      returned_quantity DECIMAL(10, 3) NOT NULL DEFAULT 0.000,
      FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id)
    );

    CREATE TABLE stock_history (
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

    CREATE TABLE offers (
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

    CREATE TABLE sms_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      customer_id INT NULL,
      phone VARCHAR(20) NOT NULL,
      message TEXT NOT NULL,
      status ENUM('sent', 'failed') NOT NULL DEFAULT 'sent',
      sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
    );
  `);
  console.log('✅ All 10 tables created.');

  // 4. Create indexes
  await conn.query(`
    CREATE INDEX idx_products_code ON products(product_code);
    CREATE INDEX idx_products_barcode ON products(barcode);
    CREATE INDEX idx_sales_bill_no ON sales(bill_no);
    CREATE INDEX idx_customers_phone ON customers(phone);
  `);
  console.log('✅ Indexes created.');

  // 5. Seed data with PROPERLY generated bcrypt hashes
  console.log('Generating bcrypt hashes for seed users...');
  const adminHash = await bcrypt.hash('admin123', 10);
  const cashierHash = await bcrypt.hash('cashier123', 10);
  console.log(`  Admin hash: ${adminHash}`);
  console.log(`  Cashier hash: ${cashierHash}`);

  await conn.query(
    `INSERT INTO users (name, email, password, role, status) VALUES (?, ?, ?, 'admin', 'active'), (?, ?, ?, 'cashier', 'active')`,
    ['Admin User', 'admin@stnmotors.com', adminHash, 'Cashier User', 'cashier@stnmotors.com', cashierHash]
  );
  console.log('✅ Admin and Cashier users seeded.');

  // Seed categories
  await conn.query(`INSERT INTO categories (category_name) VALUES ('Bearings'), ('Engine Oils'), ('Greases'), ('Bolts & Nuts'), ('Tractor Filters')`);
  console.log('✅ Categories seeded.');

  // Seed suppliers
  await conn.query(`INSERT INTO suppliers (supplier_name, company_name, phone, address) VALUES ('Siva Kumar', 'Lanka Spares Co.', '0771234567', 'Kandy Road, Jaffna'), ('Ajith Perera', 'Chevron Lubricants', '0719876543', 'Orabi Pasha Street, Colombo')`);
  console.log('✅ Suppliers seeded.');

  // Seed products
  await conn.query(`INSERT INTO products (product_name, product_code, barcode, category_id, brand, unit_type, buying_price, selling_price, stock_qty, low_stock_limit, supplier_id, status) VALUES
    ('Bearing 6205', 'BRG6205', '6901234567890', 1, 'SKF', 'Piece', 650.00, 1000.00, 20.000, 5.000, 1, 'active'),
    ('Engine Oil Super 1L', 'OIL001', '6901234567891', 2, 'Mobil', 'Litre', 1100.00, 1500.00, 45.000, 10.000, 2, 'active'),
    ('Chassis Grease 250g', 'GRS250', '6901234567892', 3, 'Caltex', 'Gram', 300.00, 450.00, 15.000, 3.000, 2, 'active'),
    ('Steel Bolt M12', 'BLT012', NULL, 4, 'TVS', 'Piece', 35.00, 60.00, 150.000, 20.000, 1, 'active'),
    ('Air Filter Massey Ferguson', 'FLT200', '6901234567893', 5, 'Donalson', 'Piece', 1800.00, 2500.00, 4.000, 5.000, 1, 'active')
  `);
  console.log('✅ Products seeded.');

  // Seed customers
  await conn.query(`INSERT INTO customers (name, phone, address, pending_balance, sms_enabled) VALUES ('Walk-in Customer', '0000000000', 'Shop Area', 0.00, FALSE), ('K. Ramanathan', '0776543210', 'Main Street, Sithankeny', 1500.00, TRUE)`);
  console.log('✅ Customers seeded.');

  await conn.end();
  console.log('\n🎉 Database setup complete! You can now restart the backend server.');
  process.exit(0);
};

run().catch(err => {
  console.error('❌ Setup failed:', err.message);
  process.exit(1);
});
