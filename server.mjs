import http from 'node:http';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes, createHash } from 'node:crypto';
import { db, dataDir, hashPassword, verifyPassword, audit } from './db.mjs';
const root=resolve(fileURLToPath(new URL('./public',import.meta.url)));
const uploads=resolve(dataDir,'uploads'); mkdirSync(uploads,{recursive:true});
const portArg=process.argv.indexOf('--port');
const port=Number(portArg>=0?process.argv[portArg+1]:(process.env.PORT||3000)), production=process.env.NODE_ENV==='production';
const origin=process.env.APP_ORIGIN||`http://localhost:${port}`;
if(production && !origin.startsWith('https://')) throw Error('Production requires APP_ORIGIN=https://your-domain');
const sha=s=>createHash('sha256').update(s).digest('hex');
const error=(message,status=400)=>{throw Object.assign(Error(message),{status});};
const str=(v,max=200)=>{if(typeof v!=='string'||v.trim().length>max)error('Invalid text field');return v.trim();};
const required=(v,max=200)=>{const s=str(v,max);if(!s)error('A required field is missing');return s;};
const integer=(v,min=0,max=100000000)=>{if(!Number.isSafeInteger(v)||v<min||v>max)error('Invalid number');return v;};
const email=v=>{const s=required(v,254).toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s))error('Enter a valid email');return s;};
const rates=new Map();
function throttle(key,max=20){const now=Date.now();let r=rates.get(key);if(!r||r.until<now)rates.set(key,r={n:0,until:now+15*60000});if(++r.n>max)error('Too many attempts. Try again in 15 minutes.',429);}
setInterval(()=>{for(const [k,v] of rates)if(v.until<Date.now())rates.delete(k);db.prepare('DELETE FROM sessions WHERE expires<?').run(Date.now());},60000).unref();
function session(req){const t=/(?:^|;\s*)eatone_session=([a-f0-9]+)/.exec(req.headers.cookie||'')?.[1];return t?db.prepare('SELECT s.*,u.name,u.email,u.role FROM sessions s JOIN users u ON u.id=s.user_id WHERE token=? AND expires>?').get(sha(t),Date.now()):null;}
function account(req,admin=false){const s=session(req);if(!s)error('Please sign in',401);if(admin&&s.role!=='admin')error('Admin access required',403);return s;}
function csrf(req){const s=session(req);if(!s||req.headers['x-csrf-token']!==s.csrf)error('Session expired. Refresh and try again.',403);}
async function body(req){let size=0,parts=[];for await(const c of req){size+=c.length;if(size>3000000)error('Request too large',413);parts.push(c);}try{return JSON.parse(Buffer.concat(parts).toString());}catch{error('Invalid JSON');}}
function send(res,status,value,headers={}){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...headers});res.end(JSON.stringify(value));}
function login(res,u){const token=randomBytes(32).toString('hex'),csrf=randomBytes(24).toString('hex');db.prepare('INSERT INTO sessions VALUES(?,?,?,?)').run(sha(token),u.id,csrf,Date.now()+8*3600000);send(res,200,{user:{id:u.id,name:u.name,email:u.email,role:u.role},csrf},{'Set-Cookie':`eatone_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800${production?'; Secure':''}`});}
function transaction(fn){db.exec('BEGIN IMMEDIATE');try{const out=fn();db.exec('COMMIT');return out;}catch(e){db.exec('ROLLBACK');throw e;}}
function publicOrder(o){return {...o,items:JSON.parse(o.items),tracking_hash:undefined,request_hash:undefined,request_key:undefined};}
function product(b){return [required(b.name,120),str(b.description,3000),required(b.category,60),required(b.pack,80),integer(b.price,1),integer(b.stock,0,100000),str(b.image,150),b.active===false?0:1,str(b.ingredients,1500),str(b.allergens,800),str(b.shelf_life,150)];}
async function route(req,res){
 const path=new URL(req.url,'http://local').pathname, method=req.method;
 if(path.startsWith('/api/')){
  if(!['GET','HEAD'].includes(method)){
   const incoming=req.headers.origin;
   if(incoming && incoming!==origin)error('Origin not allowed',403);
   if(req.headers['sec-fetch-site']==='cross-site')error('Cross-site request rejected',403);
   if(!String(req.headers['content-type']).startsWith('application/json'))error('JSON required',415);
  }
  const ip=req.socket.remoteAddress||'unknown';
  if(path==='/api/session'&&method==='GET'){const s=session(req);return send(res,200,s?{user:{id:s.user_id,name:s.name,email:s.email,role:s.role},csrf:s.csrf}:{user:null});}
  if(path==='/api/register'&&method==='POST'){
   throttle('register:'+ip,10);const b=await body(req),em=email(b.email),name=required(b.name,100),pw=required(b.password,128);if(pw.length<12)error('Use at least 12 characters for your password');
   if(db.prepare('SELECT id FROM users WHERE email=?').get(em))error('Unable to register this email. Try signing in.');
   const r=db.prepare("INSERT INTO users(name,email,hash,role) VALUES(?,?,?,'customer')").run(name,em,hashPassword(pw));return login(res,{id:Number(r.lastInsertRowid),name,email:em,role:'customer'});
  }
  if(path==='/api/login'&&method==='POST'){
   throttle('login:'+ip,30);const b=await body(req),em=email(b.email),pw=required(b.password,128);throttle('login-email:'+em,15);
   const u=db.prepare('SELECT * FROM users WHERE email=?').get(em);
   if(!verifyPassword(pw,u?.hash||'00000000000000000000000000000000:'+ '00'.repeat(64)))error('Email or password is incorrect',401);
   return login(res,u);
  }
  if(path==='/api/logout'&&method==='POST'){csrf(req);db.prepare('DELETE FROM sessions WHERE token=?').run(session(req).token);return send(res,200,{ok:true},{'Set-Cookie':`eatone_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${production?'; Secure':''}`});}
  if(path==='/api/settings'&&method==='GET')return send(res,200,db.prepare('SELECT * FROM settings WHERE id=1').get());
  if(path==='/api/products'&&method==='GET')return send(res,200,db.prepare('SELECT * FROM products WHERE active=1 ORDER BY id DESC').all());
  if(path==='/api/orders'&&method==='POST'){
   throttle('order:'+ip,30);const b=await body(req),s=session(req);if(s)csrf(req);
   const name=required(b.name,100),phone=required(b.phone,15),em=email(b.email),address=required(b.address,1000),pin=required(b.pincode,6),key=required(b.requestKey,100),track=required(b.trackingToken,100);
   if(!/^[6-9]\d{9}$/.test(phone)||!/^\d{6}$/.test(pin)||! /^[a-f0-9]{64}$/.test(track)||! /^[a-zA-Z0-9-]{20,100}$/.test(key))error('Check your phone, pincode and checkout details');
   if(!Array.isArray(b.items)||!b.items.length||b.items.length>50)error('Your cart is empty or too large');
   const items=b.items.map(i=>({id:integer(i.id,1),quantity:integer(i.quantity,1,99)}));if(new Set(items.map(i=>i.id)).size!==items.length)error('Duplicate cart items');
   const fingerprint=sha(JSON.stringify({name,phone,em,address,pin,items,user:s?.user_id||null,track}));
   const order=transaction(()=>{
    const old=db.prepare('SELECT * FROM orders WHERE request_key=?').get(key);if(old){if(old.request_hash!==fingerprint)error('Checkout already submitted with different details',409);return old;}
    const settings=db.prepare('SELECT * FROM settings WHERE id=1').get();if(!settings.checkout_enabled)error('Ordering is currently paused. Please check back soon.',409);
    const lines=items.map(i=>{const p=db.prepare('SELECT * FROM products WHERE id=? AND active=1').get(i.id);if(!p||p.stock<i.quantity)error('One or more items are no longer available in that quantity',409);db.prepare('UPDATE products SET stock=stock-?,version=version+1 WHERE id=?').run(i.quantity,p.id);return {id:p.id,name:p.name,pack:p.pack,price:p.price,quantity:i.quantity};});
    const subtotal=lines.reduce((sum,i)=>sum+i.price*i.quantity,0);integer(subtotal,1,500000000);
    const id='EO-'+randomBytes(6).toString('hex').toUpperCase();
    db.prepare(`INSERT INTO orders(id,user_id,tracking_hash,request_key,request_hash,name,phone,email,address,pincode,items,subtotal,shipping,total,status,created) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,'PLACED',?)`).run(id,s?.user_id||null,sha(track),key,fingerprint,name,phone,em,address,pin,JSON.stringify(lines),subtotal,settings.shipping,subtotal+settings.shipping,new Date().toISOString());
    audit(s?.user_id||null,'ORDER_PLACED',id);return db.prepare('SELECT * FROM orders WHERE id=?').get(id);
   });return send(res,201,{order:publicOrder(order)});
  }
  if(path==='/api/orders'&&method==='GET'){const s=account(req);return send(res,200,db.prepare('SELECT * FROM orders WHERE user_id=? ORDER BY created DESC LIMIT 200').all(s.user_id).map(publicOrder));}
  if(path==='/api/track'&&method==='POST'){throttle('track:'+ip,40);const b=await body(req),id=required(b.id,30),token=required(b.token,100);const o=db.prepare('SELECT * FROM orders WHERE id=? AND tracking_hash=?').get(id,sha(token));if(!o)error('Order or access code not found',404);return send(res,200,publicOrder(o));}
  if(path.startsWith('/api/admin/')){
   const s=account(req,true);if(method!=='GET')csrf(req);
   if(path==='/api/admin/products'&&method==='GET')return send(res,200,db.prepare('SELECT * FROM products ORDER BY id DESC').all());
   if(path==='/api/admin/products'&&method==='POST'){const b=await body(req),v=product(b);if(v[6]&&!/^\/uploads\/[a-f0-9]+\.(png|jpg|webp)$/.test(v[6]))error('Upload a product image first');const r=db.prepare('INSERT INTO products(name,description,category,pack,price,stock,image,active,ingredients,allergens,shelf_life) VALUES(?,?,?,?,?,?,?,?,?,?,?)').run(...v);audit(s.user_id,'PRODUCT_CREATED',r.lastInsertRowid);return send(res,201,{id:Number(r.lastInsertRowid)});}
   const pm=/^\/api\/admin\/products\/(\d+)$/.exec(path);
   if(pm&&method==='PUT'){const b=await body(req),v=product(b);if(v[6]&&!/^\/uploads\/[a-f0-9]+\.(png|jpg|webp)$/.test(v[6]))error('Upload a product image first');const r=db.prepare('UPDATE products SET name=?,description=?,category=?,pack=?,price=?,stock=?,image=?,active=?,ingredients=?,allergens=?,shelf_life=?,version=version+1 WHERE id=? AND version=?').run(...v,Number(pm[1]),integer(b.version,1));if(!r.changes)error('Product changed since you opened it. Reload and try again.',409);audit(s.user_id,'PRODUCT_UPDATED',pm[1]);return send(res,200,{ok:true});}
   if(path==='/api/admin/upload'&&method==='POST'){
    const b=await body(req),data=required(b.data,2800000);if(!/^[A-Za-z0-9+/]*={0,2}$/.test(data))error('Invalid image');const bytes=Buffer.from(data,'base64');if(bytes.length>2*1024*1024||bytes.length<12)error('Image must be under 2 MB');
    let ext='';if(bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))ext='png';else if(bytes[0]===255&&bytes[1]===216&&bytes[2]===255)ext='jpg';else if(bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP')ext='webp';else error('Use a JPG, PNG or WebP photo');
    const name=randomBytes(16).toString('hex')+'.'+ext;writeFileSync(resolve(uploads,name),bytes,{flag:'wx'});return send(res,201,{image:'/uploads/'+name});
   }
   if(path==='/api/admin/orders'&&method==='GET')return send(res,200,db.prepare('SELECT * FROM orders ORDER BY created DESC LIMIT 1000').all().map(publicOrder));
   const om=/^\/api\/admin\/orders\/(EO-[A-F0-9]+)$/.exec(path);
   if(om&&method==='PATCH'){
    const b=await body(req);const o=transaction(()=>{const o=db.prepare('SELECT * FROM orders WHERE id=?').get(om[1]);if(!o)error('Order not found',404);const next=required(b.status,30),allowed={PLACED:['CONFIRMED','CANCELLED'],CONFIRMED:['PACKED','CANCELLED'],PACKED:['SHIPPED','CANCELLED'],SHIPPED:['DELIVERED'],DELIVERED:[],CANCELLED:[]};
     if(next!==o.status&&!allowed[o.status].includes(next))error('This status transition is not allowed',409);
     if(next==='CANCELLED'&&o.status!=='CANCELLED')for(const i of JSON.parse(o.items))db.prepare('UPDATE products SET stock=stock+?,version=version+1 WHERE id=?').run(i.quantity,i.id);
     const pay=required(b.payment_status,20);if(!['UNPAID','PAID'].includes(pay))error('Invalid payment status');if(pay==='PAID'&&next!=='DELIVERED')error('Mark COD paid only after delivery');
     const tracking=str(b.tracking,300);db.prepare('UPDATE orders SET status=?,payment_status=?,tracking=? WHERE id=?').run(next,pay,tracking,o.id);audit(s.user_id,'ORDER_UPDATED',o.id+': '+next+' / '+pay);return db.prepare('SELECT * FROM orders WHERE id=?').get(o.id);});return send(res,200,publicOrder(o));
   }
   if(path==='/api/admin/settings'&&method==='PUT'){const b=await body(req),shipping=integer(b.shipping,0,100000),delivery=str(b.delivery,300),whatsapp=str(b.whatsapp,15),notice=str(b.notice,300);if(whatsapp&&!/^\d{10,15}$/.test(whatsapp))error('Use digits including country code for WhatsApp');if(b.checkout_enabled&&!delivery)error('Add a delivery estimate before enabling checkout');db.prepare('UPDATE settings SET shipping=?,delivery=?,whatsapp=?,notice=?,checkout_enabled=? WHERE id=1').run(shipping,delivery,whatsapp,notice,b.checkout_enabled?1:0);audit(s.user_id,'SETTINGS_UPDATED','Store settings');return send(res,200,{ok:true});}
   if(path==='/api/admin/audit'&&method==='GET')return send(res,200,db.prepare('SELECT a.*,u.email FROM audit a LEFT JOIN users u ON u.id=a.actor ORDER BY a.id DESC LIMIT 100').all());
  }
  return error('Not found',404);
 }
 if(method!=='GET'&&method!=='HEAD')error('Method not allowed',405);
 let file;if(path.startsWith('/uploads/')){if(!/^\/uploads\/[a-f0-9]+\.(jpg|png|webp)$/.test(path))error('Not found',404);file=resolve(uploads,path.slice(9));}else if(['/','/admin','/shop','/orders','/account'].includes(path))file=resolve(root,'index.html');else {if(!/^\/[a-zA-Z0-9_.-]+$/.test(path))error('Not found',404);file=resolve(root,path.slice(1));}
 let data;try{data=readFileSync(file);}catch{error('Not found',404);}const mime={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp'};
 res.writeHead(200,{'Content-Type':mime[extname(file)]||'application/octet-stream','Cache-Control':path.startsWith('/uploads/')?'public, max-age=86400':'no-cache'});res.end(method==='HEAD'?undefined:data);
}
export const server=http.createServer((req,res)=>{
 res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('X-Frame-Options','DENY');res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
 route(req,res).catch(e=>{if(!e.status)console.error(e);if(!res.headersSent)send(res,e.status||500,{error:e.status?e.message:'Something went wrong. Please try again.'});else res.end();});
});
if(process.argv[1]===fileURLToPath(import.meta.url))server.listen(port,process.env.HOST||'0.0.0.0',()=>console.log(`EatOne running on port ${port}`));
