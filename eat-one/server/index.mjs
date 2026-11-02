import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import multer from "multer";
import { put } from "@vercel/blob";
import { randomUUID, createHmac, timingSafeEqual } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { query, transaction, initDB, postgres } from "./db.mjs";
import {
  auth,
  createSession,
  hashPassword,
  checkPassword,
  requireUser,
  requireAdmin,
} from "./auth.mjs";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const uploadRoot = process.env.VERCEL
  ? path.join("/tmp", "eat-one-uploads")
  : path.join(root, "uploads");
const production = process.env.NODE_ENV === "production";
const paymentMode = process.env.PAYMENTS_MODE || "disabled";
if (production && paymentMode === "test")
  throw new Error(
    "Test payments are disabled in production. Set PAYMENTS_MODE=razorpay or disabled.",
  );
if (production && !postgres)
  throw new Error("Production requires DATABASE_URL for PostgreSQL.");
if (production && !process.env.SITE_ORIGIN?.startsWith("https://"))
  throw new Error("Production requires an HTTPS SITE_ORIGIN.");
await initDB();
await fs.mkdir(uploadRoot, { recursive: true });
export const app = express();
app.disable("x-powered-by");
const proxyHops = Number(process.env.TRUST_PROXY_HOPS || 0);
if (!Number.isInteger(proxyHops) || proxyHops < 0 || proxyHops > 10)
  throw new Error("TRUST_PROXY_HOPS must be an integer between 0 and 10.");
if (proxyHops) app.set("trust proxy", proxyHops);
app.use(
  helmet({
    contentSecurityPolicy: production
      ? {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "https://checkout.razorpay.com"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "https://api.razorpay.com"],
            frameSrc: [
              "https://api.razorpay.com",
              "https://checkout.razorpay.com",
            ],
          },
        }
      : false,
    crossOriginEmbedderPolicy: false,
    strictTransportSecurity: production ? undefined : false,
  }),
);
app.use(
  "/api",
  rateLimit({
    windowMs: 60000,
    limit: 240,
    standardHeaders: "draft-8",
    legacyHeaders: false,
  }),
);
const loginLimit = rateLimit({
  windowMs: 15 * 60000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many attempts. Please try again in 15 minutes." },
});
const checkoutLimit = rateLimit({
  windowMs: 15 * 60000,
  limit: 15,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many checkout attempts. Please try again shortly." },
});
app.post(
  "/api/payments/webhook",
  express.raw({ type: "application/json", limit: "1mb" }),
  async (req, res) => {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret)
      return res.status(503).json({ error: "Webhook not configured" });
    if (!verifyHmac(req.body, secret, req.headers["x-razorpay-signature"]))
      return res.status(400).json({ error: "Invalid signature" });
    const event = JSON.parse(req.body);
    if (event.event === "payment.captured") {
      const p = event.payload.payment.entity;
      await markPaid(p.order_id, p);
    }
    res.json({ ok: true });
  },
);
app.use(express.json({ limit: "1mb" }));
app.use("/api", (req, res, next) => {
  res.set("Cache-Control", "no-store");
  if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    const origin = req.headers.origin;
    const permitted =
      process.env.SITE_ORIGIN || `http://localhost:${process.env.PORT || 3000}`;
    if (
      origin &&
      origin !== permitted &&
      !(
        !production &&
        [
          "http://localhost:" + (process.env.PORT || 3000),
          "http://127.0.0.1:" + (process.env.PORT || 3000),
        ].includes(origin)
      )
    )
      return res.status(403).json({ error: "Request origin not allowed." });
    if (!origin && req.headers["x-requested-with"] !== "EatOne")
      return res
        .status(403)
        .json({ error: "Missing request verification header." });
  }
  next();
});
app.use("/api", auth);
const fail = (message, status = 400) =>
  Object.assign(new Error(message), { status });
function str(value, label, min = 1, max = 200) {
  if (
    typeof value !== "string" ||
    value.trim().length < min ||
    value.trim().length > max
  )
    throw fail(`${label} must be ${min}–${max} characters.`);
  return value.trim();
}
function int(value, label, min = 0, max = 10000000) {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < min || n > max)
    throw fail(`${label} is invalid.`);
  return n;
}
const emailValue = (v) => {
  const e = str(v, "Email", 3, 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))
    throw fail("Enter a valid email address.");
  return e;
};
const now = () => new Date().toISOString();
const settings = async () =>
  JSON.parse(
    (await query("SELECT value FROM settings WHERE id=?", ["store"]))[0].value,
  );
