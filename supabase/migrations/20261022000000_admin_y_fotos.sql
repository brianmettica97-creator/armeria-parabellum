-- ───────────────────────────────────────────────────────────────────────────
-- Seguridad del panel y depósito de fotos · Armería Parabellum
-- Pegar completo en Supabase → SQL Editor → Run. Se puede ejecutar más de una vez.
-- ───────────────────────────────────────────────────────────────────────────

-- 1) Lista de administradores. SOLO estos emails pueden crear, editar o borrar.
--    Para sumar a otra persona: insert into public.admins (email) values ('otro@mail.com');
create table if not exists public.admins (
  email text primary key
);
alter table public.admins enable row level security;
-- Nadie puede leer ni tocar esta tabla desde la web (solo desde el panel de Supabase).

insert into public.admins (email) values ('parabellumoutdoor@gmail.com')
  on conflict do nothing;

create or replace function public.es_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.admins
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

-- 2) Productos: el público lee los publicados; solo los admins escriben.
--    (Antes cualquier usuario registrado podía editar: se reemplaza esa regla.)
drop policy if exists "admin gestiona productos" on public.productos;
drop policy if exists "admins leen todo" on public.productos;
drop policy if exists "admins crean" on public.productos;
drop policy if exists "admins editan" on public.productos;
drop policy if exists "admins borran" on public.productos;

create policy "admins leen todo" on public.productos
  for select to authenticated using (public.es_admin());
create policy "admins crean" on public.productos
  for insert to authenticated with check (public.es_admin());
create policy "admins editan" on public.productos
  for update to authenticated using (public.es_admin()) with check (public.es_admin());
create policy "admins borran" on public.productos
  for delete to authenticated using (public.es_admin());

-- Fotos adicionales de cada producto (galería): lista de {src}.
alter table public.productos add column if not exists photos jsonb;

-- 3) Depósito de fotos "productos": cualquiera puede VER las fotos,
--    solo los admins pueden subir, reemplazar o borrar. Máximo 5 MB por foto.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('productos', 'productos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = true,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "fotos admins suben" on storage.objects;
drop policy if exists "fotos admins editan" on storage.objects;
drop policy if exists "fotos admins borran" on storage.objects;

create policy "fotos admins suben" on storage.objects
  for insert to authenticated with check (bucket_id = 'productos' and public.es_admin());
create policy "fotos admins editan" on storage.objects
  for update to authenticated using (bucket_id = 'productos' and public.es_admin());
create policy "fotos admins borran" on storage.objects
  for delete to authenticated using (bucket_id = 'productos' and public.es_admin());
drop policy if exists "fotos admins listan" on storage.objects;
create policy "fotos admins listan" on storage.objects
  for select to authenticated using (bucket_id = 'productos' and public.es_admin());
