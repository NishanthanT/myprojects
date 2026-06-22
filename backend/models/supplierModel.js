import { query } from '../config/db.js';

export const SupplierModel = {
  getAll: async () => {
    const sql = 'SELECT * FROM suppliers ORDER BY supplier_name ASC';
    return await query(sql);
  },

  getById: async (id) => {
    const sql = 'SELECT * FROM suppliers WHERE id = ?';
    const rows = await query(sql, [id]);
    return rows[0];
  },

  create: async (supplierData) => {
    const { supplier_name, company_name, phone, address } = supplierData;
    const sql = `
      INSERT INTO suppliers (supplier_name, company_name, phone, address) 
      VALUES (?, ?, ?, ?)
    `;
    const result = await query(sql, [supplier_name, company_name, phone, address || null]);
    return { id: result.insertId, ...supplierData };
  },

  update: async (id, supplierData) => {
    const { supplier_name, company_name, phone, address } = supplierData;
    const sql = `
      UPDATE suppliers SET 
        supplier_name = ?, company_name = ?, phone = ?, address = ? 
      WHERE id = ?
    `;
    await query(sql, [supplier_name, company_name, phone, address || null, id]);
    return { id, ...supplierData };
  },

  delete: async (id) => {
    const sql = 'DELETE FROM suppliers WHERE id = ?';
    return await query(sql, [id]);
  }
};