const parseProduct = (p) => ({
  ...p,
  price: Number(p.price),
  mrp: Number(p.mrp),
  stock: Number(p.stock),
  featured: !!p.featured,
  nutrition: JSON.parse(p.nutrition),
});
const parseOrder = (o) => ({
  ...o,
  total: Number(o.total),
  shipping: Number(o.shipping),
  items: JSON.parse(o.items),
  address: JSON.parse(o.address),
});
app.get("/api/config", async (req, res) =>
  res.json({
    settings: await settings(),
    paymentMode,
    paymentReady:
      paymentMode === "test" ||
      (paymentMode === "razorpay" &&
        !!process.env.RAZORPAY_KEY_ID &&
        !!process.env.RAZORPAY_KEY_SECRET),
    database: production
      ? undefined
      : postgres
        ? "PostgreSQL"
        : "SQLite (local)",
  }),
);
app.get("/api/auth/me", (req, res) => res.json({ user: req.user || null }));
app.post("/api/auth/register", loginLimit, async (req, res) => {
  const email = emailValue(req.body.email);
  const name = str(req.body.name, "Name", 2, 80);
  const password = str(req.body.password, "Password", 12, 128);
  const id = randomUUID();
  const hash = await hashPassword(password);
  try {
    await transaction((q) =>
      q(
        "INSERT INTO users(id,email,name,password,role,created_at) VALUES(?,?,?,?,?,?)",
        [id, email, name, hash, "customer", now()],
      ),
    );
  } catch (e) {
    if (e.code === "23505" || e.code === "ERR_SQLITE_ERROR")
      throw fail(
        "An account with this email may already exist. Please sign in.",
      );
    throw e;
  }
  await createSession(res, id);
  res.status(201).json({ user: { id, email, name, role: "customer" } });
});
app.post("/api/auth/login", loginLimit, async (req, res) => {
  const email = emailValue(req.body.email);
  const password = str(req.body.password, "Password", 1, 128);
  const [u] = await query("SELECT * FROM users WHERE email=?", [email]);
  const dummy = "a".repeat(32) + ":" + "0".repeat(128);
  const valid = await checkPassword(password, u?.password || dummy);
  if (!u || !valid) throw fail("Email or password is incorrect.", 401);
  await createSession(res, u.id);
  res.json({ user: { id: u.id, email: u.email, name: u.name, role: u.role } });
});
app.post("/api/auth/logout", async (req, res) => {
  if (req.sessionDigest)
    await query("DELETE FROM sessions WHERE token=?", [req.sessionDigest]);
  res.clearCookie("eatone_session", {
    httpOnly: true,
    sameSite: "lax",
    secure: production,
    path: "/",
  });
  res.json({ ok: true });
});
app.put("/api/auth/password", requireUser, loginLimit, async (req, res) => {
  const old = str(req.body.currentPassword, "Current password", 1, 128);
  const next = str(req.body.password, "New password", 12, 128);
  const [u] = await query("SELECT password FROM users WHERE id=?", [
    req.user.id,
  ]);
  if (!(await checkPassword(old, u.password)))
    throw fail("Current password is incorrect.", 401);
  const hash = await hashPassword(next);
  await transaction(async (q) => {
    await q("UPDATE users SET password=? WHERE id=?", [hash, req.user.id]);
    await q("DELETE FROM sessions WHERE user_id=?", [req.user.id]);
  });
  await createSession(res, req.user.id);
  res.json({ ok: true });
});
app.get("/api/products", async (req, res) => {
  const rows = await query(
    "SELECT * FROM products WHERE status='live' ORDER BY featured DESC,created_at DESC",
  );
  res.json({ products: rows.map(parseProduct) });
});
app.post("/api/products/:id/view", async (req, res) => {
  const [product] = await query(
    "SELECT id FROM products WHERE id=? AND status='live'",
    [req.params.id],
  );
  if (!product) throw fail("Product not found.", 404);
  await query(
    "INSERT INTO product_views(id,product_id,viewed_at) VALUES(?,?,?)",
    [randomUUID(), product.id, now()],
  );
  res.json({ ok: true });
});
app.get("/api/wishlist", requireUser, async (req, res) =>
  res.json({
    ids: (
      await query("SELECT product_id FROM wishlist WHERE user_id=?", [
        req.user.id,
      ])
    ).map((x) => x.product_id),
  }),
);
app.put("/api/wishlist/:id", requireUser, async (req, res) => {
  const [p] = await query(
    "SELECT id FROM products WHERE id=? AND status='live'",
    [req.params.id],
  );
  if (!p) throw fail("Product not found.", 404);
  await query(
    "INSERT INTO wishlist(user_id,product_id) VALUES(?,?) ON CONFLICT DO NOTHING",
    [req.user.id, p.id],
  );
  res.json({ ok: true });
});
app.delete("/api/wishlist/:id", requireUser, async (req, res) => {
  await query("DELETE FROM wishlist WHERE user_id=? AND product_id=?", [
    req.user.id,
    req.params.id,
  ]);
  res.json({ ok: true });
});
function addressValue(a) {
  if (!a || typeof a !== "object") throw fail("Delivery address is required.");
  const address = {
    name: str(a.name, "Full name", 2, 80),
    phone: str(a.phone, "Phone", 10, 15),
    line1: str(a.line1, "Address", 5, 200),
    line2: typeof a.line2 === "string" ? a.line2.slice(0, 200) : "",
    city: str(a.city, "City", 2, 80),
    state: str(a.state, "State", 2, 80),
    pincode: str(a.pincode, "PIN code", 6, 6),
  };
  if (!/^[6-9]\d{9}$/.test(address.phone))
    throw fail("Enter a valid 10-digit Indian mobile number.");
  if (!/^[1-9]\d{5}$/.test(address.pincode))
    throw fail("Enter a valid Indian PIN code.");
  return address;
}
app.get("/api/address", requireUser, async (req, res) => {
  const [a] = await query("SELECT address FROM addresses WHERE user_id=?", [
    req.user.id,
  ]);
  res.json({ address: a ? JSON.parse(a.address) : null });
});
app.put("/api/address", requireUser, async (req, res) => {
  const a = addressValue(req.body);
  await query(
    "INSERT INTO addresses(user_id,address) VALUES(?,?) ON CONFLICT(user_id) DO UPDATE SET address=excluded.address",
    [req.user.id, JSON.stringify(a)],
  );
  res.json({ address: a });
});
app.get("/api/orders", requireUser, async (req, res) =>
  res.json({
    orders: (
      await query(
        "SELECT * FROM orders WHERE user_id=? ORDER BY created_at DESC",
        [req.user.id],
      )
    ).map(parseOrder),
  }),
);
async function razorpay(route, body) {
  const key = process.env.RAZORPAY_KEY_ID,
    secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key || !secret)
    throw fail("Online payments are not configured yet.", 503);
  const response = await fetch("https://api.razorpay.com/v1/" + route, {
    method: body ? "POST" : "GET",
    headers: {
      Authorization:
        "Basic " + Buffer.from(`${key}:${secret}`).toString("base64"),
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15000),
  });
  const data = await response.json();
  if (!response.ok)
    throw fail("Payment provider is unavailable. Please try again.", 502);
  return data;
}
function verifyHmac(body, secret, signature) {
  if (typeof signature !== "string" || !/^[a-f0-9]{64}$/i.test(signature))
    return false;
  const expected = createHmac("sha256", secret).update(body).digest();
  return timingSafeEqual(expected, Buffer.from(signature, "hex"));
}
async function markPaid(providerId, payment) {
  return transaction(async (q) => {
    const [o] = await q(
      "SELECT * FROM orders WHERE provider_order_id=?" +
        (postgres ? " FOR UPDATE" : ""),
      [providerId],
    );
    if (!o) throw fail("Order not found.", 404);
    if (
      payment.status !== "captured" ||
      payment.currency !== "INR" ||
      Number(payment.amount) !== Number(o.total) ||
      payment.order_id !== providerId
    )
      throw fail("Payment amount or status could not be verified.", 400);
    if (o.payment_status === "paid") return parseOrder(o);
    if (o.status !== "pending")
      throw fail("Order requires payment reconciliation.", 409);
    await q(
      "UPDATE orders SET payment_status='paid',status='confirmed',payment_id=? WHERE id=?",
      [payment.id, o.id],
    );
    return parseOrder({
      ...o,
      payment_status: "paid",
      status: "confirmed",
      payment_id: payment.id,
    });
  });
}
app.post("/api/checkout", requireUser, checkoutLimit, async (req, res) => {
  if (
    paymentMode === "disabled" ||
    (paymentMode !== "test" && paymentMode !== "razorpay")
  )
    throw fail("Checkout opens soon. Please contact us on WhatsApp.", 503);
  if (
    paymentMode === "razorpay" &&
    (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET)
  )
    throw fail("Online payments are not configured yet.", 503);
  const address = addressValue(req.body.address);
  const key = str(req.body.idempotencyKey, "Checkout key", 16, 100);
  if (
    !Array.isArray(req.body.items) ||
    !req.body.items.length ||
    req.body.items.length > 30
  )
    throw fail("Add between 1 and 30 items.");
  const cart = new Map();
  for (const x of req.body.items) {
    const id = str(x.id, "Product", 1, 80);
    if (cart.has(id)) throw fail("Duplicate cart item.");
    cart.set(id, int(x.quantity, "Quantity", 1, 20));
  }
  const cfg = await settings();
  let order = await transaction(async (q) => {
    const [existing] = await q("SELECT * FROM orders WHERE idempotency_key=?", [
      key,
    ]);
    if (existing) {
      if (existing.user_id !== req.user.id)
        throw fail("Invalid checkout key.", 409);
      return parseOrder(existing);
    }
    if (paymentMode === "razorpay") {
      const [pending] = await q(
        "SELECT COUNT(*) AS count FROM orders WHERE user_id=? AND payment_status='pending'",
        [req.user.id],
      );
      if (Number(pending.count) >= 3)
        throw fail(
          "Please complete an existing pending order before starting another checkout.",
          409,
        );
    }
    const items = [];
    let subtotal = 0;
    for (const [id, quantity] of [...cart.entries()].sort()) {
      const [p] = await q(
        "SELECT * FROM products WHERE id=?" + (postgres ? " FOR UPDATE" : ""),
        [id],
      );
      if (!p || p.status !== "live")
        throw fail("An item is no longer available.", 409);
      if (p.stock < quantity)
        throw fail(`${p.name}: only ${p.stock} available.`, 409);
      items.push({
        id,
        name: p.name,
        quantity,
        price: Number(p.price),
        weight: p.weight,
        image: p.image,
      });
      subtotal += p.price * quantity;
    }
    const shipping =
      subtotal >= cfg.freeShippingAt * 100 ? 0 : cfg.shippingFee * 100;
    const id = "EO-" + randomUUID().slice(0, 8).toUpperCase();
    for (const item of items)
      await q("UPDATE products SET stock=stock-? WHERE id=?", [
        item.quantity,
        item.id,
      ]);
    const o = {
      id,
      user_id: req.user.id,
      items: JSON.stringify(items),
      address: JSON.stringify(address),
      total: subtotal + shipping,
      shipping,
      status: paymentMode === "test" ? "confirmed" : "pending",
      payment_status: paymentMode === "test" ? "test_paid" : "pending",
      payment_mode: paymentMode,
      idempotency_key: key,
      provider_order_id: null,
      payment_id: null,
      tracking: "",
      created_at: now(),
    };
    await q(
      "INSERT INTO orders(id,user_id,items,address,total,shipping,status,payment_status,payment_mode,idempotency_key,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)",
      [
        id,
        req.user.id,
        o.items,
        o.address,
        o.total,
        shipping,
        o.status,
        o.payment_status,
        paymentMode,
        key,
        o.created_at,
      ],
    );
    return parseOrder(o);
  });
  if (order.payment_mode === "razorpay" && order.payment_status === "pending") {
    // Lock the row across the provider call so concurrent retries create one provider order.
    order = await transaction(async (q) => {
      const [o] = await q(
        "SELECT * FROM orders WHERE id=?" + (postgres ? " FOR UPDATE" : ""),
        [order.id],
      );
      if (!o.provider_order_id) {
        const p = await razorpay("orders", {
          amount: Number(o.total),
          currency: "INR",
          receipt: o.id,
        });
        await q("UPDATE orders SET provider_order_id=? WHERE id=?", [
          p.id,
          o.id,
        ]);
        o.provider_order_id = p.id;
      }
      return parseOrder(o);
    });
  }
  res.json({
    order,
    keyId: paymentMode === "razorpay" ? process.env.RAZORPAY_KEY_ID : undefined,
  });
});
app.post("/api/payments/verify", requireUser, async (req, res) => {
  if (paymentMode !== "razorpay")
    throw fail("Online payments are unavailable.", 503);
  const id = str(req.body.razorpay_order_id, "Payment order", 5, 100),
    pid = str(req.body.razorpay_payment_id, "Payment", 5, 100);
  const [o] = await query(
    "SELECT * FROM orders WHERE provider_order_id=? AND user_id=?",
    [id, req.user.id],
  );
  if (!o) throw fail("Order not found.", 404);
  if (
    !verifyHmac(
      `${id}|${pid}`,
      process.env.RAZORPAY_KEY_SECRET,
      req.body.razorpay_signature,
    )
  )
    throw fail("Payment signature could not be verified.");
  const p = await razorpay(`payments/${encodeURIComponent(pid)}`);
  res.json({ order: await markPaid(id, p) });
});
app.post(
  "/api/orders/:id/payment-session",
  requireUser,
  loginLimit,
  async (req, res) => {
    if (paymentMode !== "razorpay")
      throw fail("Online payments are unavailable.", 503);
    const order = await transaction(async (q) => {
      const [o] = await q(
        "SELECT * FROM orders WHERE id=?" + (postgres ? " FOR UPDATE" : ""),
        [req.params.id],
      );
      if (!o || o.user_id !== req.user.id) throw fail("Order not found.", 404);
      if (
        o.payment_mode !== "razorpay" ||
        o.payment_status !== "pending" ||
        o.status !== "pending"
      )
        throw fail("This order does not need a payment.", 409);
      if (!o.provider_order_id) {
        const p = await razorpay("orders", {
          amount: Number(o.total),
          currency: "INR",
          receipt: o.id,
        });
        await q("UPDATE orders SET provider_order_id=? WHERE id=?", [
          p.id,
          o.id,
        ]);
        o.provider_order_id = p.id;
      }
      return parseOrder(o);
    });
    res.json({ order, keyId: process.env.RAZORPAY_KEY_ID });
  },
);
app.post("/api/orders/:id/reconcile", requireUser, async (req, res) => {
  const [o] = await query("SELECT * FROM orders WHERE id=?", [req.params.id]);
  if (!o || (o.user_id !== req.user.id && req.user.role !== "admin"))
    throw fail("Order not found.", 404);
  if (o.payment_mode !== "razorpay" || !o.provider_order_id)
    throw fail("No provider payment to check.");
  const data = await razorpay(
    `orders/${encodeURIComponent(o.provider_order_id)}/payments`,
  );
  const captured = data.items.find((p) => p.status === "captured");
  if (!captured)
    throw fail(
      "No captured payment yet. Stock stays reserved for this order.",
      409,
    );
  res.json({ order: await markPaid(o.provider_order_id, captured) });
});
app.post("/api/subscribe", loginLimit, async (req, res) => {
  const email = emailValue(req.body.email);
  if (req.body.consent !== true) throw fail("Please agree to receive updates.");
  await query(
    "INSERT INTO subscribers(email,created_at) VALUES(?,?) ON CONFLICT DO NOTHING",
    [email, now()],
  );
  res.json({ ok: true });
});
app.use("/api/admin", requireUser, requireAdmin);
app.get("/api/admin/products", async (req, res) =>
  res.json({
    products: (
      await query("SELECT * FROM products ORDER BY created_at DESC")
    ).map(parseProduct),
  }),
);
app.get("/api/admin/orders", async (req, res) =>
  res.json({
    orders: (
      await query(
        "SELECT o.*,u.email FROM orders o JOIN users u ON u.id=o.user_id ORDER BY o.created_at DESC",
      )
    ).map(parseOrder),
  }),
);
app.get("/api/admin/insights", async (req, res) => {
  const databaseStarted = Date.now();
  const currentStart = Date.now() - 30 * 86400000;
  const previousStart = Date.now() - 60 * 86400000;
  const [products, orderRows, viewRows] = await Promise.all([
    query("SELECT * FROM products ORDER BY created_at DESC"),
    query(
      "SELECT items,created_at FROM orders WHERE payment_status='paid' AND created_at>=?",
      [new Date(previousStart).toISOString()],
    ),
    query("SELECT product_id,viewed_at FROM product_views WHERE viewed_at>=?", [
      new Date(currentStart).toISOString(),
    ]),
  ]);
  const databaseLatencyMs = Date.now() - databaseStarted;
  const stats = new Map(
    products.map((p) => [
      p.id,
      {
        id: p.id,
        name: p.name,
        category: p.category,
        status: p.status,
        price: Number(p.price),
        mrp: Number(p.mrp),
        stock: Number(p.stock),
        image: p.image,
        views30: 0,
        units30: 0,
        previousUnits30: 0,
        revenue30: 0,
        paidOrders30: 0,
      },
    ]),
  );
  for (const view of viewRows) {
    const product = stats.get(view.product_id);
    if (product && Date.parse(view.viewed_at) >= currentStart)
      product.views30++;
  }
  for (const order of orderRows) {
    const created = Date.parse(order.created_at);
    let items;
    try {
      items = JSON.parse(order.items);
    } catch {
      continue;
    }
    for (const item of items) {
      const product = stats.get(item.id);
      if (!product) continue;
      const quantity = Number(item.quantity) || 0;
      if (created >= currentStart) {
        product.units30 += quantity;
        product.revenue30 += quantity * (Number(item.price) || product.price);
        product.paidOrders30++;
      } else if (created >= previousStart) product.previousUnits30 += quantity;
    }
  }
  const categoryPrices = new Map();
  for (const product of stats.values()) {
    if (product.status !== "live") continue;
    const prices = categoryPrices.get(product.category) || [];
    prices.push(product.price);
    categoryPrices.set(product.category, prices);
  }
  const median = (values) => {
    const sorted = [...values].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2
      ? sorted[middle]
      : Math.round((sorted[middle - 1] + sorted[middle]) / 2);
  };
  const performance = [...stats.values()]
    .map((product) => {
      const categoryMedian = median(
        categoryPrices.get(product.category) || [product.price],
      );
      const conversionRate = product.views30
        ? (product.paidOrders30 / product.views30) * 100
        : null;
      const change = product.previousUnits30
        ? ((product.units30 - product.previousUnits30) /
            product.previousUnits30) *
          100
        : product.units30
          ? 100
          : 0;
      let priceDirection = "hold";
      let suggestion = "Keep the price steady while more sales data builds.";
      if (product.status !== "live") {
        suggestion =
          "Publish only after the product details and stock are ready.";
      } else if (product.stock === 0) {
        suggestion =
          "Restock before promotion so demand does not lead to lost sales.";
      } else if (product.stock < 10 && product.units30 > 0) {
        suggestion =
          "Restock soon; this product is selling and inventory is low.";
      } else if (product.views30 >= 20 && product.paidOrders30 === 0) {
        if (product.price > categoryMedian * 1.12) {
          priceDirection = "down";
          suggestion =
            "Consider a small 5–8% price test; views are not becoming paid orders and this price is above the category median.";
        } else {
          suggestion =
            "Keep the price for now; improve the first photo, description, trust details, or offer before testing a discount.";
        }
      } else if (
        product.units30 >= 5 &&
        conversionRate !== null &&
        conversionRate >= 5 &&
        product.price < categoryMedian * 0.88
      ) {
        priceDirection = "up";
        suggestion =
          "Demand is healthy and the price is below the category median; test a small 3–5% increase on new traffic.";
      } else if (product.views30 < 20) {
        suggestion =
          "Not enough product-page traffic yet. Feature it, share its direct link, and collect more data before changing price.";
      }
      return {
        ...product,
        conversionRate:
          conversionRate === null ? null : Number(conversionRate.toFixed(1)),
        salesChangePercent: Number(change.toFixed(1)),
        categoryMedian,
        priceDirection,
        suggestion,
      };
    })
    .sort((a, b) => b.revenue30 - a.revenue30 || b.views30 - a.views30);
  const razorpayParts = [
    process.env.RAZORPAY_KEY_ID,
    process.env.RAZORPAY_KEY_SECRET,
    process.env.RAZORPAY_WEBHOOK_SECRET,
  ].filter(Boolean).length;
  const services = [
    {
      key: "api",
      name: "Application server",
      status: "green",
      detail: "Admin API responded successfully.",
    },
    {
      key: "database",
      name: "Supabase database",
      status: databaseLatencyMs < 800 ? "green" : "orange",
      detail: `Connected in ${databaseLatencyMs} ms.`,
    },
    {
      key: "storage",
      name: "Product image storage",
      status: process.env.BLOB_READ_WRITE_TOKEN ? "green" : "orange",
      detail: process.env.BLOB_READ_WRITE_TOKEN
        ? "Permanent cloud uploads are configured."
        : "Bundled images work; permanent admin uploads still need Vercel Blob.",
    },
    {
      key: "payments",
      name: "Razorpay payments",
      status:
        paymentMode === "razorpay" && razorpayParts === 3
          ? "green"
          : paymentMode === "razorpay" && razorpayParts > 0
            ? "red"
            : "orange",
      detail:
        paymentMode === "razorpay" && razorpayParts === 3
          ? "Payment keys and webhook secret are configured."
          : paymentMode === "razorpay" && razorpayParts > 0
            ? "Payment configuration is incomplete."
            : "Checkout is safely disabled until Razorpay is configured.",
    },
  ];
  res.json({
    periodDays: 30,
    generatedAt: now(),
    summary: {
      views30: performance.reduce((sum, p) => sum + p.views30, 0),
      units30: performance.reduce((sum, p) => sum + p.units30, 0),
      revenue30: performance.reduce((sum, p) => sum + p.revenue30, 0),
      lowStock: performance.filter((p) => p.status === "live" && p.stock < 10)
        .length,
    },
    services,
    products: performance,
  });
});
const fields = [
  "name",
  "slug",
  "description",
  "category",
  "genre",
  "price",
  "mrp",
  "weight",
  "stock",
  "image",
  "ingredients",
  "allergens",
  "nutrition",
  "benefits",
  "shelf_life",
  "storage",
  "status",
  "featured",
];
function productValue(b) {
  const name = str(b.name, "Product name", 2, 100);
  const price = int(b.price, "Price in paise", 100, 10000000);
  const mrp = int(b.mrp || price, "MRP", price, 10000000);
  const status = str(b.status, "Status");
  if (!["draft", "live", "archived"].includes(status))
    throw fail("Invalid product status.");
  const image = str(b.image || "", "Image", 0, 1000);
  if (
    image &&
    !/^\/uploads\/[a-f0-9-]+\.(jpg|png|webp)$/.test(image) &&
    !/^\/images\/[a-zA-Z0-9._\/-]+$/.test(image) &&
    !/^https:\/\/[a-zA-Z0-9.-]+\.public\.blob\.vercel-storage\.com\/[a-zA-Z0-9._\/-]+$/.test(
      image,
    )
  )
    throw fail("Please upload a product image.");
  if (status === "live" && !image)
    throw fail("Upload a product image before publishing.");
  const nutrition = {};
  for (const key of [
    "serving",
    "energy",
    "protein",
    "carbohydrates",
    "sugar",
    "fat",
    "fibre",
  ])
    nutrition[key] = str(b.nutrition?.[key] || "", "Nutrition " + key, 0, 80);
  return {
    name,
    slug: (b.slug || name.toLowerCase().replace(/[^a-z0-9]+/g, "-")).slice(
      0,
      120,
    ),
    description: str(b.description, "Description", 10, 5000),
    category: str(b.category, "Category", 2, 80),
    genre: str(b.genre || "Everyday snacking", "Genre", 2, 80),
    price,
    mrp,
    weight: str(b.weight, "Weight", 1, 50),
    stock: int(b.stock, "Stock", 0, 1000000),
    image,
    ingredients: str(b.ingredients, "Ingredients", 1, 3000),
    allergens: str(b.allergens, "Allergens", 1, 1000),
    nutrition: JSON.stringify(nutrition),
    benefits: str(b.benefits || "", "Product highlights", 0, 2000),
    shelf_life: str(b.shelf_life, "Shelf life", 1, 200),
    storage: str(b.storage, "Storage", 1, 500),
    status,
    featured: b.featured ? 1 : 0,
  };
}
app.post("/api/admin/products", async (req, res) => {
  const p = productValue(req.body),
    id = randomUUID();
  await transaction((q) =>
    q(
      `INSERT INTO products(id,${fields.join(",")},created_at) VALUES(${Array(
        fields.length + 2,
      )
        .fill("?")
        .join(",")})`,
      [id, ...fields.map((k) => p[k]), now()],
    ),
  );
  res
    .status(201)
    .json({ product: parseProduct({ ...p, id, created_at: now() }) });
});
app.put("/api/admin/products/:id", async (req, res) => {
  const p = productValue(req.body);
  await transaction(async (q) => {
    const [exists] = await q("SELECT id FROM products WHERE id=?", [
      req.params.id,
    ]);
    if (!exists) throw fail("Product not found.", 404);
    await q(
      `UPDATE products SET ${fields.map((k) => k + "=?").join(",")} WHERE id=?`,
      [...fields.map((k) => p[k]), req.params.id],
    );
  });
  res.json({ product: parseProduct({ ...p, id: req.params.id }) });
});
app.delete("/api/admin/products/:id", async (req, res) => {
  const result = await transaction(async (q) => {
    const [product] = await q("SELECT id FROM products WHERE id=?", [
      req.params.id,
    ]);
    if (!product) throw fail("Product not found.", 404);
    const orders = await q("SELECT items FROM orders");
    const wasOrdered = orders.some((order) => {
      try {
        return JSON.parse(order.items).some((item) => item.id === product.id);
      } catch {
        return false;
      }
    });
    if (wasOrdered) {
      await q("UPDATE products SET status='archived' WHERE id=?", [product.id]);
      return { deleted: false, archived: true };
    }
    await q("DELETE FROM products WHERE id=?", [product.id]);
    return { deleted: true, archived: false };
  });
  res.json({ ok: true, ...result });
});
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
});
app.post("/api/admin/upload", upload.single("image"), async (req, res) => {
  const b = req.file?.buffer;
  if (!b) throw fail("Choose a product image.");
  let ext;
  if (b.subarray(0, 3).equals(Buffer.from([255, 216, 255]))) ext = "jpg";
  else if (
    b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  )
    ext = "png";
  else if (
    b.subarray(0, 4).toString() === "RIFF" &&
    b.subarray(8, 12).toString() === "WEBP"
  )
    ext = "webp";
  else throw fail("Use a JPG, PNG, or WebP image.");
  const filename = randomUUID() + "." + ext;
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put("products/" + filename, b, {
      access: "public",
      addRandomSuffix: false,
      contentType: req.file.mimetype,
    });
    return res.json({ url: blob.url });
  }
  await fs.writeFile(path.join(uploadRoot, filename), b, { flag: "wx" });
  res.json({ url: "/uploads/" + filename });
});
app.put("/api/admin/orders/:id", async (req, res) => {
  const status = str(req.body.status, "Order status");
  const allowed = {
    confirmed: ["packing"],
    packing: ["shipped"],
    shipped: ["delivered"],
    delivered: [],
  };
  const tracking = str(req.body.tracking || "", "Tracking", 0, 300);
  await transaction(async (q) => {
    const [o] = await q(
      "SELECT * FROM orders WHERE id=?" + (postgres ? " FOR UPDATE" : ""),
      [req.params.id],
    );
    if (!o) throw fail("Order not found.", 404);
    if (o.payment_status === "pending")
      throw fail("Verify payment before fulfilment.", 409);
    if (status !== o.status && !allowed[o.status]?.includes(status))
      throw fail("Invalid order status transition.", 409);
    if (status === "shipped" && !tracking)
      throw fail("Add courier and tracking details before shipping.");
    await q("UPDATE orders SET status=?,tracking=? WHERE id=?", [
      status,
      tracking,
      o.id,
    ]);
  });
  res.json({ ok: true });
});
app.get("/api/admin/subscribers", async (req, res) =>
  res.json({
    subscribers: await query(
      "SELECT * FROM subscribers ORDER BY created_at DESC",
    ),
  }),
);
app.put("/api/admin/settings", async (req, res) => {
  const old = await settings();
  const b = req.body;
  for (const k of [
    "announcement",
    "contactEmail",
    "instagram",
    "website",
    "businessName",
    "businessAddress",
    "fssai",
    "shippingPolicy",
    "refundPolicy",
    "privacyPolicy",
    "terms",
  ])
    if (k in b) old[k] = str(b[k], k, 0, 5000);
  if ("whatsapp" in b) {
    const w = str(b.whatsapp, "WhatsApp", 10, 15);
    if (!/^\d+$/.test(w))
      throw fail("WhatsApp number must contain digits only.");
    old.whatsapp = w;
  }
  if ("shippingFee" in b)
    old.shippingFee = int(b.shippingFee, "Shipping fee", 0, 10000);
  if ("freeShippingAt" in b)
    old.freeShippingAt = int(
      b.freeShippingAt,
      "Free shipping threshold",
      1,
      100000,
    );
  await query("UPDATE settings SET value=? WHERE id=?", [
    JSON.stringify(old),
    "store",
  ]);
  res.json({ settings: old });
});
app.use("/api", (req, res) =>
  res.status(404).json({ error: "API route not found." }),
);
app.use(
  "/uploads",
  express.static(uploadRoot, {
    maxAge: "1d",
    setHeaders: (res) => res.set("X-Content-Type-Options", "nosniff"),
  }),
);
if (production || process.env.SERVE_BUILT === "true") {
  app.use(express.static(path.join(root, "dist")));
  app.get("/{*path}", (req, res) =>
    res.sendFile(path.join(root, "dist/index.html")),
  );
} else {
  const { createServer } = await import("vite");
  const vite = await createServer({
    root,
    server: {
      middlewareMode: true,
      hmr: { port: Number(process.env.PORT || 3000) + 10000 },
    },
    appType: "spa",
  });
  app.use(vite.middlewares);
}
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  const status =
    err.status ||
    (err.code === "23505" || err.code === "ERR_SQLITE_ERROR"
      ? 409
      : err instanceof multer.MulterError
        ? 400
        : 500);
  if (status >= 500) console.error(err.message);
  res.status(status).json({
    error:
      status >= 500
        ? "Something went wrong. Please try again."
        : err.code === "LIMIT_FILE_SIZE"
          ? "Image must be under 5 MB."
          : err.message,
  });
});
if (!process.env.VERCEL) {
  const port = Number(process.env.PORT) || 3000;
  const server = app.listen(port, process.env.HOST || "127.0.0.1", () =>
    console.log(
      `eat.one1 is running at http://localhost:${port} (${paymentMode} payments)`,
    ),
  );
  server.on("error", (e) => {
    console.error(e.message);
    process.exit(1);
  });
  setInterval(
    () =>
      query("DELETE FROM sessions WHERE expires_at<?", [now()]).catch((e) =>
        console.error("Session cleanup failed:", e.message),
      ),
    3600000,
  ).unref();
}
export default app;
