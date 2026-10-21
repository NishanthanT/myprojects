import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
export function serveFrontend(app,dist){
  if(!fs.existsSync(path.join(dist,'index.html')))throw new Error('Frontend build is missing. Build frontend before starting production.');
  app.use(express.static(dist,{index:false}));
  app.get('*',(req,res,next)=>{
    if(req.path==='/api'||req.path.startsWith('/api/'))return next();
    if(path.extname(req.path))return res.status(404).end();
    res.setHeader('Cache-Control','no-cache');
    return res.sendFile(path.join(dist,'index.html'));
  });
}
