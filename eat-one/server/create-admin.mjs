import { randomUUID } from "node:crypto";
import { initDB, query, closeDB } from "./db.mjs";
import { hashPassword } from "./auth.mjs";
const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;
if (!email || !password || password.length < 12)
  throw new Error(
    "Set ADMIN_EMAIL and ADMIN_PASSWORD (at least 12 characters) before running npm run admin.",
  );
await initDB();
await query(
  "INSERT INTO users(id,email,name,password,role,created_at) VALUES(?,?,?,?,?,?) ON CONFLICT(email) DO UPDATE SET password=excluded.password,role=excluded.role",
  [
    randomUUID(),
    email,
    "eat.one1 Admin",
    await hashPassword(password),
    "admin",
    new Date().toISOString(),
  ],
);
console.log("Administrator account ready for", email);
await closeDB();
