import dotenv from 'dotenv';
dotenv.config();
export function authSecret(env=process.env){
  if(env.NODE_ENV==='production'&&(!env.JWT_SECRET||env.JWT_SECRET.length<32||env.JWT_SECRET==='stn_motors_super_secret_token_key_2026'))throw new Error('Production requires a unique JWT_SECRET of at least 32 characters.');
  return env.JWT_SECRET||'stn_motors_super_secret_token_key_2026';
}
