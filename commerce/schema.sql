-- Apply once in a dedicated Supabase project. Nothing here changes the live site.
begin;

create table public.commerce_products (
  id text primary key,
  title text not null,
  amount integer not null check (amount > 0),
  currency text not null default 'VND' check (currency = 'VND'),
  active boolean not null default true
);
insert into public.commerce_products (id, title, amount)
values ('it1140-lifetime', 'Quyền học IT1140 không thời hạn', 20000);

create table public.commerce_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  product_id text not null references public.commerce_products(id),
  transfer_code text not null unique check (transfer_code ~ '^IT1140[A-F0-9]{16}$'),
  amount integer not null check (amount > 0),
  account_number text not null,
  status text not null default 'pending' check (status in ('pending','paid','review','cancelled')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '30 minutes',
  paid_at timestamptz
);
create index commerce_orders_owner on public.commerce_orders(user_id, created_at desc);

create table public.commerce_entitlements (
  user_id uuid not null references auth.users(id),
  product_id text not null references public.commerce_products(id),
  order_id uuid not null unique references public.commerce_orders(id),
  granted_at timestamptz not null default now(),
  expires_at timestamptz, -- NULL is lifetime, not a recurring subscription.
  revoked_at timestamptz,
  primary key (user_id, product_id)
);

create table public.commerce_payments (
  transaction_id text primary key,
  payload_hash text not null,
  order_id uuid references public.commerce_orders(id),
  amount numeric not null,
  transfer_code text,
  account_number text,
  bank_time timestamptz,
  received_at timestamptz not null default now(),
  outcome text not null default 'review',
  reason text
);
create index commerce_payments_order on public.commerce_payments(order_id);

create table public.commerce_rate_limits (
  key text primary key,
  window_start timestamptz not null,
  hits integer not null check (hits > 0)
);

alter table public.commerce_products enable row level security;
alter table public.commerce_orders enable row level security;
alter table public.commerce_entitlements enable row level security;
alter table public.commerce_payments enable row level security;
alter table public.commerce_rate_limits enable row level security;
-- Intentionally no client policies. Even authenticated customers cannot write
-- orders, prices, payment states or entitlements through the Supabase Data API.
revoke all on public.commerce_products, public.commerce_orders,
  public.commerce_entitlements, public.commerce_payments,
  public.commerce_rate_limits from anon, authenticated;
grant all on public.commerce_products, public.commerce_orders,
  public.commerce_entitlements, public.commerce_payments,
  public.commerce_rate_limits to service_role;

create function public.commerce_rate_limit(p_key text, p_limit integer, p_seconds integer)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_hits integer;
begin
  insert into public.commerce_rate_limits(key, window_start, hits)
  values (p_key, now(), 1)
  on conflict (key) do update set
    hits = case when commerce_rate_limits.window_start < now() - make_interval(secs => p_seconds)
                then 1 else commerce_rate_limits.hits + 1 end,
    window_start = case when commerce_rate_limits.window_start < now() - make_interval(secs => p_seconds)
                        then now() else commerce_rate_limits.window_start end
  returning hits into v_hits;
  return v_hits <= p_limit;
end;
$$;

create function public.commerce_create_order(p_user_id uuid, p_code text, p_account text)
returns public.commerce_orders language plpgsql security definer set search_path = '' as $$
declare v_product public.commerce_products; v_order public.commerce_orders;
begin
  -- Serializes order creation for this buyer, including duplicate button clicks.
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));
  if exists (select 1 from public.commerce_entitlements where user_id=p_user_id
             and product_id='it1140-lifetime' and revoked_at is null
             and (expires_at is null or expires_at > now())) then
    raise exception 'already_owned';
  end if;
  if exists (select 1 from public.commerce_entitlements where user_id=p_user_id
             and product_id='it1140-lifetime' and revoked_at is not null) then
    raise exception 'contact_support';
  end if;
  select * into v_order from public.commerce_orders where user_id=p_user_id
    and product_id='it1140-lifetime' and status='pending' and expires_at>now()
    and account_number=p_account order by created_at desc limit 1;
  if found then return v_order; end if;
  select * into strict v_product from public.commerce_products
    where id='it1140-lifetime' and active;
  insert into public.commerce_orders(user_id, product_id, transfer_code, amount, account_number)
    values (p_user_id, v_product.id, p_code, v_product.amount, p_account)
    returning * into v_order;
  return v_order;
end;
$$;

create function public.commerce_receive_payment(
  p_transaction_id text, p_hash text, p_code text, p_amount numeric,
  p_account text, p_bank_time timestamptz, p_valid_receiver boolean
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_order public.commerce_orders; v_existing public.commerce_payments; v_reason text;
begin
  -- Both the event reservation and grant commit together; failed delivery can retry.
  insert into public.commerce_payments(transaction_id,payload_hash,amount,transfer_code,account_number,bank_time)
    values (p_transaction_id,p_hash,p_amount,p_code,p_account,p_bank_time)
    on conflict do nothing;
  if not found then
    select * into strict v_existing from public.commerce_payments where transaction_id=p_transaction_id;
    if v_existing.payload_hash <> p_hash then raise exception 'transaction_payload_conflict'; end if;
    return jsonb_build_object('outcome','duplicate');
  end if;
  select * into v_order from public.commerce_orders where transfer_code=p_code for update;
  if not found then v_reason := 'unmatched_code';
  elsif p_valid_receiver is not true or p_account is distinct from v_order.account_number then v_reason := 'wrong_receiver';
  elsif p_amount <> v_order.amount then v_reason := 'wrong_amount';
  elsif p_bank_time is null or p_bank_time > now() + interval '5 minutes'
     or p_bank_time < v_order.created_at - interval '5 seconds' then v_reason := 'invalid_bank_time';
  elsif p_bank_time > v_order.expires_at then v_reason := 'late_payment';
  elsif v_order.status <> 'pending' then v_reason := 'order_not_pending';
  elsif exists (select 1 from public.commerce_entitlements where user_id=v_order.user_id
               and product_id=v_order.product_id) then v_reason := 'entitlement_exists';
  end if;
  if v_reason is not null then
    update public.commerce_payments set order_id=v_order.id,reason=v_reason where transaction_id=p_transaction_id;
    return jsonb_build_object('outcome','review','reason',v_reason);
  end if;
  insert into public.commerce_entitlements(user_id,product_id,order_id,expires_at)
    values (v_order.user_id,v_order.product_id,v_order.id,null);
  update public.commerce_orders set status='paid',paid_at=p_bank_time where id=v_order.id;
  update public.commerce_payments set order_id=v_order.id,outcome='granted' where transaction_id=p_transaction_id;
  return jsonb_build_object('outcome','granted');
end;
$$;

revoke all on function public.commerce_rate_limit(text,integer,integer) from public,anon,authenticated;
revoke all on function public.commerce_create_order(uuid,text,text) from public,anon,authenticated;
revoke all on function public.commerce_receive_payment(text,text,text,numeric,text,timestamptz,boolean) from public,anon,authenticated;
grant execute on function public.commerce_rate_limit(text,integer,integer) to service_role;
grant execute on function public.commerce_create_order(uuid,text,text) to service_role;
grant execute on function public.commerce_receive_payment(text,text,text,numeric,text,timestamptz,boolean) to service_role;
commit;
