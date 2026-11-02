import {scrypt,randomBytes,timingSafeEqual,createHash} from 'node:crypto';
import {promisify} from 'node:util';
import {query} from './db.mjs';
const derive=promisify(scrypt);
export async function hashPassword(password){const salt=randomBytes(16).toString('hex');const hash=await derive(password,salt,64);return `${salt}:${hash.toString('hex')}`;}
export async function checkPassword(password,stored){const [salt,hex]=stored.split(':');const hash=await derive(password,salt,64);return timingSafeEqual(hash,Buffer.from(hex,'hex'));}
const digest=s=>createHash('sha256').update(s).digest('hex');
export async function createSession(res,userId){const token=randomBytes(32).toString('hex');await query('INSERT INTO sessions(token,user_id,expires_at) VALUES(?,?,?)',[digest(token),userId,new Date(Date.now()+7*86400000).toISOString()]);res.cookie('eatone_session',token,{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',maxAge:7*86400000,path:'/'});}
export async function auth(req,res,next){try{const token=(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('eatone_session='))?.slice(15);if(token){const [user]=await query('SELECT u.id,u.name,u.email,u.role FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token=? AND s.expires_at>?',[digest(token),new Date().toISOString()]);req.user=user;req.sessionDigest=digest(token);}next();}catch(e){next(e);}}
export const requireUser=(req,res,next)=>req.user?next():res.status(401).json({error:'Please sign in to continue.'});
export const requireAdmin=(req,res,next)=>req.user?.role==='admin'?next():res.status(403).json({error:'Administrator access required.'});
