import pool, { query } from '../config/db.js';
import {ensureUserPermissions,publicUser} from '../services/userPermissions.js';

export const UserModel = {
  findByEmail: async (email) => {
    await ensureUserPermissions();
    const sql = 'SELECT * FROM users WHERE email = ? AND status = "active"';
    const rows = await query(sql, [email]);
    return rows[0];
  },

  findById: async (id) => {
    await ensureUserPermissions();
    const sql = 'SELECT id, name, email, role, status, permissions, created_at FROM users WHERE id = ?';
    const rows = await query(sql, [id]);
    return publicUser(rows[0]);
  },

  getAll: async () => {
    await ensureUserPermissions();
    const sql = 'SELECT id, name, email, role, status, permissions, created_at FROM users ORDER BY id DESC';
    return (await query(sql)).map(publicUser);
  },

  create: async (userData) => {
    await ensureUserPermissions();
    const { name, email, password, role, status, permissions } = userData;
    const sql = 'INSERT INTO users (name, email, password, role, status, permissions) VALUES (?, ?, ?, ?, ?, ?)';
    const result = await query(sql, [name,email,password,role,status||'active',permissions==null?null:JSON.stringify(permissions)]);
    return UserModel.findById(result.insertId);
  },

  update: async (id, userData) => {
    await ensureUserPermissions();
    const { name, email, role, status, permissions, password } = userData;
    const connection=await pool.getConnection();
    try{
      await connection.beginTransaction();
      const [admins]=await connection.execute("SELECT id FROM users WHERE role='admin' AND status='active' ORDER BY id FOR UPDATE");
      if(admins.length<=1&&admins.some(admin=>admin.id===Number(id))&&(role!=='admin'||status!=='active'))throw new Error('At least one active admin must remain.');
      const sql = 'UPDATE users SET name = ?, email = ?, role = ?, status = ?, permissions = ? WHERE id = ?';
      await connection.execute(sql,[name,email,role,status,permissions==null?null:JSON.stringify(permissions),id]);
      if(password)await connection.execute('UPDATE users SET password=? WHERE id=?',[password,id]);
      await connection.commit();
    }catch(error){await connection.rollback();throw error;}finally{connection.release();}
    return UserModel.findById(id);
  },

  delete: async (id) => {
    const connection=await pool.getConnection();
    try{
      await connection.beginTransaction();
      const [admins]=await connection.execute("SELECT id FROM users WHERE role='admin' AND status='active' ORDER BY id FOR UPDATE");
      if(admins.length<=1&&admins.some(admin=>admin.id===Number(id)))throw new Error('At least one active admin must remain.');
      const [result]=await connection.execute('DELETE FROM users WHERE id=?',[id]);
      await connection.commit();return result;
    }catch(error){await connection.rollback();throw error;}finally{connection.release();}
  },

  // Includes the password hash — only for verifying a change-password request.
  findByIdWithPassword: async (id) => {
    const rows = await query('SELECT * FROM users WHERE id = ?', [id]);
    return rows[0];
  },

  updatePassword: async (id, hashedPassword) => {
    return await query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, id]);
  }
};
