create schema app;
revoke all on schema app from public;
create table app.users (
  id uuid primary key, email text unique not null, created_at timestamptz not null default now(),
  disabled_at timestamptz
);
create table app.otp (
  id uuid primary key, email text not null, code_hash text not null, browser_hash text not null,
  attempts integer not null default 0, expires_at timestamptz not null,
  verified_at timestamptz, consumed_at timestamptz,
  enroll_hash text, enroll_expires_at timestamptz, created_at timestamptz not null default now()
);
create index otp_email on app.otp(email,created_at desc);
create table app.devices (
  id uuid primary key, user_id uuid not null references app.users(id), token_hash text not null,
  label text not null, created_at timestamptz not null default now(), revoked_at timestamptz
);
create index devices_user on app.devices(user_id) where revoked_at is null;
create unique index devices_active_token on app.devices(user_id,token_hash) where revoked_at is null;
create table app.sessions (
  id uuid primary key, user_id uuid not null references app.users(id), device_id uuid not null references app.devices(id),
  token_hash text unique not null, authenticated_at timestamptz not null default now(),
  expires_at timestamptz not null, revoked_at timestamptz
);
create index sessions_user on app.sessions(user_id);
create table app.device_changes (
  id bigint generated always as identity primary key, user_id uuid not null references app.users(id),
  device_id uuid not null, reason text not null, created_at timestamptz not null default now()
);
create index changes_user on app.device_changes(user_id,created_at);
create table app.leases (
  user_id uuid primary key references app.users(id), session_id uuid not null references app.sessions(id),
  generation uuid not null, expires_at timestamptz not null, changed_at timestamptz not null default now()
);
create table app.rate_limits (key text primary key, window_start timestamptz not null, hits integer not null);
create table app.products (id text primary key, amount integer not null check(amount>0), active boolean not null default true);
insert into app.products values ('it1140-lifetime',20000,true);
create table app.orders (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references app.users(id),
  product_id text not null references app.products(id), transfer_code text unique not null,
  amount integer not null check(amount>0), account_number text not null,
  status text not null default 'pending' check(status in ('pending','paid','cancelled')),
  created_at timestamptz not null default now(), expires_at timestamptz not null default now()+interval '30 minutes', paid_at timestamptz
);
create index orders_user on app.orders(user_id,created_at desc);
create table app.entitlements (
  user_id uuid not null references app.users(id), product_id text not null references app.products(id),
  order_id uuid unique references app.orders(id), granted_at timestamptz not null default now(), revoked_at timestamptz,
  primary key(user_id,product_id)
);
create table app.payments (
  transaction_id text primary key, payload_hash text not null, order_id uuid references app.orders(id),
  amount numeric not null, transfer_code text, account_number text, bank_time timestamptz,
  received_at timestamptz not null default now(), outcome text not null default 'review', reason text
);
create index payments_order on app.payments(order_id);
create table app.exams (
  id uuid primary key, user_id uuid not null references app.users(id), question_ids jsonb not null,
  created_at timestamptz not null default now(), expires_at timestamptz not null default now()+interval '1 day',
  submitted_at timestamptz, result jsonb
);
create index exams_user on app.exams(user_id,created_at);
create table app.audit (
  id bigint generated always as identity primary key, actor text not null, action text not null,
  target uuid, reason text not null, created_at timestamptz not null default now()
);

create function app.rate_limit(p_key text,p_limit integer,p_seconds integer) returns boolean
language plpgsql set search_path='' as $$
declare n integer;
begin
  insert into app.rate_limits values(p_key,now(),1) on conflict(key) do update set
    hits=case when rate_limits.window_start<now()-make_interval(secs=>p_seconds) then 1 else rate_limits.hits+1 end,
    window_start=case when rate_limits.window_start<now()-make_interval(secs=>p_seconds) then now() else rate_limits.window_start end
    returning hits into n;
  return n<=p_limit;
end $$;

create function app.create_order(p_user_id uuid,p_code text,p_account text) returns app.orders
language plpgsql set search_path='' as $$
declare product app.products; existing app.orders;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text,0));
  if exists(select 1 from app.entitlements where user_id=p_user_id) then raise exception 'contact_support'; end if;
  select * into existing from app.orders where user_id=p_user_id and status='pending' and expires_at>now()
    and account_number=p_account order by created_at desc limit 1;
  if found then return existing; end if;
  select * into strict product from app.products where id='it1140-lifetime' and active;
  insert into app.orders(user_id,product_id,transfer_code,amount,account_number)
    values(p_user_id,product.id,p_code,product.amount,p_account) returning * into existing;
  return existing;
end $$;

create function app.receive_payment(p_transaction_id text,p_hash text,p_code text,p_amount numeric,
 p_account text,p_bank_time timestamptz,p_valid_receiver boolean) returns jsonb
language plpgsql set search_path='' as $$
declare o app.orders; event app.payments; why text;
begin
  insert into app.payments(transaction_id,payload_hash,amount,transfer_code,account_number,bank_time)
    values(p_transaction_id,p_hash,p_amount,p_code,p_account,p_bank_time) on conflict do nothing;
  if not found then
    select * into strict event from app.payments where transaction_id=p_transaction_id;
    if event.payload_hash<>p_hash then raise exception 'transaction_payload_conflict'; end if;
    return jsonb_build_object('outcome','duplicate');
  end if;
  -- All grants for one buyer serialize, including two different order IDs.
  select * into o from app.orders where transfer_code=p_code;
  if found then
    perform pg_advisory_xact_lock(hashtextextended(o.user_id::text,0));
    select * into o from app.orders where transfer_code=p_code for update;
  end if;
  if o.id is null then why:='unmatched_code';
  elsif p_valid_receiver is not true or p_account is distinct from o.account_number then why:='wrong_receiver';
  elsif p_amount is distinct from o.amount then why:='wrong_amount';
  elsif p_bank_time is null or p_bank_time>now()+interval '5 minutes' or p_bank_time<o.created_at-interval '5 seconds' then why:='invalid_bank_time';
  elsif p_bank_time>o.expires_at then why:='late_payment';
  elsif o.status<>'pending' then why:='order_not_pending';
  elsif exists(select 1 from app.entitlements where user_id=o.user_id and product_id=o.product_id) then why:='entitlement_exists';
  end if;
  if why is not null then
    update app.payments set order_id=o.id,reason=why where transaction_id=p_transaction_id;
    return jsonb_build_object('outcome','review','reason',why);
  end if;
  insert into app.entitlements(user_id,product_id,order_id) values(o.user_id,o.product_id,o.id);
  update app.orders set status='paid',paid_at=p_bank_time where id=o.id;
  update app.payments set order_id=o.id,outcome='granted' where transaction_id=p_transaction_id;
  return jsonb_build_object('outcome','granted');
end $$;
revoke all on all tables in schema app from public;
revoke all on all functions in schema app from public;
