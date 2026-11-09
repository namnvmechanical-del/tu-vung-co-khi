-- Từ vựng Cơ khí Anh–Nhật: schema, quyền truy cập, thanh toán
-- Chạy một lần trên project Supabase (SQL editor hoặc `supabase db push`).

-- ========== Sản phẩm (gói bán) ==========
create table if not exists public.products (
  id          text primary key,
  name_vi     text not null,
  desc_vi     text not null default '',
  scope       text not null check (scope in ('all','en','ja')),
  days        int  check (days is null or days > 0),        -- null = trọn đời
  price_vnd   int  not null check (price_vnd >= 2000),
  price_jpy   int  not null check (price_jpy >= 100),
  sort        int  not null default 0,
  highlight   boolean not null default false,
  active      boolean not null default true
);

-- ========== Nội dung từ vựng (chỉ đọc qua hàm get_module) ==========
create table if not exists public.words (
  module_id int  not null,
  pos       int  not null,          -- thứ tự trong phần (0..), khớp manifest.lessons[].start
  topic_id  int  not null,
  data      jsonb not null,
  primary key (module_id, pos)
);

-- ========== Đơn hàng ==========
create table if not exists public.orders (
  id           uuid primary key default gen_random_uuid(),
  order_code   bigint not null unique,
  user_id      uuid not null references auth.users(id) on delete cascade,
  product_id   text not null references public.products(id),
  provider     text not null check (provider in ('payos','stripe')),
  amount       int  not null,
  currency     text not null check (currency in ('VND','JPY')),
  status       text not null default 'pending' check (status in ('pending','paid','cancelled')),
  provider_ref text,
  created_at   timestamptz not null default now(),
  paid_at      timestamptz
);
create index if not exists orders_user_idx on public.orders(user_id, created_at desc);

-- ========== Quyền học (cấp khi thanh toán thành công) ==========
create table if not exists public.entitlements (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  scope      text not null check (scope in ('all','en','ja')),
  expires_at timestamptz,                                   -- null = trọn đời
  order_id   uuid unique references public.orders(id),
  note       text,
  created_at timestamptz not null default now()
);
create index if not exists ent_user_idx on public.entitlements(user_id);

