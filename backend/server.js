import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';

// Import db pool
import pool,{databaseConfig} from './config/db.js';
import {baseSchemaOnly,ensureProductionAdmin} from './services/productionBootstrap.js';
import {serveFrontend} from './services/serveFrontend.js';
import {verifyToken,enforceApiAccess} from './middleware/auth.js';

// Import routes
import authRoutes from './routes/authRoutes.js';
import productRoutes from './routes/productRoutes.js';
import billImportRoutes from './routes/billImportRoutes.js';
import customerRoutes from './routes/customerRoutes.js';
import supplierRoutes from './routes/supplierRoutes.js';
import salesRoutes from './routes/salesRoutes.js';
import offerRoutes from './routes/offerRoutes.js';
import smsRoutes from './routes/smsRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import siteSettingsRoutes from './routes/siteSettingsRoutes.js';
import publicRoutes from './routes/publicRoutes.js';
import vehicleListingRoutes from './routes/vehicleListingRoutes.js';
import mechanicalServiceRoutes from './routes/mechanicalServiceRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const production=process.env.NODE_ENV==='production';

// Middleware
app.use(cors());
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// API Routes Mapping
app.use('/api',(req,res,next)=>{
  if(req.path==='/health'||req.path.startsWith('/auth/')||req.path==='/auth'||req.path.startsWith('/public/')||req.path==='/public')return next();
  return verifyToken(req,res,()=>enforceApiAccess(req,res,next));
});
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/bill-imports', billImportRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/offers', offerRoutes);
app.use('/api/sms', smsRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/site-settings', siteSettingsRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/vehicle-listings', vehicleListingRoutes);
app.use('/api/mechanical-services', mechanicalServiceRoutes);

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'STN Motors POS API is running smoothly.' });
});

