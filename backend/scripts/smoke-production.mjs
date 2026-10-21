// Run from backend: node scripts/smoke-production.mjs
// Uses and deletes only a newly generated local test database.
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import {createServer} from 'node:net';
import {once} from 'node:events';
import {databaseOptions} from '../config/databaseOptions.js';
dotenv.config();
const options=databaseOptions();
if(!['localhost','127.0.0.1','::1'].includes(options.host))throw new Error('Smoke test is restricted to a local database.');
const db=`stn_deploy_test_${Date.now()}`;
if(!/^stn_deploy_test_\d+$/.test(db))throw new Error('Unexpected test database name.');
const admin=await mysql.createConnection({...options,database:undefined});
const probe=createServer();probe.listen(0,'127.0.0.1');await once(probe,'listening');
const port=probe.address().port;await new Promise(resolve=>probe.close(resolve));
const password=randomBytes(24).toString('hex'),email='deploy-test@example.invalid';
let output='',child;
try{
  child=spawn(process.execPath,['server.js'],{cwd:process.cwd(),windowsHide:true,env:{...process.env,NODE_ENV:'production',DB_NAME:db,DB_CREATE_DATABASE:'true',PORT:String(port),JWT_SECRET:randomBytes(32).toString('hex'),BOOTSTRAP_ADMIN_EMAIL:email,BOOTSTRAP_ADMIN_PASSWORD:password},stdio:['ignore','pipe','pipe']});
  child.stdout.on('data',data=>output+=data);child.stderr.on('data',data=>output+=data);
  const url=`http://127.0.0.1:${port}`;
  let ready=false;
  for(let i=0;i<80;i++){
    if(child.exitCode!==null)throw new Error('Production startup failed: '+output.replaceAll(password,'[redacted]'));
    try{ready=(await fetch(url+'/api/health',{signal:AbortSignal.timeout(1000)})).ok;}catch{}
    if(ready)break;
    await new Promise(resolve=>setTimeout(resolve,500));
  }
  assert.ok(ready,'Production server did not become ready.');
  const login=await fetch(url+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password})});
  const auth=await login.json();assert.equal(login.status,200);assert.ok(auth.token);
  const paths=['/api/products','/api/customers','/api/suppliers','/api/orders','/api/sales','/api/site-settings','/api/public/settings','/api/public/products','/api/public/offers','/api/public/filters','/api/public/vehicle-listings','/api/public/mechanical-services'];
  for(const route of paths){const response=await fetch(url+route,{headers:{Authorization:`Bearer ${auth.token}`}});assert.equal(response.status,200,route+' '+await response.text());}
  for(const route of ['/login','/pos','/shop','/shop/mechanical-services']){const response=await fetch(url+route);assert.equal(response.status,200);assert.match(response.headers.get('content-type'),/html/);}
  const [users]=await admin.query(`SELECT role,COUNT(*) count FROM \`${db}\`.users GROUP BY role`);
  assert.equal(users.length,1);assert.equal(users[0].role,'admin');assert.equal(Number(users[0].count),1);
  for(const table of ['products','customers','suppliers','sales']){const [rows]=await admin.query(`SELECT COUNT(*) count FROM \`${db}\`.\`${table}\``);assert.equal(Number(rows[0].count),0);}
  console.log(JSON.stringify({freshProductionStartup:true,adminLogin:true,apiRoutes:paths.length,spaRoutes:4,businessRecords:0,demoUsers:0}));
}finally{
  if(child&&child.exitCode===null){child.kill();await once(child,'exit');}
  await admin.query(`DROP DATABASE IF EXISTS \`${db}\``);await admin.end();
}
