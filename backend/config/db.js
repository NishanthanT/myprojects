import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import {databaseOptions} from './databaseOptions.js';

dotenv.config();

// Create connection pool
export const databaseConfig=databaseOptions();
const pool = mysql.createPool({
  ...databaseConfig,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Helper query function for models
export const query = async (sql, params) => {
  try {
    const [results] = await pool.execute(sql, params);
    return results;
  } catch (error) {
    console.error('Database Query Error:', error);
    throw error;
  }
};

export default pool;
