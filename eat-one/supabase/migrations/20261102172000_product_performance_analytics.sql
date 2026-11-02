create table if not exists public.product_views (
  id text primary key,
  product_id text not null references public.products(id) on delete cascade,
  viewed_at text not null
);

create index if not exists idx_product_views_product_date
  on public.product_views(product_id, viewed_at);

alter table public.product_views enable row level security;
