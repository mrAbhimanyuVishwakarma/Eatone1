import React, { useState, useEffect, createContext, useContext } from "react";
import {
  ArrowUpRight,
  ArrowRight,
  Search,
  Heart,
  ShoppingBag,
  UserRound,
  Menu,
  X,
  Plus,
  Minus,
  Leaf,
  Package,
  Check,
  ChevronDown,
  Instagram,
  MapPin,
  Sparkles,
} from "lucide-react";
import { api, money } from "./api";
import { Admin } from "./Admin";
import { Account, Checkout, Login } from "./Customer";
import { Home, Story, Journal, Newsletter } from "./Home";
export const Context = createContext();
export const useStore = () => useContext(Context);
export const categories = [
  "All snacks",
  "Nutrition laddoos",
  "Granola",
  "Nuts & seeds",
  "Snack boxes",
];
export const genres = [
  "All occasions",
  "Everyday snacking",
  "Breakfast ritual",
  "On the go",
  "Gifting",
];
export function Link({ to, children, ...props }) {
  return (
    <a
      href={to}
      {...props}
      onClick={(e) => {
        if (!e.ctrlKey && !e.metaKey && !props.target) {
          e.preventDefault();
          history.pushState({}, "", to);
          dispatchEvent(new PopStateEvent("popstate"));
          window.scrollTo({ top: 0, behavior: "instant" });
        }
        props.onClick?.(e);
      }}
    >
      {children}
    </a>
  );
}
export function Empty({
  icon: Icon = ShoppingBag,
  title,
  description,
  action = "Explore snacks",
  to = "/shop",
  onAction,
}) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <Icon size={36} strokeWidth={1.3} />
      </span>
      <h2>{title}</h2>
      <p>{description}</p>
      {action &&
        (onAction ? (
          <button className="button" onClick={onAction}>
            {action}
            <ArrowUpRight size={17} />
          </button>
        ) : (
          <Link className="button" to={to}>
            {action}
            <ArrowUpRight size={17} />
          </Link>
        ))}
    </div>
  );
}
export default function App() {
  const [route, setRoute] = useState(location.pathname + location.search),
    [user, setUser] = useState(null),
    [products, setProducts] = useState([]),
    [config, setConfig] = useState(null),
    [wishlist, setWishlist] = useState([]),
    [cart, setCart] = useState(() => {
      try {
        const x = JSON.parse(localStorage.getItem("eatone-cart") || "[]");
        return Array.isArray(x)
          ? x.filter(
              (i) =>
                typeof i.id === "string" &&
                Number.isInteger(i.quantity) &&
                i.quantity > 0,
            )
          : [];
      } catch {
        return [];
      }
    }),
    [cartOpen, setCartOpen] = useState(false),
    [mobile, setMobile] = useState(false),
    [notice, setNotice] = useState(""),
    [loading, setLoading] = useState(true),
    [loadError, setLoadError] = useState("");
  const toast = (message) => setNotice(message);
  async function reload() {
    const [p, c] = await Promise.all([api("/products"), api("/config")]);
    setProducts(p.products);
    setConfig(c);
  }
  useEffect(() => {
    const handler = () => {
      setRoute(location.pathname + location.search);
      setMobile(false);
      setCartOpen(false);
    };
    addEventListener("popstate", handler);
    Promise.all([reload(), api("/auth/me").then((d) => setUser(d.user))])
      .catch((e) => setLoadError(e.message))
      .finally(() => setLoading(false));
    return () => removeEventListener("popstate", handler);
  }, []);
  useEffect(() => {
    if (user)
      api("/wishlist")
        .then((d) => setWishlist(d.ids))
        .catch((e) => toast(e.message));
    else setWishlist([]);
  }, [user]);
  useEffect(() => {
    localStorage.setItem("eatone-cart", JSON.stringify(cart));
  }, [cart]);
  useEffect(() => {
    if (notice) {
      const t = setTimeout(() => setNotice(""), 4500);
      return () => clearTimeout(t);
    }
  }, [notice]);
  useEffect(() => {
    document.title = route.startsWith("/admin")
      ? "Admin · Eat.one1"
      : route.startsWith("/shop")
        ? "Shop our snacks · Eat.one1"
        : "Eat.one1 — A little crunch. A lot of joy.";
  }, [route]);
  function add(p) {
    setCart((c) => {
      const old = c.find((x) => x.id === p.id);
      if ((old?.quantity || 0) >= p.stock) {
        toast("That’s all the stock available right now.");
        return c;
      }
      return old
        ? c.map((x) => (x.id === p.id ? { ...x, quantity: x.quantity + 1 } : x))
        : [...c, { id: p.id, quantity: 1 }];
    });
    toast("A little joy added to your bag.");
  }
  async function wish(id) {
    if (!user) {
      history.pushState({}, "", "/login?next=/wishlist");
      dispatchEvent(new PopStateEvent("popstate"));
      return;
    }
    try {
      const exists = wishlist.includes(id);
      await api("/wishlist/" + id, { method: exists ? "DELETE" : "PUT" });
      setWishlist((w) => (exists ? w.filter((x) => x !== id) : [...w, id]));
    } catch (e) {
      toast(e.message);
    }
  }
  const value = {
    user,
    setUser,
    products,
    config,
    wishlist,
    cart,
    setCart,
    toast,
    reload,
    add,
    wish,
    setCartOpen,
    route,
  };
  const pathname = route.split("?")[0];
  return (
    <Context.Provider value={value}>
      <a className="skip" href="#main">
        Skip to content
      </a>
      <div className="announcement">
        {config?.settings.announcement ||
          "Little bites. Thoughtful ingredients. Made with love in Bangalore."}
        <span>
          Find your happy snack <Sparkles size={12} />
        </span>
      </div>
      <header>
        <Link to="/" className="logo" aria-label="Eat.one1 home">
          eat<span>one</span>
          <i>good food. good mood.</i>
        </Link>
        <nav aria-label="Main navigation">
          <Link className={pathname === "/shop" ? "active" : ""} to="/shop">
            Shop all
          </Link>
          <div className="nav-dropdown">
            <Link to="/shop">
              Shop by category <ChevronDown size={13} />
            </Link>
            <div className="dropdown">
              {categories.slice(1).map((c) => (
                <Link key={c} to={"/shop?category=" + encodeURIComponent(c)}>
                  {c}
                  <ArrowUpRight size={15} />
                </Link>
              ))}
            </div>
          </div>
          <Link to="/our-story">Our story</Link>
          <Link to="/journal">The snack journal</Link>
        </nav>
        <div className="header-actions">
          <Link to="/shop?search=1" aria-label="Search snacks">
            <Search />
          </Link>
          <Link to="/wishlist" aria-label="Wishlist">
            <Heart />
            <small>{wishlist.length || ""}</small>
          </Link>
          <Link to={user ? "/account" : "/login"} aria-label="Your account">
            <UserRound />
          </Link>
          <button
            onClick={() => setCartOpen(true)}
            aria-label="Open shopping bag"
          >
            <ShoppingBag />
            <small className="bag-count">
              {cart.reduce((a, b) => a + b.quantity, 0)}
            </small>
          </button>
          <button
            className="mobile-toggle"
            aria-label="Open menu"
            onClick={() => setMobile(!mobile)}
          >
            {mobile ? <X /> : <Menu />}
          </button>
        </div>
      </header>
      {mobile && (
        <nav className="mobile-nav">
          {[
            ["Shop all", "/shop"],
            ["Our story", "/our-story"],
            ["The snack journal", "/journal"],
            ["Your account", user ? "/account" : "/login"],
            ["Wishlist", "/wishlist"],
            ...(user?.role === "admin" ? [["Admin dashboard", "/admin"]] : []),
          ].map(([l, to]) => (
            <Link key={to} to={to}>
              {l}
              <ArrowUpRight size={18} />
            </Link>
          ))}
        </nav>
      )}
      <main id="main">
        {loading ? (
          <div className="page-loading">
            <Leaf className="float" />
            <p>Something good is coming…</p>
          </div>
        ) : loadError ? (
          <Empty
            title="We couldn’t load the store"
            description={loadError}
            action="Reload the page"
            onAction={() => location.reload()}
          />
        ) : pathname === "/" ? (
          <Home />
        ) : pathname === "/shop" ? (
          <Shop />
        ) : pathname.startsWith("/product/") ? (
          <Product slug={decodeURIComponent(pathname.slice(9))} />
        ) : pathname === "/wishlist" ? (
          <Wishlist />
        ) : pathname === "/login" ? (
          <Login />
        ) : pathname === "/checkout" ? (
          <Checkout />
        ) : pathname.startsWith("/account") ? (
          <Account />
        ) : pathname.startsWith("/admin") ? (
          <Admin />
        ) : pathname === "/our-story" ? (
          <Story />
        ) : pathname === "/journal" ? (
          <Journal />
        ) : pathname.startsWith("/policies/") ? (
          <Policy kind={pathname.split("/")[2]} />
        ) : (
          <Empty
            title="A little off the snack trail"
            description="That page doesn’t exist. Let’s find you something good."
          />
        )}
      </main>
      <Footer />
      {cartOpen && <Cart close={() => setCartOpen(false)} />}
      <div className={"toast " + (notice ? "show" : "")} role="status">
        <Check size={18} />
        {notice}
      </div>
    </Context.Provider>
  );
}
export function ProductCard({ p }) {
  const { add, wish, wishlist } = useStore();
  return (
    <article className="product-card">
      <div className="product-photo">
        <Link to={"/product/" + p.slug}>
          <img src={p.image} alt={p.name} loading="lazy" />
        </Link>
        {p.featured && <span className="product-badge">THE GOOD STUFF</span>}
        <button
          className={
            "wish-button " + (wishlist.includes(p.id) ? "selected" : "")
          }
          onClick={() => wish(p.id)}
          aria-label={"Save " + p.name}
        >
          <Heart size={19} />
        </button>
        {p.stock === 0 && <span className="sold-out">Back soon</span>}
      </div>
      <div className="product-topline">
        <small>{p.category}</small>
        <span>{p.weight}</span>
      </div>
      <Link to={"/product/" + p.slug}>
        <h3>{p.name}</h3>
      </Link>
      <p className="product-description">{p.description}</p>
      <div className="product-bottom">
        <strong>
          {money(p.price)} {p.mrp > p.price && <del>{money(p.mrp)}</del>}
        </strong>
        <button
          disabled={!p.stock}
          onClick={() => add(p)}
          aria-label={"Add " + p.name + " to bag"}
        >
          {p.stock ? "Add to bag" : "Sold out"}
          <Plus size={16} />
        </button>
      </div>
    </article>
  );
}
function Shop() {
  const { products, route } = useStore();
  const params = new URLSearchParams(route.split("?")[1]);
  const [category, setCategory] = useState(
      params.get("category") || "All snacks",
    ),
    [genre, setGenre] = useState("All occasions"),
    [search, setSearch] = useState(""),
    [sort, setSort] = useState("featured");
  useEffect(() => setCategory(params.get("category") || "All snacks"), [route]);
  const cats = [
    ...new Set([...categories, ...products.map((p) => p.category)]),
  ];
  const filtered = products
    .filter(
      (p) =>
        (category === "All snacks" || p.category === category) &&
        (genre === "All occasions" || p.genre === genre) &&
        `${p.name} ${p.ingredients} ${p.category}`
          .toLowerCase()
          .includes(search.toLowerCase()),
    )
    .sort((a, b) =>
      sort === "low"
        ? a.price - b.price
        : sort === "high"
          ? b.price - a.price
          : sort === "name"
            ? a.name.localeCompare(b.name)
            : Number(b.featured) - Number(a.featured),
    );
  return (
    <>
      <section className="page-banner">
        <span className="eyebrow">THE EAT.ONE1 PANTRY</span>
        <h1>
          Find your happy <em>snack.</em>
        </h1>
        <p>A little something for every craving, every day.</p>
      </section>
      <section className="section shop">
        <div className="shop-toolbar">
          <label className="search-field">
            <Search size={18} />
            <input
              autoFocus={params.has("search")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Find your next favourite…"
              aria-label="Search products"
            />
          </label>
          <label className="select-label">
            Sort by{" "}
            <select value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="featured">Featured</option>
              <option value="low">Price: low to high</option>
              <option value="high">Price: high to low</option>
              <option value="name">Name: A–Z</option>
            </select>
          </label>
        </div>
        <div className="filter-chips">
          {cats.map((c) => (
            <button
              key={c}
              className={category === c ? "selected" : ""}
              onClick={() => setCategory(c)}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="shop-meta">
          <p>
            {filtered.length} good {filtered.length === 1 ? "thing" : "things"}{" "}
            to discover
          </p>
          <label>
            Snack by occasion{" "}
            <select value={genre} onChange={(e) => setGenre(e.target.value)}>
              {[...new Set([...genres, ...products.map((p) => p.genre)])].map(
                (g) => (
                  <option key={g}>{g}</option>
                ),
              )}
            </select>
          </label>
        </div>
        {filtered.length ? (
          <div className="product-grid">
            {filtered.map((p) => (
              <ProductCard key={p.id} p={p} />
            ))}
          </div>
        ) : (
          <Empty
            icon={Leaf}
            title={
              products.length
                ? "No snacks found. Yet."
                : "Our pantry is getting ready."
            }
            description={
              products.length
                ? "Try another category or search to find your happy snack."
                : "The first fresh batch is on its way. Follow @eat.one1 for a peek behind the scenes."
            }
            action="Meet Eat.one1"
            to="/our-story"
          />
        )}
      </section>
    </>
  );
}
function Product({ slug }) {
  const { products, add, wish, wishlist } = useStore();
  const [tab, setTab] = useState("ingredients");
  const p = products.find((p) => p.slug === slug);
  useEffect(() => {
    if (p?.id)
      api(`/products/${p.id}/view`, { method: "POST", body: {} }).catch(
        () => {},
      );
  }, [p?.id]);
  if (!p)
    return (
      <Empty
        title="This snack is taking a break"
        description="It may be unavailable or not yet published."
      />
    );
  return (
    <section className="section">
      <div className="breadcrumbs">
        <Link to="/">Home</Link> / <Link to="/shop">Shop</Link> / {p.name}
      </div>
      <div className="product-detail">
        <div className="detail-image">
          <img src={p.image} alt={p.name} />
        </div>
        <div className="detail-copy">
          <span className="eyebrow">{p.category}</span>
          <h1>{p.name}</h1>
          <p>{p.description}</p>
          <div className="detail-price">
            {money(p.price)} {p.mrp > p.price && <del>{money(p.mrp)}</del>}
            <small>Inclusive of applicable taxes · {p.weight}</small>
          </div>
          {p.benefits && (
            <div className="product-highlights">
              {p.benefits
                .split("\n")
                .filter(Boolean)
                .map((t) => (
                  <span key={t}>
                    <Check size={15} />
                    {t}
                  </span>
                ))}
            </div>
          )}
          <div className="detail-actions">
            <button
              className="button"
              disabled={!p.stock}
              onClick={() => add(p)}
            >
              {p.stock ? "Add to your snack bag" : "Back soon"}
              <ShoppingBag size={18} />
            </button>
            <button
              className="outline-button"
              onClick={() => wish(p.id)}
              aria-label="Save to wishlist"
            >
              <Heart fill={wishlist.includes(p.id) ? "currentColor" : "none"} />
            </button>
          </div>
          <p className="stock-note">
            {p.stock > 0
              ? `${p.stock} available · A little joy, ready to go.`
              : "We’re getting the next batch ready."}
          </p>
          <div className="detail-tabs" role="tablist">
            {["ingredients", "nutrition", "care"].map((t) => (
              <button
                role="tab"
                aria-selected={tab === t}
                onClick={() => setTab(t)}
                key={t}
              >
                {t === "care" ? "Storage & shelf life" : t}
              </button>
            ))}
          </div>
          <div className="tab-content" role="tabpanel">
            {tab === "ingredients" ? (
              <>
                <h3>What goes into your snack</h3>
                <p>{p.ingredients}</p>
                <strong>Allergen information</strong>
                <p>{p.allergens}</p>
              </>
            ) : tab === "nutrition" ? (
              <>
                <h3>Know your numbers</h3>
                {Object.values(p.nutrition).some(Boolean) ? (
                  <dl className="nutrition">
                    {Object.entries(p.nutrition)
                      .filter(([, v]) => v)
                      .map(([k, v]) => (
                        <div key={k}>
                          <dt>{k}</dt>
                          <dd>{v}</dd>
                        </div>
                      ))}
                  </dl>
                ) : (
                  <p>
                    Nutrition information will be added by the Eat.one1 team.
                  </p>
                )}
                <small>See the pack for the latest information.</small>
              </>
            ) : (
              <>
                <h3>Keep the good stuff good</h3>
                <p>{p.storage}</p>
                <strong>Shelf life</strong>
                <p>{p.shelf_life}</p>
              </>
            )}
          </div>
          <p className="fine-print">
            Please read the full ingredient and allergen information before
            ordering.
          </p>
        </div>
      </div>
    </section>
  );
}
function Wishlist() {
  const { user, products, wishlist } = useStore();
  const saved = products.filter((p) => wishlist.includes(p.id));
  return (
    <section className="section">
      <div className="section-heading">
        <div>
          <span className="eyebrow">SAVED FOR A SNACKY DAY</span>
          <h1>
            Your little <em>wishlist.</em>
          </h1>
        </div>
        <Heart size={35} strokeWidth={1} />
      </div>
      {!user ? (
        <Empty
          icon={Heart}
          title="Keep your favourites close"
          description="Sign in to save snacks and find them here anytime."
          action="Sign in"
          to="/login?next=/wishlist"
        />
      ) : saved.length ? (
        <div className="product-grid">
          {saved.map((p) => (
            <ProductCard key={p.id} p={p} />
          ))}
        </div>
      ) : (
        <Empty
          icon={Heart}
          title="A little room for favourites"
          description="Tap the heart on a snack to keep it here for later."
        />
      )}
    </section>
  );
}
function Cart({ close }) {
  const { cart, setCart, products, config } = useStore();
  const rows = cart.map((i) => ({
    ...i,
    p: products.find((p) => p.id === i.id),
  }));
  const subtotal = rows.reduce((a, i) => a + (i.p?.price || 0) * i.quantity, 0);
  const threshold = (config?.settings.freeShippingAt || 799) * 100;
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") close();
    };
    addEventListener("keydown", handler);
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      removeEventListener("keydown", handler);
      document.body.style.overflow = original;
    };
  }, []);
  return (
    <div className="drawer-overlay" onClick={close}>
      <aside
        className="cart-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Shopping bag"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="drawer-header">
          <h2>
            Your happy little bag <span>({cart.length})</span>
          </h2>
          <button onClick={close} aria-label="Close bag" autoFocus>
            <X />
          </button>
        </div>
        {!rows.length ? (
          <Empty
            title="A little empty. For now."
            description="Your next favourite snack is waiting to be discovered."
          />
        ) : (
          <>
            <p className="shipping-progress">
              {subtotal >= threshold
                ? "A little extra joy: free shipping!"
                : `${money(threshold - subtotal)} away from free shipping`}
            </p>
            <progress value={Math.min(subtotal, threshold)} max={threshold} />
            <div className="cart-items">
              {rows.map((i) => (
                <div className="cart-item" key={i.id}>
                  {i.p ? (
                    <>
                      <img src={i.p.image} alt={i.p.name} />
                      <div>
                        <Link to={"/product/" + i.p.slug}>{i.p.name}</Link>
                        <small>{i.p.weight}</small>
                        <div className="quantity">
                          <button
                            aria-label={"Decrease " + i.p.name}
                            onClick={() =>
                              setCart((c) =>
                                c
                                  .map((x) =>
                                    x.id === i.id
                                      ? { ...x, quantity: x.quantity - 1 }
                                      : x,
                                  )
                                  .filter((x) => x.quantity > 0),
                              )
                            }
                          >
                            <Minus size={13} />
                          </button>
                          <span>{i.quantity}</span>
                          <button
                            aria-label={"Increase " + i.p.name}
                            disabled={
                              i.quantity >= i.p.stock || i.quantity >= 20
                            }
                            onClick={() =>
                              setCart((c) =>
                                c.map((x) =>
                                  x.id === i.id
                                    ? { ...x, quantity: x.quantity + 1 }
                                    : x,
                                ),
                              )
                            }
                          >
                            <Plus size={13} />
                          </button>
                        </div>
                      </div>
                      <strong>{money(i.quantity * i.p.price)}</strong>
                    </>
                  ) : (
                    <p>This item is no longer available.</p>
                  )}
                  <button
                    className="remove-item"
                    onClick={() =>
                      setCart((c) => c.filter((x) => x.id !== i.id))
                    }
                    aria-label="Remove item"
                  >
                    <X size={15} />
                  </button>
                </div>
              ))}
            </div>
            <div className="cart-total">
              <div>
                <span>Subtotal</span>
                <strong>{money(subtotal)}</strong>
              </div>
              <p>Shipping calculated at checkout. Taxes included.</p>
              <Link to="/checkout" className="button">
                Continue to checkout <ArrowRight size={17} />
              </Link>
              <button className="text-link" onClick={close}>
                Keep exploring
              </button>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
function Policy({ kind }) {
  const { config } = useStore();
  const item = {
    shipping: ["Shipping & delivery", "shippingPolicy"],
    refunds: ["Returns & refunds", "refundPolicy"],
    privacy: ["Privacy policy", "privacyPolicy"],
    terms: ["Terms & conditions", "terms"],
  }[kind];
  if (!item) return <Empty title="Page not found" />;
  return (
    <section className="section policy">
      <span className="eyebrow">THE HELPFUL DETAILS</span>
      <h1>{item[0]}</h1>
      <p>{config?.settings[item[1]]}</p>
      <h2>Need a hand?</h2>
      <p>Contact the Eat.one1 team with your order number.</p>
      <a
        className="button"
        href={"https://wa.me/" + config?.settings.whatsapp}
        target="_blank"
        rel="noreferrer"
      >
        Chat on WhatsApp <ArrowUpRight size={17} />
      </a>
    </section>
  );
}
function Footer() {
  const { config, user } = useStore();
  const s = config?.settings;
  return (
    <footer>
      <div className="footer-top">
        <div className="footer-brand">
          <Link className="logo" to="/">
            eat<span>one</span>
            <i>good food. good mood.</i>
          </Link>
          <p>
            A little crunch. A lot of joy.
            <br />
            Your everyday feel-good snack ritual.
          </p>
          <div className="footer-social">
            <a
              href="https://www.instagram.com/eat.one1/"
              aria-label="Eat.one1 on Instagram"
              target="_blank"
              rel="noreferrer"
            >
              <Instagram size={19} />
            </a>
            <a
              href={"https://wa.me/" + (s?.whatsapp || "918618401072")}
              target="_blank"
              rel="noreferrer"
            >
              Say hello <ArrowUpRight size={15} />
            </a>
          </div>
        </div>
        <div>
          <h3>The good stuff</h3>
          <Link to="/shop">Shop all snacks</Link>
          <Link to="/shop?category=Nutrition%20laddoos">Nutrition laddoos</Link>
          <Link to="/shop?category=Granola">Granola</Link>
          <Link to="/our-story">Our story</Link>
        </div>
        <div>
          <h3>A little help</h3>
          <Link to="/account/orders">Track your order</Link>
          <Link to="/policies/shipping">Shipping & delivery</Link>
          <Link to="/policies/refunds">Returns & refunds</Link>
          <Link to="/account">My account</Link>
        </div>
        <div>
          <h3>Let’s talk snacks</h3>
          <p>
            <MapPin size={14} />
            {s?.businessAddress || "Bangalore, India"}
          </p>
          <a href={"https://wa.me/" + (s?.whatsapp || "918618401072")}>
            +91 86184 01072 <ArrowUpRight size={14} />
          </a>
          {s?.contactEmail && (
            <a href={"mailto:" + s.contactEmail}>{s.contactEmail}</a>
          )}
          <p>Follow along @eat.one1</p>
          {s?.fssai && <p>FSSAI: {s.fssai}</p>}
        </div>
      </div>
      <div className="footer-bottom">
        <span>
          © {new Date().getFullYear()} Eat.one1. Made with a little extra love.
        </span>
        <div>
          <Link to="/policies/privacy">Privacy</Link>
          <Link to="/policies/terms">Terms</Link>
          <Link to="/admin">
            {user?.role === "admin" ? "Admin dashboard" : "Admin"}
          </Link>
        </div>
        <span>GOOD FOOD. GOOD MOOD.</span>
      </div>
    </footer>
  );
}
