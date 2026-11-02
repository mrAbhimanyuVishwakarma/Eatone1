-- Eat.one1 production schema.
-- The application uses a protected server-side PostgreSQL connection. RLS is
-- enabled without public policies so Supabase's anonymous API cannot expose
-- customer, order, session, or catalog administration data.

create table if not exists public.users (
  id text primary key,
  email text unique not null,
  name text not null,
  password text not null,
  role text not null default 'customer',
  created_at text not null
);

create table if not exists public.sessions (
  token text primary key,
  user_id text not null references public.users(id) on delete cascade,
  expires_at text not null
);

create table if not exists public.products (
  id text primary key,
  name text not null,
  slug text unique not null,
  description text not null,
  category text not null,
  genre text not null,
  price integer not null check (price > 0),
  mrp integer not null,
  weight text not null,
  stock integer not null check (stock >= 0),
  image text not null,
  ingredients text not null,
  allergens text not null,
  nutrition text not null,
  benefits text not null,
  shelf_life text not null,
  storage text not null,
  status text not null,
  featured integer not null default 0,
  created_at text not null
);

create table if not exists public.wishlist (
  user_id text not null references public.users(id) on delete cascade,
  product_id text not null references public.products(id) on delete cascade,
  primary key (user_id, product_id)
);

create table if not exists public.orders (
  id text primary key,
  user_id text not null references public.users(id),
  items text not null,
  address text not null,
  total integer not null,
  shipping integer not null,
  status text not null,
  payment_status text not null,
  payment_mode text not null,
  provider_order_id text unique,
  payment_id text unique,
  idempotency_key text unique not null,
  tracking text not null default '',
  created_at text not null
);

create table if not exists public.addresses (
  user_id text primary key references public.users(id) on delete cascade,
  address text not null
);

create table if not exists public.settings (
  id text primary key,
  value text not null
);

create table if not exists public.subscribers (
  email text primary key,
  created_at text not null
);

create index if not exists idx_orders_user on public.orders(user_id);
create index if not exists idx_products_status on public.products(status);
create index if not exists idx_sessions_expiry on public.sessions(expires_at);

alter table public.users enable row level security;
alter table public.sessions enable row level security;
alter table public.products enable row level security;
alter table public.wishlist enable row level security;
alter table public.orders enable row level security;
alter table public.addresses enable row level security;
alter table public.settings enable row level security;
alter table public.subscribers enable row level security;

