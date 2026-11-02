import React, { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Settings,
  Mail,
  Plus,
  ArrowUpRight,
  Upload,
  Search,
  ArrowLeft,
  Check,
  Eye,
  Pencil,
  AlertCircle,
  Activity,
  BarChart3,
  Database,
  CreditCard,
  Image,
  Server,
  Trash2,
  TrendingUp,
  TrendingDown,
  Minus,
  Lightbulb,
} from "lucide-react";
import { useStore, Link, Empty, categories, genres } from "./App";
import { Login, OrderCard } from "./Customer";
import { api, money } from "./api";
const blank = {
  name: "",
  slug: "",
  description: "",
  category: "Nutrition laddoos",
  genre: "Everyday snacking",
  price: "",
  mrp: "",
  weight: "",
  stock: 0,
  image: "",
  ingredients: "",
  allergens: "",
  nutrition: {
    serving: "",
    energy: "",
    protein: "",
    carbohydrates: "",
    sugar: "",
    fat: "",
    fibre: "",
  },
  benefits: "",
  shelf_life: "",
  storage: "",
  status: "draft",
  featured: false,
};
export function Admin() {
  const { user, config, reload, toast } = useStore();
  const [tab, setTab] = useState("overview"),
    [products, setProducts] = useState([]),
    [orders, setOrders] = useState([]),
    [subscribers, setSubscribers] = useState([]),
    [insights, setInsights] = useState(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [editing, setEditing] = useState(null),
    [search, setSearch] = useState("");
  async function load() {
    setLoading(true);
    setError("");
    try {
      const [p, o, s, i] = await Promise.all([
        api("/admin/products"),
        api("/admin/orders"),
        api("/admin/subscribers"),
        api("/admin/insights"),
      ]);
      setProducts(p.products);
      setOrders(o.orders);
      setSubscribers(s.subscribers);
      setInsights(i);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    if (user?.role === "admin") load();
  }, [user]);
  if (!user) return <Login admin />;
  if (user.role !== "admin")
    return (
      <Empty
        icon={AlertCircle}
        title="This corner is for the eat.one1 team"
        description="Your customer account does not have admin access."
        action="My account"
        to="/account"
      />
    );
  const live = products.filter((p) => p.status === "live");
  const realOrders = orders.filter((o) => o.payment_status === "paid");
  const revenue = realOrders.reduce((a, o) => a + o.total, 0);
  const matching = products.filter((p) =>
    (p.name + " " + p.category + " " + p.status)
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  return (
    <section className="admin-layout">
      <aside className="admin-sidebar">
        <span className="eyebrow">BEHIND THE GOODNESS</span>
        <h2>eat.one1 studio.</h2>
        <p>A little care for your store.</p>
        {[
          [LayoutDashboard, "overview", "Overview"],
          [BarChart3, "insights", "Insights"],
          [Package, "products", "Products"],
          [ShoppingBag, "orders", "Orders"],
          [Mail, "subscribers", "Snack circle"],
          [Settings, "settings", "Store settings"],
        ].map(([I, key, title]) => (
          <button
            className={tab === key ? "active" : ""}
            key={key}
            onClick={() => {
              setTab(key);
              setEditing(null);
            }}
          >
            <I size={18} />
            {title}
            {key === "orders" && <small>{orders.length}</small>}
          </button>
        ))}
        <Link to="/">
          Visit storefront <ArrowUpRight size={17} />
        </Link>
        <div className="admin-help">
          <LeafMark />
          <strong>Little steps. Big things.</strong>
          <p>Add your first snack and make someone’s day a little better.</p>
        </div>
      </aside>
      <div className="admin-content">
        <div className="admin-top">
          <span>YOUR STORE / {tab.toUpperCase()}</span>
          <span className="status">
            {config?.paymentMode === "test"
              ? "Local test mode"
              : "Store management"}
          </span>
        </div>
        {error && (
          <p className="form-error" role="alert">
            {error}
            <button onClick={load}>Try again</button>
          </p>
        )}
        {loading ? (
          <p>Gathering your store details…</p>
        ) : editing ? (
          <ProductForm
            initial={
              editing === "new"
                ? blank
                : {
                    ...editing,
                    price: editing.price / 100,
                    mrp: editing.mrp / 100,
                  }
            }
            close={() => setEditing(null)}
            saved={async () => {
              setEditing(null);
              await load();
              await reload();
            }}
          />
        ) : tab === "overview" ? (
          <>
            <div className="section-heading">
              <div>
                <span className="eyebrow">A FRESH LITTLE START</span>
                <h1>Hello, snack maker.</h1>
                <p>Here’s what’s happening in your happy little store.</p>
              </div>
              <button
                className="button"
                onClick={() => {
                  setTab("products");
                  setEditing("new");
                }}
              >
                <Plus size={17} />
                Add a product
              </button>
            </div>
            <div className="stats-grid four">
              {[
                ["Live products", live.length, Package],
                ["Orders", orders.length, ShoppingBag],
                ["Paid revenue", money(revenue), LayoutDashboard],
                ["Snack circle", subscribers.length, Mail],
              ].map(([title, val, I]) => (
                <div key={title}>
                  <I size={21} />
                  <strong>{val}</strong>
                  <span>{title}</span>
                </div>
              ))}
            </div>
            <ServiceHealth services={insights?.services || []} compact />
            {!products.length ? (
              <div className="admin-welcome">
                <Package size={48} strokeWidth={1} />
                <h2>Your pantry is ready for its first snack.</h2>
                <p>
                  Add photos, ingredients, nutrition, pricing, and stock. Save a
                  draft or publish it straight to the store.
                </p>
                <button
                  className="button"
                  onClick={() => {
                    setTab("products");
                    setEditing("new");
                  }}
                >
                  Create your first product <Plus size={17} />
                </button>
              </div>
            ) : (
              <>
                <h2>A little stock check</h2>
                <div className="panel">
                  {products.filter((p) => p.status === "live" && p.stock < 10)
                    .length ? (
                    products
                      .filter((p) => p.status === "live" && p.stock < 10)
                      .map((p) => (
                        <div className="stock-row" key={p.id}>
                          <span>{p.name}</span>
                          <b>{p.stock} left</b>
                          <button
                            className="text-link"
                            onClick={() => {
                              setTab("products");
                              setEditing(p);
                            }}
                          >
                            Update stock <ArrowUpRight size={15} />
                          </button>
                        </div>
                      ))
                  ) : (
                    <p>All live products have at least 10 units in stock.</p>
                  )}
                </div>
              </>
            )}
            <div className="setup-checklist">
              <h2>Before your first real order</h2>
              <p>
                Complete business details and delivery policies, connect your
                payment account, and test your full checkout.
              </p>
              <div>
                <span>
                  <Check size={15} />
                  Admin account
                </span>
                <span>
                  <Check size={15} />
                  Empty catalog ready
                </span>
                <span>
                  {config?.paymentMode === "test" ? (
                    <AlertCircle size={15} />
                  ) : (
                    <Check size={15} />
                  )}{" "}
                  {config?.paymentMode === "test"
                    ? "Live payment setup needed"
                    : "Payment configuration"}
                </span>
              </div>
              <button className="text-link" onClick={() => setTab("settings")}>
                Review store settings <ArrowUpRight size={16} />
              </button>
            </div>
          </>
        ) : tab === "insights" ? (
          <InsightsPanel
            insights={insights}
            editProduct={(product) => {
              setTab("products");
              setEditing(products.find((item) => item.id === product.id));
            }}
          />
        ) : tab === "products" ? (
          <>
            <div className="section-heading">
              <div>
                <span className="eyebrow">THE PANTRY</span>
                <h1>Your products.</h1>
                <p>
                  {live.length} live ·{" "}
                  {products.filter((p) => p.status === "draft").length} drafts
                </p>
              </div>
              <button className="button" onClick={() => setEditing("new")}>
                <Plus size={17} />
                Add a product
              </button>
            </div>
            <label className="search-field">
              <Search size={18} />
              <input
                placeholder="Search your pantry…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search admin products"
              />
            </label>
            {products.length ? (
              <div className="admin-table">
                <table>
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Status</th>
                      <th>Price</th>
                      <th>Stock</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {matching.map((p) => (
                      <tr key={p.id}>
                        <td>
                          <div className="table-product">
                            {p.image ? (
                              <img src={p.image} alt="" />
                            ) : (
                              <Package size={28} />
                            )}
                            <span>
                              <strong>{p.name}</strong>
                              <small>
                                {p.category} · {p.weight}
                              </small>
                            </span>
                          </div>
                        </td>
                        <td>
                          <span className={"status " + p.status}>
                            {p.status}
                          </span>
                        </td>
                        <td>{money(p.price)}</td>
                        <td>{p.stock}</td>
                        <td>
                          <div className="table-actions">
                            <button
                              aria-label={"Edit " + p.name}
                              onClick={() => setEditing(p)}
                            >
                              <Pencil size={17} />
                            </button>
                            {p.status === "live" && (
                              <Link
                                aria-label={"View " + p.name}
                                to={"/product/" + p.slug}
                              >
                                <Eye size={17} />
                              </Link>
                            )}
                            <button
                              aria-label={"Delete " + p.name}
                              onClick={async () => {
                                if (
                                  !confirm(
                                    "Remove " +
                                      p.name +
                                      "? Products without orders are permanently deleted. Products in order history are safely archived.",
                                  )
                                )
                                  return;
                                try {
                                  const result = await api(
                                    "/admin/products/" + p.id,
                                    {
                                      method: "DELETE",
                                    },
                                  );
                                  await load();
                                  await reload();
                                  toast(
                                    result.deleted
                                      ? "Product deleted."
                                      : "Product archived to preserve order history.",
                                  );
                                } catch (e) {
                                  toast(e.message);
                                }
                              }}
                            >
                              <Trash2 size={17} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty
                icon={Package}
                title="A fresh shelf, full of possibility"
                description="Use Add a product to create your first snack. You control what goes live."
                action={null}
              />
            )}
          </>
        ) : tab === "orders" ? (
          <>
            <span className="eyebrow">LITTLE DELIVERIES OF JOY</span>
            <h1>Orders.</h1>
            <p>
              {orders.length} orders ·{" "}
              {orders.filter((o) => o.payment_status === "pending").length}{" "}
              awaiting payment
            </p>
            {orders.length ? (
              orders.map((o) => (
                <OrderCard key={o.id} order={o} reload={load} admin />
              ))
            ) : (
              <Empty
                icon={ShoppingBag}
                title="The first little order is on its way"
                description="Customer orders will appear here, ready to pack and send."
                action={null}
              />
            )}
          </>
        ) : tab === "subscribers" ? (
          <>
            <span className="eyebrow">YOUR GROWING COMMUNITY</span>
            <h1>The snack circle.</h1>
            <p>{subscribers.length} people have opted in for updates.</p>
            <div className="panel">
              {subscribers.length ? (
                <table>
                  <thead>
                    <tr>
                      <th>Email</th>
                      <th>Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subscribers.map((s) => (
                      <tr key={s.email}>
                        <td>{s.email}</td>
                        <td>
                          {new Date(s.created_at).toLocaleDateString("en-IN")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p>No subscribers yet. The homepage signup form is ready.</p>
              )}
            </div>
          </>
        ) : (
          <SettingsForm />
        )}
      </div>
    </section>
  );
}
const serviceIcons = {
  api: Server,
  database: Database,
  storage: Image,
  payments: CreditCard,
};
function ServiceHealth({ services, compact = false }) {
  return (
    <section className={"service-health " + (compact ? "compact" : "")}>
      <div className="admin-block-heading">
        <div>
          <span className="eyebrow">LIVE SERVICE HEALTH</span>
          <h2>Store systems.</h2>
        </div>
        <div className="health-legend" aria-label="Service status legend">
          <span>
            <i className="health-dot green" />
            Running
          </span>
          <span>
            <i className="health-dot orange" />
            Needs attention
          </span>
          <span>
            <i className="health-dot red" />
            Down or error
          </span>
        </div>
      </div>
      <div className="service-grid">
        {services.map((service) => {
          const Icon = serviceIcons[service.key] || Activity;
          return (
            <article className="service-card" key={service.key}>
              <div className="service-card-top">
                <span className={"health-icon " + service.status}>
                  <Icon size={18} />
                </span>
                <span className={"health-pill " + service.status}>
                  <i className={"health-dot " + service.status} />
                  {service.status === "green"
                    ? "Running"
                    : service.status === "orange"
                      ? "Attention"
                      : "Error"}
                </span>
              </div>
              <strong>{service.name}</strong>
              <p>{service.detail}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
function InsightsPanel({ insights, editProduct }) {
  if (!insights) return <p>Gathering product performance…</p>;
  const summary = insights.summary;
  return (
    <>
      <div className="section-heading insights-heading">
        <div>
          <span className="eyebrow">REAL STORE DATA</span>
          <h1>Product insights.</h1>
          <p>
            Last {insights.periodDays} days · paid orders only · updated{" "}
            {new Date(insights.generatedAt).toLocaleString("en-IN")}
          </p>
        </div>
      </div>
      <div className="stats-grid four insight-summary">
        {[
          ["Product views", summary.views30, Eye],
          ["Units sold", summary.units30, ShoppingBag],
          ["Product revenue", money(summary.revenue30), TrendingUp],
          ["Low stock", summary.lowStock, AlertCircle],
        ].map(([title, value, Icon]) => (
          <div key={title}>
            <Icon size={21} />
            <strong>{value}</strong>
            <span>{title}</span>
          </div>
        ))}
      </div>
      <ServiceHealth services={insights.services} />
      <section className="performance-section">
        <div className="admin-block-heading">
          <div>
            <span className="eyebrow">SALES & PRICE GUIDANCE</span>
            <h2>Product performance.</h2>
          </div>
          <p className="performance-note">
            Suggestions are cautious experiments based on your own traffic, paid
            orders, category prices, and stock—not guaranteed outcomes.
          </p>
        </div>
        <div className="admin-table performance-table">
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Views</th>
                <th>Units</th>
                <th>Revenue</th>
                <th>Conversion</th>
                <th>30-day trend</th>
                <th>Recommendation</th>
              </tr>
            </thead>
            <tbody>
              {insights.products.map((product) => {
                const PriceIcon =
                  product.priceDirection === "up"
                    ? TrendingUp
                    : product.priceDirection === "down"
                      ? TrendingDown
                      : Minus;
                return (
                  <tr key={product.id}>
                    <td>
                      <div className="table-product">
                        <img src={product.image} alt="" />
                        <span>
                          <strong>{product.name}</strong>
                          <small>
                            {money(product.price)} · {product.stock} in stock
                          </small>
                        </span>
                      </div>
                    </td>
                    <td>{product.views30}</td>
                    <td>{product.units30}</td>
                    <td>{money(product.revenue30)}</td>
                    <td>
                      {product.conversionRate === null
                        ? "Not enough data"
                        : `${product.conversionRate}%`}
                    </td>
                    <td>
                      <span
                        className={
                          "trend " +
                          (product.salesChangePercent > 0
                            ? "up"
                            : product.salesChangePercent < 0
                              ? "down"
                              : "steady")
                        }
                      >
                        {product.salesChangePercent > 0 ? "+" : ""}
                        {product.salesChangePercent}%
                      </span>
                    </td>
                    <td className="recommendation-cell">
                      <span
                        className={"price-signal " + product.priceDirection}
                      >
                        <PriceIcon size={15} />
                        {product.priceDirection === "up"
                          ? "Test price up"
                          : product.priceDirection === "down"
                            ? "Test price down"
                            : "Hold price"}
                      </span>
                      <p>
                        <Lightbulb size={14} />
                        {product.suggestion}
                      </p>
                      <button
                        className="text-link"
                        onClick={() => editProduct(product)}
                      >
                        Update product <Pencil size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
function LeafMark() {
  return <span className="admin-leaf">✳</span>;
}
function ProductForm({ initial, close, saved }) {
  const { toast } = useStore();
  const [p, setP] = useState(structuredClone(initial)),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [uploading, setUploading] = useState(false);
  const field = (key, label, opts = {}) => (
    <label className={opts.full ? "full" : ""}>
      {label}
      {opts.area ? (
        <textarea
          required={opts.required !== false}
          value={p[key]}
          onChange={(e) => setP({ ...p, [key]: e.target.value })}
          rows={opts.rows || 3}
        />
      ) : (
        <input
          value={p[key]}
          onChange={(e) => setP({ ...p, [key]: e.target.value })}
          required={opts.required !== false}
          type={opts.type || "text"}
          min={opts.min}
          step={opts.type === "number" ? "any" : undefined}
        />
      )}
    </label>
  );
  return (
    <>
      <button className="text-link" onClick={close}>
        <ArrowLeft size={16} />
        Back to products
      </button>
      <div className="section-heading">
        <div>
          <span className="eyebrow">MADE WITH A LITTLE EXTRA CARE</span>
          <h1>{p.id ? "Edit your snack." : "A new little favourite."}</h1>
        </div>
        <span className={"status " + p.status}>{p.status}</span>
      </div>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            await api("/admin/products" + (p.id ? "/" + p.id : ""), {
              method: p.id ? "PUT" : "POST",
              body: {
                ...p,
                price: Math.round(Number(p.price) * 100),
                mrp: Math.round(Number(p.mrp || p.price) * 100),
              },
            });
            toast(
              p.status === "live"
                ? "Your snack is live on the store!"
                : "Your product is saved.",
            );
            await saved();
          } catch (e) {
            setError(e.message);
          } finally {
            setBusy(false);
          }
        }}
        className="product-form"
      >
        <section className="panel">
          <h2>01 · The little introduction</h2>
          <div className="form-grid">
            {field("name", "Product name", { full: true })}
            {field("description", "Description", { area: true, full: true })}
            <label>
              Category
              <input
                list="categories"
                value={p.category}
                onChange={(e) => setP({ ...p, category: e.target.value })}
                required
              />
              <datalist id="categories">
                {categories.slice(1).map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </datalist>
            </label>
            <label>
              Genre / occasion
              <input
                list="genres"
                value={p.genre}
                onChange={(e) => setP({ ...p, genre: e.target.value })}
                required
              />
              <datalist id="genres">
                {genres.slice(1).map((g) => (
                  <option key={g}>{g}</option>
                ))}
              </datalist>
            </label>
            {field("slug", "URL slug (optional)", { required: false })}
            {field("weight", "Pack size (e.g. 250 g)")}
          </div>
        </section>
        <section className="panel">
          <h2>02 · Show off the good stuff</h2>
          <label className="upload-area">
            {p.image ? (
              <img src={p.image} alt="Product preview" />
            ) : (
              <Upload size={38} strokeWidth={1} />
            )}
            <span>
              {uploading
                ? "Uploading…"
                : p.image
                  ? "Choose a different photo"
                  : "Click to upload a product photo"}
            </span>
            <small>JPG, PNG or WebP · up to 5 MB</small>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={uploading}
              onChange={async (e) => {
                const f = e.target.files[0];
                if (!f) return;
                setUploading(true);
                setError("");
                try {
                  const data = new FormData();
                  data.append("image", f);
                  const result = await api("/admin/upload", {
                    method: "POST",
                    body: data,
                  });
                  setP((p) => ({ ...p, image: result.url }));
                } catch (e) {
                  setError(e.message);
                } finally {
                  setUploading(false);
                }
              }}
            />
          </label>
        </section>
        <section className="panel">
          <h2>03 · Price & pantry count</h2>
          <div className="form-grid">
            {field("price", "Selling price (₹)", { type: "number", min: 1 })}
            {field("mrp", "MRP (₹, optional)", {
              type: "number",
              min: 1,
              required: false,
            })}
            {field("stock", "Available stock (whole packs)", {
              type: "number",
              min: 0,
            })}
            <label>
              Visibility
              <select
                value={p.status}
                onChange={(e) => setP({ ...p, status: e.target.value })}
              >
                <option value="draft">Draft — only visible to admin</option>
                <option value="live">Live — available in the shop</option>
                <option value="archived">Archived — hidden from shop</option>
              </select>
            </label>
            <label className="check-label full">
              <input
                type="checkbox"
                checked={p.featured}
                onChange={(e) => setP({ ...p, featured: e.target.checked })}
              />
              Feature this snack on the homepage
            </label>
          </div>
        </section>
        <section className="panel">
          <h2>04 · Know every ingredient</h2>
          <div className="form-grid">
            {field(
              "ingredients",
              "Full ingredients (in descending order by weight)",
              { area: true, full: true },
            )}
            {field("allergens", "Allergens & cross-contamination information", {
              area: true,
              full: true,
            })}
            {field("benefits", "Verified product highlights (one per line)", {
              area: true,
              full: true,
              required: false,
            })}
          </div>
          <p className="fine-print">
            Use verified nutrition and ingredient claims. Do not promise weight
            loss, hair growth, or treatment of health conditions.
          </p>
        </section>
        <section className="panel">
          <h2>05 · Nutrition & care</h2>
          <div className="form-grid">
            {Object.keys(p.nutrition).map((key) => (
              <label key={key} className="capitalize">
                {key}
                {key === "serving" ? " size" : " (include unit)"}
                <input
                  value={p.nutrition[key]}
                  onChange={(e) =>
                    setP({
                      ...p,
                      nutrition: { ...p.nutrition, [key]: e.target.value },
                    })
                  }
                  placeholder={key === "serving" ? "e.g. 30 g" : "e.g. 4 g"}
                />
              </label>
            ))}
            {field("shelf_life", "Shelf life (from date of manufacture)")}
            {field("storage", "Storage instructions", {
              area: true,
              full: true,
            })}
          </div>
        </section>
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        <div className="form-actions">
          <button className="outline-button" type="button" onClick={close}>
            Cancel
          </button>
          <button className="button" disabled={busy || uploading}>
            {busy
              ? "Saving your snack…"
              : p.status === "live"
                ? "Save & publish product"
                : "Save product"}
            <Check size={17} />
          </button>
        </div>
      </form>
    </>
  );
}
function SettingsForm() {
  const { config, reload, toast } = useStore();
  const [s, setS] = useState({ ...config.settings }),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const field = (key, label, area = false) => (
    <label className={area ? "full" : ""}>
      {label}
      {area ? (
        <textarea
          rows={5}
          value={s[key]}
          onChange={(e) => setS({ ...s, [key]: e.target.value })}
        />
      ) : (
        <input
          type={
            ["shippingFee", "freeShippingAt"].includes(key) ? "number" : "text"
          }
          value={s[key]}
          onChange={(e) => setS({ ...s, [key]: e.target.value })}
        />
      )}
    </label>
  );
  return (
    <>
      <span className="eyebrow">THE HELPFUL DETAILS</span>
      <h1>Your store settings.</h1>
      <form
        className="product-form"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            await api("/admin/settings", { method: "PUT", body: s });
            await reload();
            toast("Your store details are saved.");
          } catch (e) {
            setError(e.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <section className="panel">
          <h2>Business & contact</h2>
          <div className="form-grid">
            {field("businessName", "Business name")}
            {field("businessAddress", "Business address")}
            {field("whatsapp", "WhatsApp (country code + digits)")}
            {field("contactEmail", "Support email")}
            {field("instagram", "Instagram URL")}
            {field("website", "Website URL")}
            {field("fssai", "FSSAI registration / licence number")}
            {field("announcement", "Announcement bar")}
          </div>
        </section>
        <section className="panel">
          <h2>Delivery</h2>
          <div className="form-grid">
            {field("shippingFee", "Flat shipping fee (₹)")}
            {field("freeShippingAt", "Free shipping above (₹)")}
            {field("shippingPolicy", "Shipping policy", true)}
            {field("refundPolicy", "Returns & refunds policy", true)}
          </div>
        </section>
        <section className="panel">
          <h2>Store policies</h2>
          <div className="form-grid">
            {field("privacyPolicy", "Privacy policy", true)}
            {field("terms", "Terms & conditions", true)}
          </div>
        </section>
        <section className="panel">
          <h2>Payment configuration</h2>
          <p>
            Current mode: <strong>{config.paymentMode}</strong>. Payment
            credentials are configured on the server, never in this form.
          </p>
          <p>
            See the project README for payment setup, PostgreSQL deployment, and
            your launch checks.
          </p>
        </section>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button className="button" disabled={busy}>
          Save store settings <Check size={17} />
        </button>
      </form>
    </>
  );
}
