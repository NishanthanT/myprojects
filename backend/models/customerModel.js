import { query } from '../config/db.js';
import { saleVersion } from '../services/saleEdit.js';

export const CustomerModel = {
  getAll: async () => {
    const sql = `SELECT c.*, COALESCE(h.purchase_total,0) AS purchase_total,
      COALESCE(h.bill_count,0) AS bill_count, h.last_purchase_date, h.oldest_credit_date,
      h.purchase_months,
      CASE WHEN c.pending_balance > 0 AND h.oldest_credit_date IS NOT NULL THEN
        GREATEST(0,TIMESTAMPDIFF(MONTH,h.oldest_credit_date,DATE(CONVERT_TZ(UTC_TIMESTAMP(),'+00:00','+05:30'))))
        ELSE NULL END AS credit_age_months
      FROM customers c LEFT JOIN (
        SELECT customer_id,SUM(total_amount) AS purchase_total,COUNT(*) AS bill_count,
          MAX(DATE_FORMAT(sale_date,'%Y-%m-%d')) AS last_purchase_date,
          MIN(CASE WHEN payment_method='Credit' AND balance_amount>0 THEN DATE(sale_date) END) AS oldest_credit_date,
          GROUP_CONCAT(DISTINCT DATE_FORMAT(sale_date,'%Y-%m') ORDER BY sale_date SEPARATOR ',') AS purchase_months
        FROM sales GROUP BY customer_id
      ) h ON h.customer_id=c.id ORDER BY c.name ASC`;
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

  getHistory: async (id) => {
    const sales = await query(`SELECT s.*, DATE_FORMAT(s.sale_date,'%Y-%m-%d') AS date,
      u.name AS cashier_name FROM sales s LEFT JOIN users u ON u.id=s.cashier_id
      WHERE s.customer_id=? ORDER BY s.sale_date DESC,s.id DESC`, [id]);
    const items = await query(`SELECT si.*,p.product_name,p.product_code,p.unit_type
      FROM sale_items si JOIN sales s ON s.id=si.sale_id LEFT JOIN products p ON p.id=si.product_id
      WHERE s.customer_id=? ORDER BY si.id`, [id]);
    const bySale = new Map();
    for (const item of items) {
      if (!bySale.has(item.sale_id)) bySale.set(item.sale_id, []);
      bySale.get(item.sale_id).push(item);
    }
    return sales.map(sale => { const saleItems=bySale.get(sale.id)||[]; return { ...sale, items:saleItems, version:saleVersion(sale,saleItems) }; });
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