// Setup paths for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Automatic DB Initialization Routine
const initDatabase = async () => {
  try {
    const dbHost = process.env.DB_HOST || 'localhost';
    const dbUser = process.env.DB_USER || 'root';
    const dbPassword = process.env.DB_PASSWORD || '';
    const dbPort = parseInt(process.env.DB_PORT || '3306');
    const dbName = process.env.DB_NAME || 'stn_motors';

    console.log(`[Database Initialization] Connecting to MySQL host at ${dbHost}:${dbPort}...`);

    // 1. Create the database if it does not exist
    if(process.env.DB_CREATE_DATABASE!=='false'){
    const adminConn = await mysql.createConnection({
      ssl:databaseConfig.ssl,
      host: dbHost,
      user: dbUser,
      password: dbPassword,
      port: dbPort
    });
    await adminConn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\`;`);
    await adminConn.end();
    }
    console.log(`[Database Initialization] Database "${dbName}" verified.`);

    // 2. Check if tables already exist — skip schema run if they do
    const checkConn = await mysql.createConnection({
      ssl:databaseConfig.ssl,
      host: dbHost, user: dbUser, password: dbPassword, port: dbPort, database: dbName
    });
    const [tableRows] = await checkConn.query(
      `SELECT COUNT(*) as cnt FROM information_schema.tables WHERE table_schema = ? AND table_name = 'users'`,
      [dbName]
    );
    await checkConn.end();

    if (tableRows[0].cnt > 0) {
      console.log('[Database Initialization] ✅ Tables already exist. Skipping schema re-run.');
      
      // Dynamic migration: check and add returned_quantity to sale_items if missing
      const connMigration = await mysql.createConnection({
        ssl:databaseConfig.ssl,
        host: dbHost, user: dbUser, password: dbPassword, port: dbPort, database: dbName
      });
      const [colRows] = await connMigration.query(
        `SELECT COUNT(*) as cnt FROM information_schema.columns 
         WHERE table_schema = ? AND table_name = 'sale_items' AND column_name = 'returned_quantity'`,
        [dbName]
      );
      if (colRows[0].cnt === 0) {
        console.log('[Database Initialization] Migrating: Adding "returned_quantity" column to "sale_items" table...');
        await connMigration.query(
          `ALTER TABLE sale_items ADD COLUMN returned_quantity DECIMAL(10, 3) NOT NULL DEFAULT 0.000`
        );
        console.log('[Database Initialization] ✅ Database migration successful.');
      }

      // Migration: vehicle_types, vehicle_models, product_vehicle_models tables + vehicle_type_id on products
      const [vtRows] = await connMigration.query(
        `SELECT COUNT(*) as cnt FROM information_schema.tables WHERE table_schema = ? AND table_name = 'vehicle_types'`,
        [dbName]
      );
      if (vtRows[0].cnt === 0) {
        console.log('[Database Initialization] Migrating: Creating vehicle type/model tables...');
        await connMigration.query(`
          CREATE TABLE vehicle_types (
            id INT AUTO_INCREMENT PRIMARY KEY,
            type_name VARCHAR(100) NOT NULL UNIQUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);
        await connMigration.query(`
          CREATE TABLE vehicle_models (
            id INT AUTO_INCREMENT PRIMARY KEY,
            model_name VARCHAR(100) NOT NULL,
            vehicle_type_id INT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (vehicle_type_id) REFERENCES vehicle_types(id) ON DELETE CASCADE
          )
        `);
        await connMigration.query(`
          CREATE TABLE product_vehicle_models (
            product_id INT NOT NULL,
            model_id INT NOT NULL,
            PRIMARY KEY (product_id, model_id),
            FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
            FOREIGN KEY (model_id) REFERENCES vehicle_models(id) ON DELETE CASCADE
          )
        `);
        // Add vehicle_type_id column to products
        await connMigration.query(`
          ALTER TABLE products ADD COLUMN vehicle_type_id INT NULL,
          ADD FOREIGN KEY (vehicle_type_id) REFERENCES vehicle_types(id) ON DELETE SET NULL
        `);
        console.log('[Database Initialization] ✅ Vehicle type/model tables created successfully.');
      } else {
        // Ensure vehicle_type_id column exists in products (in case of partial migration)
        const [vtColRows] = await connMigration.query(
          `SELECT COUNT(*) as cnt FROM information_schema.columns WHERE table_schema = ? AND table_name = 'products' AND column_name = 'vehicle_type_id'`,
          [dbName]
        );
        if (vtColRows[0].cnt === 0) {
          await connMigration.query(`ALTER TABLE products ADD COLUMN vehicle_type_id INT NULL`);
          console.log('[Database Initialization] ✅ Added vehicle_type_id column to products.');
        }
      }

      // Migration: product_images table (multiple photos per product)
      const [piRows] = await connMigration.query(
        `SELECT COUNT(*) as cnt FROM information_schema.tables WHERE table_schema = ? AND table_name = 'product_images'`,
        [dbName]
      );
      if (piRows[0].cnt === 0) {
        console.log('[Database Initialization] Migrating: Creating product_images table...');
        await connMigration.query(`
          CREATE TABLE product_images (
            id INT AUTO_INCREMENT PRIMARY KEY,
            product_id INT NOT NULL,
            image_data LONGTEXT NOT NULL,
            sort_order INT NOT NULL DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
          )
        `);
        console.log('[Database Initialization] ✅ product_images table created successfully.');
      }

      // Migration: purchase_orders / purchase_order_items tables (restock ordering)
      const [poRows] = await connMigration.query(
        `SELECT COUNT(*) as cnt FROM information_schema.tables WHERE table_schema = ? AND table_name = 'purchase_orders'`,
        [dbName]
      );
      if (poRows[0].cnt === 0) {
        console.log('[Database Initialization] Migrating: Creating purchase order tables...');
        await connMigration.query(`
          CREATE TABLE purchase_orders (
            id INT AUTO_INCREMENT PRIMARY KEY,
            created_by INT NULL,
            created_by_name VARCHAR(150) NOT NULL,
            total_items INT NOT NULL DEFAULT 0,
            total_quantity DECIMAL(10, 3) NOT NULL DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
          )
        `);
        await connMigration.query(`
          CREATE TABLE purchase_order_items (
            id INT AUTO_INCREMENT PRIMARY KEY,
            order_id INT NOT NULL,
            product_id INT NULL,
            product_name VARCHAR(200) NOT NULL,
            product_code VARCHAR(100) NOT NULL,
            category_name VARCHAR(100) NULL,
            vehicle_type_name VARCHAR(100) NULL,
            vehicle_model_names VARCHAR(255) NULL,
            brand VARCHAR(100) NULL,
            unit_type VARCHAR(30) NULL,
            stock_at_order DECIMAL(10, 3) NULL,
            buying_price DECIMAL(10, 2) NULL,
            quantity DECIMAL(10, 3) NOT NULL,
            FOREIGN KEY (order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
            FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
          )
        `);
        console.log('[Database Initialization] ✅ Purchase order tables created successfully.');
      } else {
        // Ensure vehicle_model_names column exists (in case of partial migration)
        const [pmColRows] = await connMigration.query(
          `SELECT COUNT(*) as cnt FROM information_schema.columns WHERE table_schema = ? AND table_name = 'purchase_order_items' AND column_name = 'vehicle_model_names'`,
          [dbName]
        );
        if (pmColRows[0].cnt === 0) {
          await connMigration.query(`ALTER TABLE purchase_order_items ADD COLUMN vehicle_model_names VARCHAR(255) NULL`);
          console.log('[Database Initialization] ✅ Added vehicle_model_names column to purchase_order_items.');
        }

        // Ensure buying_price column exists (in case of partial migration)
        const [bpColRows] = await connMigration.query(
          `SELECT COUNT(*) as cnt FROM information_schema.columns WHERE table_schema = ? AND table_name = 'purchase_order_items' AND column_name = 'buying_price'`,
          [dbName]
        );
        if (bpColRows[0].cnt === 0) {
          await connMigration.query(`ALTER TABLE purchase_order_items ADD COLUMN buying_price DECIMAL(10, 2) NULL`);
          console.log('[Database Initialization] ✅ Added buying_price column to purchase_order_items.');
        }
      }

      // Migration: public website support — site_settings, offer photos/video, products.is_public
      const [ssRows] = await connMigration.query(
        `SELECT COUNT(*) as cnt FROM information_schema.tables WHERE table_schema = ? AND table_name = 'site_settings'`,
        [dbName]
      );
      if (ssRows[0].cnt === 0) {
        console.log('[Database Initialization] Migrating: Creating site_settings table...');
        await connMigration.query(`
          CREATE TABLE site_settings (
            id INT PRIMARY KEY DEFAULT 1,
            shop_name VARCHAR(150) NULL,
            shop_tagline VARCHAR(150) NULL,
            shop_address VARCHAR(255) NULL,
            shop_phone VARCHAR(30) NULL,
            whatsapp_number VARCHAR(30) NULL,
            email VARCHAR(150) NULL,
            facebook_url VARCHAR(255) NULL,
            instagram_url VARCHAR(255) NULL,
            tiktok_url VARCHAR(255) NULL,
            google_maps_url VARCHAR(500) NULL,
            about_text TEXT NULL,
            visible_fields VARCHAR(255) NOT NULL DEFAULT 'price,category,vehicle_type,brand',
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
          )
        `);
        await connMigration.query(`
          INSERT INTO site_settings (id, shop_name, shop_tagline, shop_address, shop_phone, facebook_url, google_maps_url, about_text)
          VALUES (1, 'STN MOTORS', 'Tractors & Oils', 'Main Street, Sithankeny', '0774092001',
            'https://www.facebook.com/STNMotorsTractorPartsOils',
            'https://share.google/P4Y8nE6XzsOeCPo6C',
            'STN Motors is your trusted destination for genuine tractor spare parts, engine oils, and greases. We are committed to keeping your machines running strong with quality parts and honest service.')
        `);
        console.log('[Database Initialization] ✅ site_settings table created and seeded.');
      }

      const [oiRows] = await connMigration.query(
        `SELECT COUNT(*) as cnt FROM information_schema.tables WHERE table_schema = ? AND table_name = 'offer_images'`,
        [dbName]
      );
      if (oiRows[0].cnt === 0) {
        console.log('[Database Initialization] Migrating: Creating offer_images table...');
        await connMigration.query(`
          CREATE TABLE offer_images (
            id INT AUTO_INCREMENT PRIMARY KEY,
            offer_id INT NOT NULL,
            image_data LONGTEXT NOT NULL,
            sort_order INT NOT NULL DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (offer_id) REFERENCES offers(id) ON DELETE CASCADE
          )
        `);
        console.log('[Database Initialization] ✅ offer_images table created successfully.');
      }

      const [offerColRows] = await connMigration.query(
        `SELECT column_name FROM information_schema.columns WHERE table_schema = ? AND table_name = 'offers' AND column_name IN ('description', 'video_url')`,
        [dbName]
      );
      const existingOfferCols = offerColRows.map(r => r.column_name || r.COLUMN_NAME);
      if (!existingOfferCols.includes('description')) {
        await connMigration.query(`ALTER TABLE offers ADD COLUMN description TEXT NULL`);
        console.log('[Database Initialization] ✅ Added description column to offers.');
      }
      if (!existingOfferCols.includes('video_url')) {
        await connMigration.query(`ALTER TABLE offers ADD COLUMN video_url VARCHAR(500) NULL`);
        console.log('[Database Initialization] ✅ Added video_url column to offers.');
      }

      const [pubColRows] = await connMigration.query(
        `SELECT COUNT(*) as cnt FROM information_schema.columns WHERE table_schema = ? AND table_name = 'products' AND column_name = 'is_public'`,
        [dbName]
      );
      if (pubColRows[0].cnt === 0) {
        await connMigration.query(`ALTER TABLE products ADD COLUMN is_public TINYINT(1) NOT NULL DEFAULT 0`);
        console.log('[Database Initialization] ✅ Added is_public column to products.');
      }

      const [pgColRows] = await connMigration.query(
        `SELECT COUNT(*) as cnt FROM information_schema.columns WHERE table_schema = ? AND table_name = 'products' AND column_name = 'part_group'`,
        [dbName]
      );
      if (pgColRows[0].cnt === 0) {
        await connMigration.query(`ALTER TABLE products ADD COLUMN part_group VARCHAR(100) NULL`);
        await connMigration.query(`CREATE INDEX idx_products_part_group ON products(part_group)`);
        console.log('[Database Initialization] ✅ Added part_group column to products.');
      }

      const [logoColRows] = await connMigration.query(
        `SELECT COUNT(*) as cnt FROM information_schema.columns WHERE table_schema = ? AND table_name = 'site_settings' AND column_name = 'logo'`,
        [dbName]
      );
      if (logoColRows[0].cnt === 0) {
        await connMigration.query(`ALTER TABLE site_settings ADD COLUMN logo LONGTEXT NULL`);
        console.log('[Database Initialization] ✅ Added logo column to site_settings.');
      }

      const [navColRows] = await connMigration.query(
        `SELECT COUNT(*) as cnt FROM information_schema.columns WHERE table_schema = ? AND table_name = 'site_settings' AND column_name = 'nav_config'`,
        [dbName]
      );
      if (navColRows[0].cnt === 0) {
        await connMigration.query(`ALTER TABLE site_settings ADD COLUMN nav_config TEXT NULL`);
        console.log('[Database Initialization] ✅ Added nav_config column to site_settings.');
      }

      const [vlRows] = await connMigration.query(
        `SELECT COUNT(*) as cnt FROM information_schema.tables WHERE table_schema = ? AND table_name = 'vehicle_listings'`,
        [dbName]
      );
      if (vlRows[0].cnt === 0) {
        console.log('[Database Initialization] Migrating: Creating vehicle_listings tables...');
        await connMigration.query(`
          CREATE TABLE vehicle_listings (
            id INT AUTO_INCREMENT PRIMARY KEY,
            vehicle_name VARCHAR(150) NOT NULL,
            model VARCHAR(100) NULL,
            vehicle_type VARCHAR(100) NULL,
            price DECIMAL(12, 2) NULL,
            contact_phone VARCHAR(30) NULL,
            address VARCHAR(255) NULL,
            description TEXT NULL,
            status ENUM('available', 'sold') NOT NULL DEFAULT 'available',
            created_by INT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
          )
        `);
        await connMigration.query(`
          CREATE TABLE vehicle_listing_images (
            id INT AUTO_INCREMENT PRIMARY KEY,
            listing_id INT NOT NULL,
            image_data LONGTEXT NOT NULL,
            sort_order INT NOT NULL DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (listing_id) REFERENCES vehicle_listings(id) ON DELETE CASCADE
          )
        `);
        console.log('[Database Initialization] ✅ vehicle_listings tables created successfully.');
      }

      const [supplierPhoneColumns] = await connMigration.query(
        `SELECT COLUMN_NAME FROM information_schema.columns WHERE table_schema = ? AND table_name = 'suppliers' AND column_name = 'phone_numbers'`,
        [dbName]
      );
      if (supplierPhoneColumns.length === 0) {
        await connMigration.query('ALTER TABLE suppliers ADD COLUMN phone_numbers JSON NULL');
      }

      await connMigration.end();
      return;
    }

    // 3. Read schema.sql and execute the entire file using multipleStatements
    const schemaPath = path.join(__dirname, '../schema.sql');
    if (fs.existsSync(schemaPath)) {
      console.log(`[Database Initialization] Loading schema.sql...`);
      const originalSchema = fs.readFileSync(schemaPath, 'utf8');
      const schemaSql = production?baseSchemaOnly(originalSchema):originalSchema;

      // Remove CREATE DATABASE and USE statements (already handled above)
      const cleanedSql = schemaSql
        .split('\n')
        .filter(line => {
          const upper = line.trim().toUpperCase();
          return !upper.startsWith('CREATE DATABASE') && !upper.startsWith('USE ');
        })
        .join('\n');

      // Open a multipleStatements-enabled connection to run the whole schema at once
      const schemaConn = await mysql.createConnection({
        ssl:databaseConfig.ssl,
        host: dbHost,
        user: dbUser,
        password: dbPassword,
        port: dbPort,
        database: dbName,
        multipleStatements: true
      });

      await schemaConn.query(cleanedSql);
      await schemaConn.end();
      await initDatabase();
      console.log(production?'[Database Initialization] Production tables created without demo records.':'[Database Initialization] All tables created and seed data loaded successfully.');
    } else {
      if(production)throw new Error('schema.sql is missing.');
      console.log('[Database Initialization] schema.sql not found. Please run it manually in MySQL Workbench.');
    }
  } catch (error) {
    if(production)throw error;
    console.warn('\n[Database Initialization Warning] Auto-initialization skipped or failed.');
    console.warn(`Reason: ${error.message}`);
    console.warn('Please ensure MySQL is running and credentials in backend/.env are correct.\n');
  }
};

// Production serves UI and API from one origin and fails on incomplete setup.
const startServer=async()=>{
  if(production){
    await initDatabase();
    await ensureProductionAdmin();
    serveFrontend(app,path.resolve(__dirname,'../frontend/dist'));
  }
app.listen(PORT, async () => {
  console.log(`\n==================================================`);
  console.log(`STN Motors POS API Server listening on port ${PORT}`);
  console.log(`Endpoint: http://localhost:${PORT}`);
  console.log(`==================================================\n`);
  
  // Run database checks/creations
  if(!production)await initDatabase();
});
};
startServer().catch(error=>{console.error('Server startup failed:',error.code||error.message);process.exit(1);});
