import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const C = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const ACCOUNT = '0000000000';

test('actual PostgreSQL: grants, retries, wrong payments and client isolation', async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth; create table auth.users(id uuid primary key);
      insert into auth.users values ('${A}'),('${B}'),('${C}');`);
    await db.exec(await readFile(new URL('../schema.sql', import.meta.url), 'utf8'));
    const create = async (user, code) => (await db.query('select (public.commerce_create_order($1,$2,$3)).*', [user,code,ACCOUNT])).rows[0];
    const pay = async (order, id, overrides = {}) => {
      const data = { hash: id, amount: 20000, code: order.transfer_code, account: ACCOUNT, valid: true,
        time: (await db.query('select now() t')).rows[0].t, ...overrides };
      return (await db.query('select public.commerce_receive_payment($1,$2,$3,$4,$5,$6,$7) result',
        [id,data.hash,data.code,data.amount,data.account,data.time,data.valid])).rows[0].result;
    };
    const a = await create(A, 'IT1140AAAAAAAAAAAAAAAA');
    assert.equal(a.amount, 20000);
    const repeated = await create(A, 'IT1140BBBBBBBBBBBBBBBB');
    assert.equal(repeated.id, a.id, 'Double click returns same pending order');
    assert.equal((await pay(a,'wrong-amount',{ amount: 1 })).reason, 'wrong_amount');
    assert.equal((await pay(a,'wrong-account',{ account: '111111' })).reason, 'wrong_receiver');
    assert.equal((await pay(a,'wrong-bank',{ valid: false })).reason, 'wrong_receiver');
    assert.equal((await pay(a,'missing-bank-verification',{ valid: null })).reason, 'wrong_receiver');
    assert.equal((await pay(a,'wrong-code',{ code: 'IT1140FFFFFFFFFFFFFFFF' })).reason, 'unmatched_code');
    assert.equal((await db.query('select * from public.commerce_entitlements')).rows.length, 0);
    assert.equal((await pay(a,'real-payment')).outcome, 'granted');
    assert.equal((await pay(a,'real-payment')).outcome, 'duplicate');
    await assert.rejects(pay(a,'real-payment',{ hash: 'changed', amount: 1 }), /transaction_payload_conflict/);
    assert.equal((await pay(a,'extra-transfer')).reason, 'order_not_pending');
    const entitlements = (await db.query('select * from public.commerce_entitlements')).rows;
    assert.equal(entitlements.length, 1);
    assert.equal(entitlements[0].user_id, A);
    assert.equal(entitlements[0].expires_at, null, 'Lifetime is actually non-expiring');
    await assert.rejects(create(A,'IT1140CCCCCCCCCCCCCCCC'), /already_owned/);
    const b = await create(B,'IT1140BBBBBBBBBBBBBBBB');
    await db.query("update public.commerce_orders set created_at=now()-interval '2 hours',expires_at=now()-interval '1 hour' where id=$1",[b.id]);
    assert.equal((await pay(b,'late')).reason, 'late_payment');
    // A webhook delayed by an hour still grants an on-time bank transfer.
    const inTime = (await db.query("select now()-interval '90 minutes' t")).rows[0].t;
    assert.equal((await pay(b,'delayed-webhook',{ time: inTime })).outcome, 'granted');
    const c = await create(C,'IT1140CCCCCCCCCCCCCCCC');
    await db.query("update public.commerce_orders set status='cancelled' where id=$1",[c.id]);
    assert.equal((await pay(c,'cancelled')).reason,'order_not_pending');
    assert.equal((await pay(c,'no-time',{ time: null })).reason,'invalid_bank_time');
    await db.query('update public.commerce_entitlements set revoked_at=now() where user_id=$1',[A]);
    await assert.rejects(create(A,'IT1140DDDDDDDDDDDDDDDD'), /contact_support/);
    assert.equal((await db.query("select public.commerce_rate_limit('test',2,60) ok")).rows[0].ok,true);
    assert.equal((await db.query("select public.commerce_rate_limit('test',2,60) ok")).rows[0].ok,true);
    assert.equal((await db.query("select public.commerce_rate_limit('test',2,60) ok")).rows[0].ok,false);
    for (const role of ['anon','authenticated']) {
      await db.exec(`set role ${role}`);
      for (const table of ['commerce_products','commerce_orders','commerce_entitlements','commerce_payments','commerce_rate_limits']) {
        await assert.rejects(db.query(`select * from public.${table}`), /permission denied/);
      }
      await assert.rejects(create(C,'IT1140DDDDDDDDDDDDDDDD'), /permission denied/);
      await assert.rejects(pay(c,'fake'), /permission denied/);
      await assert.rejects(db.query("select public.commerce_rate_limit('x',10,60)"),/permission denied/);
      await db.exec('reset role');
    }
    await db.exec('set role service_role');
    assert.equal((await db.query('select * from public.commerce_entitlements')).rows.length,2);
    await db.exec('reset role');
    assert.equal((await db.query("select * from public.commerce_payments where outcome='review'")).rows.length,9);
  } finally { await db.close(); }
});
