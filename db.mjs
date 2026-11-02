import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
export const dataDir = resolve(process.env.DATA_DIR || './data');
mkdirSync(dataDir, { recursive: true });
export const db = new DatabaseSync(resolve(dataDir, 'eatone.sqlite'));
db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, hash TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('customer','admin')));
CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,user_id INTEGER REFERENCES users(id),csrf TEXT NOT NULL, expires INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS products(id INTEGER PRIMARY KEY,name TEXT NOT NULL,description TEXT NOT NULL,category TEXT NOT NULL,pack TEXT NOT NULL,price INTEGER NOT NULL CHECK(price>=1),stock INTEGER NOT NULL CHECK(stock>=0),image TEXT NOT NULL DEFAULT '',active INTEGER NOT NULL DEFAULT 1,version INTEGER NOT NULL DEFAULT 1,ingredients TEXT NOT NULL DEFAULT '',allergens TEXT NOT NULL DEFAULT '',shelf_life TEXT NOT NULL DEFAULT '');
CREATE TABLE IF NOT EXISTS orders(id TEXT PRIMARY KEY,user_id INTEGER REFERENCES users(id),tracking_hash TEXT NOT NULL,request_key TEXT NOT NULL UNIQUE,request_hash TEXT NOT NULL,name TEXT NOT NULL,phone TEXT NOT NULL,email TEXT NOT NULL,address TEXT NOT NULL,pincode TEXT NOT NULL,items TEXT NOT NULL,subtotal INTEGER NOT NULL,shipping INTEGER NOT NULL,total INTEGER NOT NULL,status TEXT NOT NULL,payment TEXT NOT NULL DEFAULT 'COD',payment_status TEXT NOT NULL DEFAULT 'UNPAID',tracking TEXT NOT NULL DEFAULT '',created TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS settings(id INTEGER PRIMARY KEY CHECK(id=1),shipping INTEGER NOT NULL DEFAULT 0,delivery TEXT NOT NULL DEFAULT '',whatsapp TEXT NOT NULL DEFAULT '',notice TEXT NOT NULL DEFAULT 'Our catalogue is coming soon.',checkout_enabled INTEGER NOT NULL DEFAULT 0);
INSERT OR IGNORE INTO settings(id) VALUES(1);
CREATE TABLE IF NOT EXISTS audit(id INTEGER PRIMARY KEY,actor INTEGER,action TEXT NOT NULL,detail TEXT NOT NULL,created TEXT NOT NULL);`);
export function hashPassword(password) { const salt = randomBytes(16).toString('hex'); return salt + ':' + scryptSync(password,salt,64).toString('hex'); }
export function verifyPassword(password, encoded) { try { const [s,h]=encoded.split(':'); return timingSafeEqual(scryptSync(password,s,64),Buffer.from(h,'hex')); } catch { return false; } }
export function audit(actor,action,detail) { db.prepare('INSERT INTO audit(actor,action,detail,created) VALUES(?,?,?,?)').run(actor,action,String(detail),new Date().toISOString()); }
