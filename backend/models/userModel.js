import { query } from '../config/db.js';

export const UserModel = {
  findByEmail: async (email) => {
    const sql = 'SELECT * FROM users WHERE email = ? AND status = "active"';
    const rows = await query(sql, [email]);
    return rows[0];
  },

  findById: async (id) => {
    const sql = 'SELECT id, name, email, role, status, created_at FROM users WHERE id = ?';
    const rows = await query(sql, [id]);
    return rows[0];
  },

  getAll: async () => {
    const sql = 'SELECT id, name, email, role, status, created_at FROM users ORDER BY id DESC';
    return await query(sql);
  },

  create: async (userData) => {
    const { name, email, password, role } = userData;
    const sql = 'INSERT INTO users (name, email, password, role, status) VALUES (?, ?, ?, ?, "active")';
    const result = await query(sql, [name, email, password, role]);
    return { id: result.insertId, ...userData };
  },

  update: async (id, userData) => {
    const { name, email, role, status } = userData;
    const sql = 'UPDATE users SET name = ?, email = ?, role = ?, status = ? WHERE id = ?';
    await query(sql, [name, email, role, status, id]);
    return { id, ...userData };
  },

  delete: async (id) => {
    const sql = 'DELETE FROM users WHERE id = ?';
    return await query(sql, [id]);
  }
};
