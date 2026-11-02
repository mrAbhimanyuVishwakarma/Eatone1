import { DatabaseSync } from "node:sqlite";
import pg from "pg";
import fs from "node:fs";
import path from "node:path";
const schema = `
CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, name TEXT NOT NULL, password TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'customer', created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS products (id TEXT PRIMARY KEY, name TEXT NOT NULL, slug TEXT UNIQUE NOT NULL, description TEXT NOT NULL, category TEXT NOT NULL, genre TEXT NOT NULL, price INTEGER NOT NULL CHECK(price>0), mrp INTEGER NOT NULL, weight TEXT NOT NULL, stock INTEGER NOT NULL CHECK(stock>=0), image TEXT NOT NULL, ingredients TEXT NOT NULL, allergens TEXT NOT NULL, nutrition TEXT NOT NULL, benefits TEXT NOT NULL, shelf_life TEXT NOT NULL, storage TEXT NOT NULL, status TEXT NOT NULL, featured INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS wishlist (user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE, PRIMARY KEY(user_id,product_id));
CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), items TEXT NOT NULL, address TEXT NOT NULL, total INTEGER NOT NULL, shipping INTEGER NOT NULL, status TEXT NOT NULL, payment_status TEXT NOT NULL, payment_mode TEXT NOT NULL, provider_order_id TEXT UNIQUE, payment_id TEXT UNIQUE, idempotency_key TEXT UNIQUE NOT NULL, tracking TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS addresses (user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, address TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS settings (id TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS subscribers (email TEXT PRIMARY KEY, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS product_views (id TEXT PRIMARY KEY, product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE, viewed_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_product_views_product_date ON product_views(product_id,viewed_at);
`;
export const postgres = !!process.env.DATABASE_URL;
let pool, sqlite;
if (postgres) {
  const ssl =
    process.env.DATABASE_SSL === "false"
      ? false
      : {
          rejectUnauthorized:
            process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== "false",
        };
  const configuredMax = Number.parseInt(
    process.env.DATABASE_POOL_MAX || "",
    10,
  );
  const max =
    Number.isFinite(configuredMax) && configuredMax > 0
      ? configuredMax
      : process.env.VERCEL
        ? 1
        : 10;
  pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max, ssl });
} else {
  const file = process.env.SQLITE_PATH || "data/eat-one.sqlite";
  fs.mkdirSync(path.dirname(file), { recursive: true });
  sqlite = new DatabaseSync(file);
  sqlite.exec(
    "PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;",
  );
}
function adapter(client) {
  return async (sql, params = []) => {
    if (postgres) {
      let i = 0;
      return (
        await client.query(
          sql.replace(/\?/g, () => `$${++i}`),
          params,
        )
      ).rows;
    }
    const s = sqlite.prepare(sql);
    if (/^\s*(SELECT|WITH)/i.test(sql) || /RETURNING/i.test(sql))
      return s.all(...params);
    s.run(...params);
    return [];
  };
}
const rawQuery = adapter(pool);
let queue = Promise.resolve();
async function exclusive(fn) {
  const prev = queue;
  let release;
  queue = new Promise((r) => (release = r));
  await prev;
  try {
    return await fn();
  } finally {
    release();
  }
}
export async function query(sql, params = []) {
  return postgres
    ? rawQuery(sql, params)
    : exclusive(() => rawQuery(sql, params));
}
export async function transaction(fn) {
  if (postgres) {
    const c = await pool.connect();
    try {
      await c.query("BEGIN");
      const result = await fn(adapter(c));
      await c.query("COMMIT");
      return result;
    } catch (e) {
      await c.query("ROLLBACK");
      throw e;
    } finally {
      c.release();
    }
  }
  return exclusive(async () => {
    try {
      sqlite.exec("BEGIN IMMEDIATE");
      const result = await fn(rawQuery);
      sqlite.exec("COMMIT");
      return result;
    } catch (e) {
      sqlite.exec("ROLLBACK");
      throw e;
    }
  });
}
export async function initDB() {
  if (postgres) await pool.query(schema);
  else sqlite.exec(schema);
  await query(
    "INSERT INTO settings(id,value) VALUES(?,?) ON CONFLICT(id) DO NOTHING",
    [
      "store",
      JSON.stringify({
        announcement:
          "Little bites. Thoughtful ingredients. Made with love in Bangalore.",
        shippingFee: 69,
        freeShippingAt: 799,
        instagram: "https://www.instagram.com/eat.one1/",
        whatsapp: "918618401072",
        contactEmail: "eatonebusiness@gmail.com",
        website: "https://eatone1.vercel.app/",
        businessName: "eat.one1",
        businessAddress: "Bangalore, India",
        fssai: "",
        shippingPolicy:
          "Delivery timelines and shipping availability are confirmed at checkout. Contact us on WhatsApp for delivery questions.",
        refundPolicy:
          "Please contact us on WhatsApp with your order number and photos if an item arrives damaged or incorrect. Refund eligibility and timelines will be confirmed by our team.",
        privacyPolicy:
          "We use your account and delivery information to fulfil orders and provide support. Payment details are handled by the payment provider. Contact us to request access to or deletion of your data.",
        terms:
          "Product availability is subject to stock. Please review ingredients and allergens before ordering. Nutrition information relates to the stated serving size; snacks are not a substitute for medical advice.",
      }),
    ],
  );
}
export async function closeDB() {
  if (pool) await pool.end();
  else sqlite.close();
}
