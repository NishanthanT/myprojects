import bcrypt from 'bcryptjs';
import {query} from '../config/db.js';
export function baseSchemaOnly(sql){
  const marker=sql.indexOf('-- SEED INITIAL DATA');
  if(marker<0)throw new Error('Could not identify the demo seed boundary.');
  return sql.slice(0,marker);
}
export async function ensureProductionAdmin(){
  const admins=await query("SELECT id FROM users WHERE role='admin' AND status='active' LIMIT 1");
  if(admins.length)return;
  const email=process.env.BOOTSTRAP_ADMIN_EMAIL?.trim(),password=process.env.BOOTSTRAP_ADMIN_PASSWORD;
  if(!email||!email.includes('@')||email.length>100||!password||password.length<12)throw new Error('Set BOOTSTRAP_ADMIN_EMAIL and a BOOTSTRAP_ADMIN_PASSWORD of at least 12 characters in the hosting dashboard.');
  await query("INSERT INTO users (name,email,password,role,status) VALUES (?,?,?,'admin','active')",[(process.env.BOOTSTRAP_ADMIN_NAME||'STN Motors Admin').slice(0,100),email,await bcrypt.hash(password,12)]);
  console.log('[Database Initialization] Production admin created.');
}
