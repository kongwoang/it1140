alter table app.exams add column bank_version text not null;
create table app.issued (
  user_id uuid not null references app.users(id), question_id text not null,
  created_at timestamptz not null default now(), primary key(user_id,question_id)
);
revoke all on app.issued from public;
