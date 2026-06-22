import { query } from '../config/db.js';

export const ProductModel = {
  getAll: async () => {
    const sql = `
      SELECT p.*, c.category_name, s.supplier_name 
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      ORDER BY p.id DESC
    `;
    return await query(sql);
  },

  getById: async (id) => {
    const sql = 'SELECT * FROM products WHERE id = ?';
    const rows = await query(sql, [id]);
    return rows[0];
  },

  getByProductCode: async (code) => {
    const sql = 'SELECT * FROM products WHERE product_code = ?';
    const rows = await query(sql, [code]);
    return rows[0];
  },

  getByBarcode: async (barcode) => {
    const sql = 'SELECT * FROM products WHERE barcode = ? AND status = "active"';
    const rows = await query(sql, [barcode]);
    return rows[0];
  },

  search: async (queryString) => {
    const sql = `
      SELECT p.*, c.category_name 
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE (p.product_name LIKE ? OR p.product_code LIKE ? OR p.barcode LIKE ?) 
      AND p.status = 'active'
      LIMIT 10
    `;
    const searchVal = `%${queryString}%`;
    return await query(sql, [searchVal, searchVal, searchVal]);
  },

  create: async (productData) => {
    const { 
      product_name, product_code, barcode, category_id, brand, 
      unit_type, buying_price, selling_price, stock_qty, low_stock_limit, 
      supplier_id, image, status 
    } = productData;
    
    const sql = `
      INSERT INTO products (
        product_name, product_code, barcode, category_id, brand, 
        unit_type, buying_price, selling_price, stock_qty, low_stock_limit, 
        supplier_id, image, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const result = await query(sql, [
      product_name, product_code, barcode || null, category_id || null, brand, 
      unit_type, buying_price, selling_price, stock_qty || 0.000, low_stock_limit || 5.000, 
      supplier_id || null, image || null, status || 'active'
    ]);
    
    return { id: result.insertId, ...productData };
  },

  update: async (id, productData) => {
    const { 
      product_name, product_code, barcode, category_id, brand, 
      unit_type, buying_price, selling_price, stock_qty, low_stock_limit, 
      supplier_id, image, status 
    } = productData;
    
    const sql = `
      UPDATE products SET 
        product_name = ?, product_code = ?, barcode = ?, category_id = ?, brand = ?, 
        unit_type = ?, buying_price = ?, selling_price = ?, stock_qty = ?, low_stock_limit = ?, 
        supplier_id = ?, image = ?, status = ?
      WHERE id = ?
    `;
    
    await query(sql, [
      product_name, product_code, barcode || null, category_id || null, brand, 
      unit_type, buying_price, selling_price, stock_qty, low_stock_limit, 
      supplier_id || null, image || null, status, id
    ]);
    
    return { id, ...productData };
  },

  delete: async (id) => {
    const sql = 'DELETE FROM products WHERE id = ?';
    return await query(sql, [id]);
  },

  updateStock: async (id, quantityChange) => {
    const sql = 'UPDATE products SET stock_qty = stock_qty + ? WHERE id = ?';
    return await query(sql, [quantityChange, id]);
  },

  getLowStock: async () => {
    const sql = `
      SELECT p.*, c.category_name 
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.stock_qty <= p.low_stock_limit AND p.status = 'active'
      ORDER BY p.stock_qty ASC
    `;
    return await query(sql);
  },

  // Categories Helpers
  getCategories: async () => {
    const sql = 'SELECT * FROM categories ORDER BY category_name ASC';
    return await query(sql);
  },

  createCategory: async (category_name) => {
    const sql = 'INSERT INTO categories (category_name, status) VALUES (?, "active")';
    const result = await query(sql, [category_name]);
    return { id: result.insertId, category_name, status: 'active' };
  }
};