-- ========== Tiến độ học ==========
create table if not exists public.progress (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ========== RLS ==========
alter table public.products     enable row level security;
alter table public.words        enable row level security;   -- không có policy: không ai đọc trực tiếp
alter table public.orders       enable row level security;
alter table public.entitlements enable row level security;
alter table public.progress     enable row level security;

drop policy if exists products_read on public.products;
create policy products_read on public.products for select to anon, authenticated using (active);

drop policy if exists orders_own on public.orders;
create policy orders_own on public.orders for select to authenticated using (user_id = auth.uid());

drop policy if exists ent_own on public.entitlements;
create policy ent_own on public.entitlements for select to authenticated using (user_id = auth.uid());

drop policy if exists progress_sel on public.progress;
drop policy if exists progress_ins on public.progress;
drop policy if exists progress_upd on public.progress;
create policy progress_sel on public.progress for select to authenticated using (user_id = auth.uid());
create policy progress_ins on public.progress for insert to authenticated with check (user_id = auth.uid());
create policy progress_upd on public.progress for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ========== Hàm ==========
-- Phần học miễn phí (đổi ở đây nếu muốn mở thêm)
create or replace function public.is_free_module(p_module int) returns boolean
language sql immutable as $$ select p_module in (1) $$;

create or replace function public.has_access(p_track text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.entitlements e
    where e.user_id = auth.uid()
      and e.scope in ('all', p_track)
      and (e.expires_at is null or e.expires_at > now())
  )
$$;

-- Trả dữ liệu 1 phần cho 1 ngôn ngữ, chỉ khi miễn phí hoặc đã mua.
create or replace function public.get_module(p_module int, p_track text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  keep text[];
  result jsonb;
begin
  if p_track not in ('en','ja') then
    raise exception 'invalid track';
  end if;
  if not public.is_free_module(p_module) and not public.has_access(p_track) then
    raise exception 'LOCKED' using errcode = '42501';
  end if;
  keep := case p_track
    when 'en' then array['en','ipa','pos','vi','level','def_vi','def_en','usage_en','context_vi','ex_en','ex_vi','syn_en','ja','kana']
    else           array['ja','kana','romaji','pos','vi','level','def_vi','def_ja','usage_ja','context_vi','ex_ja','ex_vi','syn_ja','en','ipa']
  end;
  select jsonb_build_object('id', p_module, 'topics', coalesce(jsonb_agg(t order by t_first), '[]'::jsonb))
    into result
  from (
    select min(w.pos) as t_first,
           jsonb_build_object('id', w.topic_id,
             'words', jsonb_agg((select jsonb_object_agg(k, w.data -> k) from unnest(keep) k where w.data ? k) order by w.pos)) as t
    from public.words w
    where w.module_id = p_module
    group by w.topic_id
  ) s;
  return result;
end $$;

-- Ghi nhận thanh toán + cấp quyền. Chỉ service_role (Edge Functions) được gọi. Gọi lặp lại vẫn an toàn.
create or replace function public.grant_order(p_order_code bigint, p_provider_ref text, p_amount int)
returns text
language plpgsql security definer set search_path = public as $$
declare
  o public.orders%rowtype;
  p public.products%rowtype;
  base timestamptz;
  exp timestamptz;
begin
  select * into o from public.orders where order_code = p_order_code for update;
  if not found then return 'not_found'; end if;
  if o.status = 'paid' then return 'already_paid'; end if;
  if p_amount is not null and p_amount <> o.amount then return 'amount_mismatch'; end if;

  select * into p from public.products where id = o.product_id;

  if p.days is null then
    exp := null;
  else
    -- cộng dồn: nếu còn hạn thì gia hạn tiếp từ ngày hết hạn hiện tại
    select greatest(now(), coalesce(max(expires_at), now())) into base
      from public.entitlements
     where user_id = o.user_id and scope = p.scope and expires_at is not null;
    exp := base + make_interval(days => p.days);
  end if;

  update public.orders set status = 'paid', paid_at = now(), provider_ref = coalesce(p_provider_ref, provider_ref)
   where id = o.id;
  insert into public.entitlements(user_id, scope, expires_at, order_id)
       values (o.user_id, p.scope, exp, o.id);
  return 'granted';
end $$;

grant select on public.products to anon, authenticated;
grant select on public.orders, public.entitlements to authenticated;
grant select, insert, update on public.progress to authenticated;
grant all on public.products, public.words, public.orders, public.entitlements, public.progress to service_role;

revoke all on function public.grant_order(bigint, text, int) from public, anon, authenticated;
grant execute on function public.grant_order(bigint, text, int) to service_role;
grant execute on function public.get_module(int, text) to anon, authenticated;
grant execute on function public.has_access(text) to anon, authenticated;

-- ========== Gói bán mẫu (sửa giá trong Table Editor > products) ==========
insert into public.products (id, name_vi, desc_vi, scope, days, price_vnd, price_jpy, sort, highlight) values
  ('month',    'Gói 1 tháng',          'Mở toàn bộ 120 bài tiếng Anh và tiếng Nhật trong 30 ngày',  'all', 30,   99000,  600, 1, false),
  ('year',     'Gói 1 năm',            'Mở toàn bộ 120 bài tiếng Anh và tiếng Nhật trong 365 ngày', 'all', 365, 690000, 4200, 2, true),
  ('life_all', 'Trọn đời Anh + Nhật',  'Mua một lần, học mãi cả hai ngôn ngữ',                        'all', null, 1290000, 7800, 3, false),
  ('life_en',  'Trọn đời tiếng Anh',   'Mua một lần, học mãi lộ trình tiếng Anh',                     'en',  null, 790000, 4800, 4, false),
  ('life_ja',  'Trọn đời tiếng Nhật',  'Mua một lần, học mãi lộ trình tiếng Nhật',                    'ja',  null, 790000, 4800, 5, false)
on conflict (id) do nothing;
