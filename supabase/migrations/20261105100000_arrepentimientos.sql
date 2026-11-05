-- ───────────────────────────────────────────────────────────────────────────
-- Botón de arrepentimiento (Ley 24.240 art. 34 · Res. SCI 424/2020) · Armería Parabellum
-- Pegar completo en Supabase → SQL Editor → Run. Se puede ejecutar más de una vez.
-- Requiere haber corrido antes 20261022000000_admin_y_fotos.sql (función es_admin).
--
-- Seguridad: el público solo puede ENVIAR un pedido de revocación (no leer, editar ni borrar).
-- Solo los administradores los ven y los marcan como atendidos.
-- ───────────────────────────────────────────────────────────────────────────
create table if not exists public.arrepentimientos (
  id          uuid primary key,                       -- lo genera el navegador; sus 8 primeros caracteres son la constancia
  created_at  timestamptz not null default now(),
  nombre      text not null check (char_length(nombre) between 2 and 120),
  email       text not null check (char_length(email) between 5 and 160),
  telefono    text not null check (char_length(telefono) between 6 and 30),
  pedido      text not null check (char_length(pedido) between 1 and 120),
  atendido_at timestamptz
);

create index if not exists arrepentimientos_fecha_idx on public.arrepentimientos (created_at desc);

alter table public.arrepentimientos enable row level security;

drop policy if exists "publico envia arrepentimiento" on public.arrepentimientos;
create policy "publico envia arrepentimiento" on public.arrepentimientos
  for insert to anon, authenticated with check (atendido_at is null);

drop policy if exists "admins leen arrepentimientos" on public.arrepentimientos;
create policy "admins leen arrepentimientos" on public.arrepentimientos
  for select to authenticated using (public.es_admin());

drop policy if exists "admins atienden arrepentimientos" on public.arrepentimientos;
create policy "admins atienden arrepentimientos" on public.arrepentimientos
  for update to authenticated using (public.es_admin()) with check (public.es_admin());
