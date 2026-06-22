import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';

// Import db pool
import pool from './config/db.js';

// Import routes
import authRoutes from './routes/authRoutes.js';
import productRoutes from './routes/productRoutes.js';
import customerRoutes from './routes/customerRoutes.js';
import supplierRoutes from './routes/supplierRoutes.js';
import salesRoutes from './routes/salesRoutes.js';
import offerRoutes from './routes/offerRoutes.js';
import smsRoutes from './routes/smsRoutes.js';
import reportRoutes from './routes/reportRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// API Routes Mapping
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/offers', offerRoutes);
app.use('/api/sms', smsRoutes);
app.use('/api/reports', reportRoutes);

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
    const adminConn = await mysql.createConnection({
      host: dbHost,
      user: dbUser,
      password: dbPassword,
      port: dbPort
    });
    await adminConn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\`;`);
    await adminConn.end();
    console.log(`[Database Initialization] Database "${dbName}" verified.`);

    // 2. Check if tables already exist — skip schema run if they do
    const checkConn = await mysql.createConnection({
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
      await connMigration.end();
      return;
    }

    // 3. Read schema.sql and execute the entire file using multipleStatements
    const schemaPath = path.join(__dirname, '../schema.sql');
    if (fs.existsSync(schemaPath)) {
      console.log(`[Database Initialization] Loading schema.sql...`);
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');

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
        host: dbHost,
        user: dbUser,
        password: dbPassword,
        port: dbPort,
        database: dbName,
        multipleStatements: true
      });

      await schemaConn.query(cleanedSql);
      await schemaConn.end();
      console.log('[Database Initialization] ✅ All tables created and seed data loaded successfully.');
    } else {
      console.log('[Database Initialization] schema.sql not found. Please run it manually in MySQL Workbench.');
    }
  } catch (error) {
    console.warn('\n[Database Initialization Warning] Auto-initialization skipped or failed.');
    console.warn(`Reason: ${error.message}`);
    console.warn('Please ensure MySQL is running and credentials in backend/.env are correct.\n');
  }
};

// Start Server
app.listen(PORT, async () => {
  console.log(`\n==================================================`);
  console.log(`STN Motors POS API Server listening on port ${PORT}`);
  console.log(`Endpoint: http://localhost:${PORT}`);
  console.log(`==================================================\n`);
  
  // Run database checks/creations
  await initDatabase();
});
