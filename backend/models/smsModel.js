import { query } from '../config/db.js';

export const SmsModel = {
  getAll: async () => {
    const sql = `
      SELECT sl.*, c.name as customer_name 
      FROM sms_logs sl
      LEFT JOIN customers c ON sl.customer_id = c.id
      ORDER BY sl.id DESC
    `;
    return await query(sql);
  },

  createLog: async (smsData) => {
    const { customer_id, phone, message, status } = smsData;
    const sql = `
      INSERT INTO sms_logs (customer_id, phone, message, status) 
      VALUES (?, ?, ?, ?)
    `;
    const result = await query(sql, [customer_id || null, phone, message, status || 'sent']);
    return { id: result.insertId, ...smsData, sent_at: new Date() };
  }
};
