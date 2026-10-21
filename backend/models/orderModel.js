import pool, { query } from '../config/db.js';

export const OrderModel = {
  getAll: async () => {
    const sql = `
      SELECT po.*,
        (SELECT COUNT(*) FROM purchase_order_items WHERE order_id = po.id) as item_count
      FROM purchase_orders po
      ORDER BY po.created_at DESC
    `;
    return await query(sql);
  },

  getById: async (id) => {
    const orders = await query('SELECT * FROM purchase_orders WHERE id = ?', [id]);
    const order = orders[0];
    if (!order) return null;
    const items = await query(
      'SELECT * FROM purchase_order_items WHERE order_id = ? ORDER BY id ASC',
      [id]
    );
    return { ...order, items };
  },

  create: async ({ created_by, created_by_name, items }) => {
    const total_items = items.length;
    const total_quantity = items.reduce((sum, i) => sum + parseFloat(i.quantity || 0), 0);

    const result = await query(
      `INSERT INTO purchase_orders (created_by, created_by_name, total_items, total_quantity)
       VALUES (?, ?, ?, ?)`,
      [created_by || null, created_by_name, total_items, total_quantity]
    );
    const orderId = result.insertId;

    const placeholders = items.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
    const params = items.flatMap(i => [
      orderId,
      i.product_id || null,
      i.product_name,
      i.product_code,
      i.category_name || null,
      i.vehicle_type_name || null,
      i.vehicle_model_names || null,
      i.brand || null,
      i.unit_type || null,
      i.stock_at_order ?? null,
      i.buying_price ?? null,
      i.quantity
    ]);
    await query(
      `INSERT INTO purchase_order_items
        (order_id, product_id, product_name, product_code, category_name, vehicle_type_name, vehicle_model_names, brand, unit_type, stock_at_order, buying_price, quantity)
       VALUES ${placeholders}`,
      params
    );

    return await OrderModel.getById(orderId);
  },

  update: async (id, items) => {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [orders] = await connection.execute('SELECT id FROM purchase_orders WHERE id = ? FOR UPDATE', [id]);
      if (!orders.length) { await connection.rollback(); return null; }
      await connection.execute('UPDATE purchase_orders SET total_items=?, total_quantity=? WHERE id=?',
        [items.length, items.reduce((sum, item) => sum + Number(item.quantity), 0), id]);
      await connection.execute('DELETE FROM purchase_order_items WHERE order_id=?', [id]);
      const placeholders = items.map(() => '(?,?,?,?,?,?,?,?,?,?,?,?)').join(',');
      await connection.execute(`INSERT INTO purchase_order_items
        (order_id,product_id,product_name,product_code,category_name,vehicle_type_name,vehicle_model_names,brand,unit_type,stock_at_order,buying_price,quantity)
        VALUES ${placeholders}`, items.flatMap(item => [id, item.product_id || null, item.product_name, item.product_code,
        item.category_name || null, item.vehicle_type_name || null, item.vehicle_model_names || null, item.brand || null,
        item.unit_type || null, item.stock_at_order ?? null, item.buying_price ?? null, item.quantity]));
      await connection.commit();
      return { id };
    } catch (error) { await connection.rollback(); throw error; }
    finally { connection.release(); }
  },

  delete: async (id) => {
    return await query('DELETE FROM purchase_orders WHERE id = ?', [id]);
  }
};
