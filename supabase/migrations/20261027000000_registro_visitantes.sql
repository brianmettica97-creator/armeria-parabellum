-- ───────────────────────────────────────────────────────────────────────────
-- Registro liviano de visitantes · Armería Parabellum
-- Antes de la primera consulta por WhatsApp o del pedido, el sitio pide nombre,
-- apellido, email y WhatsApp (y en Armería, la CLU con su número opcional).
-- Pegar completo en Supabase → SQL Editor → Run. Se puede ejecutar más de una vez.
-- Requiere haber corrido antes 20261023000000_contactos.sql.
-- ───────────────────────────────────────────────────────────────────────────

-- 1) Contactos: datos nuevos del registro.
alter table public.contactos add column if not exists apellido   text;
alter table public.contactos add column if not exists clu_numero text;
-- De dónde llegó: formulario de novedades, consulta por WhatsApp o pedido.
alter table public.contactos add column if not exists origen     text not null default 'novedades';
-- Si aceptó recibir novedades y ofertas (el formulario de novedades siempre lo implica).
alter table public.contactos add column if not exists novedades  boolean not null default true;

alter table public.contactos drop constraint if exists contactos_apellido_check;
alter table public.contactos add constraint contactos_apellido_check
  check (apellido is null or char_length(apellido) between 1 and 80);
-- El número de CLU es opcional y solo se acepta si declaró tener CLU.
alter table public.contactos drop constraint if exists contactos_clu_numero_check;
alter table public.contactos add constraint contactos_clu_numero_check
  check (clu_numero is null or (clu = 'si' and char_length(clu_numero) between 3 and 30));
alter table public.contactos drop constraint if exists contactos_origen_check;
alter table public.contactos add constraint contactos_origen_check
  check (origen in ('novedades', 'consulta', 'pedido'));

-- 2) Consultas: qué consultó o pidió cada contacto registrado.
create table if not exists public.consultas (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  contacto_id uuid not null references public.contactos(id) on delete cascade,
  tipo        text not null check (tipo in ('consulta', 'pedido', 'compra-online')),
  detalle     text check (char_length(detalle) <= 600)
);
create index if not exists consultas_contacto_idx on public.consultas (contacto_id, created_at desc);

alter table public.consultas enable row level security;

-- El público solo puede anotar consultas (no puede leer, editar ni borrar).
drop policy if exists "publico anota consulta" on public.consultas;
create policy "publico anota consulta" on public.consultas
  for insert to anon, authenticated with check (true);

-- Solo los administradores ven y borran las consultas.
drop policy if exists "admins leen consultas" on public.consultas;
create policy "admins leen consultas" on public.consultas
  for select to authenticated using (public.es_admin());
drop policy if exists "admins borran consultas" on public.consultas;
create policy "admins borran consultas" on public.consultas
  for delete to authenticated using (public.es_admin());
