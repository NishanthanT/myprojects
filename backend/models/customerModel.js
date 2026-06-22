import { query } from '../config/db.js';

export const CustomerModel = {
  getAll: async () => {
    const sql = 'SELECT * FROM customers ORDER BY name ASC';
    return await query(sql);
  },

  getById: async (id) => {
    const sql = 'SELECT * FROM customers WHERE id = ?';
    const rows = await query(sql, [id]);
    return rows[0];
  },

  getByPhone: async (phone) => {
    const sql = 'SELECT * FROM customers WHERE phone = ?';
    const rows = await query(sql, [phone]);
    return rows[0];
  },

  create: async (customerData) => {
    const { name, phone, address, pending_balance, sms_enabled } = customerData;
    const sql = `
      INSERT INTO customers (name, phone, address, pending_balance, sms_enabled) 
      VALUES (?, ?, ?, ?, ?)
    `;
    const result = await query(sql, [
      name, 
      phone, 
      address || null, 
      pending_balance || 0.00, 
      sms_enabled !== undefined ? sms_enabled : true
    ]);
    return { id: result.insertId, ...customerData };
  },

  update: async (id, customerData) => {
    const { name, phone, address, pending_balance, sms_enabled } = customerData;
    const sql = `
      UPDATE customers SET 
        name = ?, phone = ?, address = ?, pending_balance = ?, sms_enabled = ? 
      WHERE id = ?
    `;
    await query(sql, [
      name, 
      phone, 
      address || null, 
      pending_balance, 
      sms_enabled, 
      id
    ]);
    return { id, ...customerData };
  },

  delete: async (id) => {
    const sql = 'DELETE FROM customers WHERE id = ?';
    return await query(sql, [id]);
  },

  updateBalance: async (id, balanceChange) => {
    const sql = 'UPDATE customers SET pending_balance = pending_balance + ? WHERE id = ?';
    return await query(sql, [balanceChange, id]);
  }
};
