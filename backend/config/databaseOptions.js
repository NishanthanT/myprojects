export function databaseOptions(env=process.env){
  const options={
    host:env.DB_HOST||'localhost',user:env.DB_USER||'root',password:env.DB_PASSWORD||'',
    database:env.DB_NAME||'stn_motors',port:Number(env.DB_PORT||3306),charset:'utf8mb4'
  };
  if(env.DB_SSL==='true')options.ssl={rejectUnauthorized:true,minVersion:'TLSv1.2',...(env.DB_SSL_CA?{ca:env.DB_SSL_CA.replace(/\\n/g,'\n')}:{})};
  return options;
}
