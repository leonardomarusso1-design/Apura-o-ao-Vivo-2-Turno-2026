-- Lista de espera do 2º turno
create extension if not exists citext;

create table if not exists public.subscribers (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  name          text,
  email         citext not null unique,
  phone         text,                       -- apenas dígitos, com DDI (55...)
  consent_at    timestamptz not null,       -- LGPD: quando aceitou
  consent_text  text not null,              -- versão do texto aceito
  ref_code      text not null unique,       -- código de indicação dele
  referred_by   text,                       -- ref_code de quem indicou
  unsub_token   uuid not null default gen_random_uuid(),
  unsubscribed_at timestamptz,
  ip_hash       text,
  utm_source    text,
  notified_at   timestamptz                 -- preenchido quando disparar o aviso
);

create index if not exists subscribers_referred_by_idx on public.subscribers (referred_by);
create index if not exists subscribers_created_at_idx  on public.subscribers (created_at);

-- Sem policies = ninguém acessa via anon key. Só a service role (servidor).
alter table public.subscribers enable row level security;
revoke all on public.subscribers from anon, authenticated;

-- Contagem pública segura (sem expor dados)
create or replace function public.waiting_count()
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select count(*) from public.subscribers where unsubscribed_at is null;
$$;
revoke all on function public.waiting_count() from public;
grant execute on function public.waiting_count() to service_role;
