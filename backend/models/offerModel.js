import { query } from '../config/db.js';

export const OfferModel = {
  getAll: async () => {
    const sql = `
      SELECT o.*, p.product_name, c.category_name 
      FROM offers o
      LEFT JOIN products p ON o.product_id = p.id
      LEFT JOIN categories c ON o.category_id = c.id
      ORDER BY o.id DESC
    `;
    return await query(sql);
  },

  getById: async (id) => {
    const sql = 'SELECT * FROM offers WHERE id = ?';
    const rows = await query(sql, [id]);
    return rows[0];
  },

  create: async (offerData) => {
    const { offer_name, offer_type, discount_value, product_id, category_id, start_date, end_date, status } = offerData;
    const sql = `
      INSERT INTO offers (
        offer_name, offer_type, discount_value, product_id, category_id, start_date, end_date, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const result = await query(sql, [
      offer_name, 
      offer_type, 
      discount_value, 
      product_id || null, 
      category_id || null, 
      start_date, 
      end_date, 
      status || 'active'
    ]);
    return { id: result.insertId, ...offerData };
  },

  update: async (id, offerData) => {
    const { offer_name, offer_type, discount_value, product_id, category_id, start_date, end_date, status } = offerData;
    const sql = `
      UPDATE offers SET 
        offer_name = ?, offer_type = ?, discount_value = ?, product_id = ?, category_id = ?, 
        start_date = ?, end_date = ?, status = ? 
      WHERE id = ?
    `;
    await query(sql, [
      offer_name, 
      offer_type, 
      discount_value, 
      product_id || null, 
      category_id || null, 
      start_date, 
      end_date, 
      status, 
      id
    ]);
    return { id, ...offerData };
  },

  delete: async (id) => {
    const sql = 'DELETE FROM offers WHERE id = ?';
    return await query(sql, [id]);
  },

  getActiveOffers: async () => {
    const sql = `
      SELECT * FROM offers 
      WHERE status = 'active' AND CURDATE() BETWEEN start_date AND end_date
    `;
    return await query(sql);
  }
};
