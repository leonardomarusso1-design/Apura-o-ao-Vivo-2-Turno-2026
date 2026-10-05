-- Fila/histórico de avisos. A restrição unique impede enviar o mesmo aviso 2x à mesma pessoa/canal.
create table if not exists public.notifications (
  id            bigserial primary key,
  subscriber_id uuid not null references public.subscribers(id) on delete cascade,
  kind          text not null check (kind in ('lembrete','inicio','resultado')),
  channel       text not null check (channel in ('email','whatsapp')),
  status        text not null default 'pending' check (status in ('pending','sent','failed')),
  provider_id   text,
  error         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (subscriber_id, kind, channel)
);
create index if not exists notifications_status_idx on public.notifications (kind, channel, status);

alter table public.notifications enable row level security;
revoke all on public.notifications from anon, authenticated;

-- Reserva atomicamente até `lim` destinatários ainda não avisados e devolve os dados p/ envio.
-- Chamadas simultâneas nunca pegam a mesma pessoa (insert ... on conflict do nothing).
create or replace function public.claim_notifications(p_kind text, p_channel text, lim int)
returns table (notification_id bigint, subscriber_id uuid, name text, email text, phone text, unsub_token uuid)
language sql
security definer
set search_path = public
as $$
  with elegiveis as (
    select s.id
    from public.subscribers s
    where s.unsubscribed_at is null
      and (p_channel <> 'whatsapp' or s.phone is not null)
      and not exists (
        select 1 from public.notifications n
        where n.subscriber_id = s.id and n.kind = p_kind and n.channel = p_channel
      )
    order by s.created_at
    limit greatest(1, least(lim, 500))
    for update of s skip locked
  ),
  novas as (
    insert into public.notifications (subscriber_id, kind, channel)
    select id, p_kind, p_channel from elegiveis
    on conflict (subscriber_id, kind, channel) do nothing
    returning id, subscriber_id
  )
  select n.id, s.id, s.name, s.email::text, s.phone, s.unsub_token
  from novas n join public.subscribers s on s.id = n.subscriber_id;
$$;
revoke all on function public.claim_notifications(text, text, int) from public, anon, authenticated;
grant execute on function public.claim_notifications(text, text, int) to service_role;

create or replace function public.pending_count(p_kind text, p_channel text)
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select count(*) from public.subscribers s
  where s.unsubscribed_at is null
    and (p_channel <> 'whatsapp' or s.phone is not null)
    and not exists (select 1 from public.notifications n where n.subscriber_id = s.id and n.kind = p_kind and n.channel = p_channel);
$$;
revoke all on function public.pending_count(text, text) from public, anon, authenticated;
grant execute on function public.pending_count(text, text) to service_role;
