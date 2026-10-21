import pool from '../config/db.js';
import {permissionsFor} from '../../frontend/src/utils/permissions.mjs';
let ready;
export function ensureUserPermissions(){
  return ready ||= (async()=>{
    const [columns]=await pool.query("SHOW COLUMNS FROM users LIKE 'permissions'");
    if(!columns.length){try{await pool.query('ALTER TABLE users ADD COLUMN permissions JSON NULL');}catch(error){if(error.code!=='ER_DUP_FIELDNAME')throw error;}}
  })().catch(error=>{ready=null;throw error;});
}
export const publicUser=user=>user&&({id:user.id,name:user.name,email:user.email,role:user.role,status:user.status,created_at:user.created_at,permissions:permissionsFor(user)});
