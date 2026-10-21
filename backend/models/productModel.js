import { query } from '../config/db.js';

export const ProductModel = {
  getAll: async () => {
    const sql = `
      SELECT p.*, c.category_name, s.supplier_name,
             vt.type_name AS vehicle_type_name,
             GROUP_CONCAT(DISTINCT pvm.model_id ORDER BY vm.model_name SEPARATOR ',') AS vehicle_model_ids,
             GROUP_CONCAT(DISTINCT vm.model_name ORDER BY vm.model_name SEPARATOR '||') AS vehicle_model_names
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      LEFT JOIN vehicle_types vt ON p.vehicle_type_id = vt.id
      LEFT JOIN product_vehicle_models pvm ON p.id = pvm.product_id
      LEFT JOIN vehicle_models vm ON pvm.model_id = vm.id
      GROUP BY p.id
      ORDER BY p.id DESC
    `;
    return await query(sql);
  },

  getById: async (id) => {
    const sql = 'SELECT * FROM products WHERE id = ?';
    const rows = await query(sql, [id]);
    return rows[0];
  },

  // ─── Product Images ──────────────────────────────────────────
  getProductImages: async (product_id) => {
    const sql = 'SELECT id, image_data FROM product_images WHERE product_id = ? ORDER BY sort_order ASC, id ASC';
    return await query(sql, [product_id]);
  },

  setProductImages: async (product_id, images) => {
    // Delete existing images
    await query('DELETE FROM product_images WHERE product_id = ?', [product_id]);
    // Insert new images
    if (images && images.length > 0) {
      const placeholders = images.map(() => '(?, ?, ?)').join(', ');
      const params = images.flatMap((img, idx) => [product_id, img, idx]);
      await query(`INSERT INTO product_images (product_id, image_data, sort_order) VALUES ${placeholders}`, params);
    }
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

  setPublicStatus: async (productIds, isPublic) => {
    if (!productIds || productIds.length === 0) return;
    const placeholders = productIds.map(() => '?').join(',');
    await query(
      `UPDATE products SET is_public = ? WHERE id IN (${placeholders})`,
      [isPublic ? 1 : 0, ...productIds]
    );
  },

  getPublicProductImages: async (productIds) => {
    if (!productIds || productIds.length === 0) return [];
    const placeholders = productIds.map(() => '?').join(',');
    return await query(
      `SELECT * FROM product_images WHERE product_id IN (${placeholders}) ORDER BY sort_order ASC, id ASC`,
      productIds
    );
  },

  getPublicProducts: async () => {
    const sql = `
      SELECT p.*, c.category_name, vt.type_name AS vehicle_type_name,
             GROUP_CONCAT(DISTINCT vm.model_name ORDER BY vm.model_name SEPARATOR '||') AS vehicle_model_names
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN vehicle_types vt ON p.vehicle_type_id = vt.id
      LEFT JOIN product_vehicle_models pvm ON p.id = pvm.product_id
      LEFT JOIN vehicle_models vm ON pvm.model_id = vm.id
      WHERE p.is_public = 1 AND p.status = 'active'
      GROUP BY p.id
      ORDER BY p.product_name ASC
    `;
    return await query(sql);
  },

  search: async (queryString) => {
    const sql = `
      SELECT p.*, c.category_name 
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE (p.product_name LIKE ? OR p.product_code LIKE ? OR p.barcode LIKE ? OR p.part_group LIKE ?) 
      AND p.status = 'active'
      ORDER BY p.part_group IS NULL, p.part_group, p.brand
      LIMIT 10
    `;
    const searchVal = `%${queryString}%`;
    return await query(sql, [searchVal, searchVal, searchVal, searchVal]);
  },

  create: async (productData) => {
    const { 
      product_name, product_code, barcode, category_id, brand, part_group,
      unit_type, buying_price, selling_price, stock_qty, low_stock_limit, 
      supplier_id, image, status, vehicle_type_id
    } = productData;
    
    const sql = `
      INSERT INTO products (
        product_name, product_code, barcode, category_id, brand, part_group,
        unit_type, buying_price, selling_price, stock_qty, low_stock_limit, 
        supplier_id, image, status, vehicle_type_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const result = await query(sql, [
      product_name, product_code, barcode || null, category_id || null, brand, part_group || null,
      unit_type, buying_price, selling_price, stock_qty || 0.000, low_stock_limit || 5.000, 
      supplier_id || null, image || null, status || 'active', vehicle_type_id || null
    ]);
    
    return { id: result.insertId, ...productData };
  },

  update: async (id, productData) => {
    const { 
      product_name, product_code, barcode, category_id, brand, part_group,
      unit_type, buying_price, selling_price, stock_qty, low_stock_limit, 
      supplier_id, image, status, vehicle_type_id
    } = productData;
    
    const sql = `
      UPDATE products SET 
        product_name = ?, product_code = ?, barcode = ?, category_id = ?, brand = ?, part_group = ?,
        unit_type = ?, buying_price = ?, selling_price = ?, stock_qty = ?, low_stock_limit = ?, 
        supplier_id = ?, image = ?, status = ?, vehicle_type_id = ?
      WHERE id = ?
    `;
    
    await query(sql, [
      product_name, product_code, barcode || null, category_id || null, brand, part_group || null,
      unit_type, buying_price, selling_price, stock_qty, low_stock_limit, 
      supplier_id || null, image || null, status, vehicle_type_id || null, id
    ]);
    
    return { id, ...productData };
  },

  delete: async (id) => {
    const sql = 'DELETE FROM products WHERE id = ?';
    return await query(sql, [id]);
  },

  softDelete: async (id) => {
    const sql = 'UPDATE products SET status = "inactive" WHERE id = ?';
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

  // ─── Part Groups (same physical part across different brands) ────
  // A part_group ties variants of one part together: same fitment, different
  // company/brand, own stock and own price. Used for the "other brands"
  // suggestion at billing time.
  getGroupSiblings: async (part_group, excludeId) => {
    const sql = `
      SELECT id, product_name, product_code, brand, unit_type,
             selling_price, stock_qty, status
      FROM products
      WHERE part_group = ? AND id <> ? AND status = 'active'
      ORDER BY selling_price ASC
    `;
    return await query(sql, [part_group, excludeId || 0]);
  },

  // ─── Categories ─────────────────────────────────────────────
  getCategories: async () => {
    const sql = 'SELECT * FROM categories ORDER BY category_name ASC';
    return await query(sql);
  },

  createCategory: async (category_name) => {
    const sql = 'INSERT INTO categories (category_name, status) VALUES (?, "active")';
    const result = await query(sql, [category_name]);
    return { id: result.insertId, category_name, status: 'active' };
  },

  updateCategory: async (id, category_name) => {
    const sql = 'UPDATE categories SET category_name = ? WHERE id = ?';
    await query(sql, [category_name, id]);
    return { id, category_name };
  },

  deleteCategory: async (id) => {
    const sql = 'DELETE FROM categories WHERE id = ?';
    return await query(sql, [id]);
  },

  // ─── Vehicle Types ───────────────────────────────────────────
  getVehicleTypes: async () => {
    const sql = 'SELECT * FROM vehicle_types ORDER BY type_name ASC';
    return await query(sql);
  },

  createVehicleType: async (type_name) => {
    const sql = 'INSERT INTO vehicle_types (type_name) VALUES (?)';
    const result = await query(sql, [type_name]);
    return { id: result.insertId, type_name };
  },

  updateVehicleType: async (id, type_name) => {
    const sql = 'UPDATE vehicle_types SET type_name = ? WHERE id = ?';
    await query(sql, [type_name, id]);
    return { id: parseInt(id), type_name };
  },

  deleteVehicleType: async (id) => {
    const sql = 'DELETE FROM vehicle_types WHERE id = ?';
    return await query(sql, [id]);
  },

  // ─── Vehicle Models ──────────────────────────────────────────
  getAllVehicleModels: async () => {
    const sql = `
      SELECT vm.*, vt.type_name
      FROM vehicle_models vm
      LEFT JOIN vehicle_types vt ON vm.vehicle_type_id = vt.id
      ORDER BY vt.type_name ASC, vm.model_name ASC
    `;
    return await query(sql);
  },

  getVehicleModelsByType: async (type_id) => {
    const sql = 'SELECT * FROM vehicle_models WHERE vehicle_type_id = ? ORDER BY model_name ASC';
    return await query(sql, [type_id]);
  },

  createVehicleModel: async (model_name, vehicle_type_id) => {
    const sql = 'INSERT INTO vehicle_models (model_name, vehicle_type_id) VALUES (?, ?)';
    const result = await query(sql, [model_name, vehicle_type_id]);
    return { id: result.insertId, model_name, vehicle_type_id };
  },

  updateVehicleModel: async (id, model_name, vehicle_type_id) => {
    const sql = 'UPDATE vehicle_models SET model_name = ?, vehicle_type_id = ? WHERE id = ?';
    await query(sql, [model_name, vehicle_type_id, id]);
    return { id: parseInt(id), model_name, vehicle_type_id };
  },

  deleteVehicleModel: async (id) => {
    const sql = 'DELETE FROM vehicle_models WHERE id = ?';
    return await query(sql, [id]);
  },

  // ─── Product ↔ Vehicle Model (junction) ─────────────────────
  getProductModels: async (product_id) => {
    const sql = `
      SELECT pvm.model_id, vm.model_name, vm.vehicle_type_id, vt.type_name
      FROM product_vehicle_models pvm
      JOIN vehicle_models vm ON pvm.model_id = vm.id
      JOIN vehicle_types vt ON vm.vehicle_type_id = vt.id
      WHERE pvm.product_id = ?
    `;
    return await query(sql, [product_id]);
  },

  setProductModels: async (product_id, model_ids) => {
    // Delete existing links
    await query('DELETE FROM product_vehicle_models WHERE product_id = ?', [product_id]);
    // Insert new links
    if (model_ids && model_ids.length > 0) {
      const placeholders = model_ids.map(() => '(?, ?)').join(', ');
      const params = model_ids.flatMap(mid => [product_id, parseInt(mid)]);
      await query(`INSERT INTO product_vehicle_models (product_id, model_id) VALUES ${placeholders}`, params);
    }
  }
};
