import { query } from '../config/db.js';

const withPhones = (supplier) => supplier && ({
  ...supplier,
  phone_numbers: (typeof supplier.phone_numbers === 'string'
    ? JSON.parse(supplier.phone_numbers) : supplier.phone_numbers) || [{ label: '', number: supplier.phone }]
});

export const SupplierModel = {
  getAll: async () => {
    const sql = 'SELECT * FROM suppliers ORDER BY supplier_name ASC';
    return (await query(sql)).map(withPhones);
  },

  getById: async (id) => {
    const sql = 'SELECT * FROM suppliers WHERE id = ?';
    const rows = await query(sql, [id]);
    return withPhones(rows[0]);
  },

  create: async (supplierData) => {
    const { supplier_name, company_name, phone, address, phone_numbers } = supplierData;
    const sql = `
      INSERT INTO suppliers (supplier_name, company_name, phone, address, phone_numbers)
      VALUES (?, ?, ?, ?, ?)
    `;
    const result = await query(sql, [supplier_name, company_name, phone, address || null, JSON.stringify(phone_numbers)]);
    return { id: result.insertId, ...supplierData };
  },

  update: async (id, supplierData) => {
    const { supplier_name, company_name, phone, address, phone_numbers } = supplierData;
    const sql = `
      UPDATE suppliers SET 
        supplier_name = ?, company_name = ?, phone = ?, address = ?, phone_numbers = ?
      WHERE id = ?
    `;
    await query(sql, [supplier_name, company_name, phone, address || null, JSON.stringify(phone_numbers), id]);
    return { id, ...supplierData };
  },

  delete: async (id) => {
    const sql = 'DELETE FROM suppliers WHERE id = ?';
    return await query(sql, [id]);
  }
};
