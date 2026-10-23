-- ───────────────────────────────────────────────────────────────────────────
-- Formulario de novedades y ofertas · Armería Parabellum
-- Pegar completo en Supabase → SQL Editor → Run. Se puede ejecutar más de una vez.
-- Requiere haber corrido antes 20261022000000_admin_y_fotos.sql (función es_admin).
-- ───────────────────────────────────────────────────────────────────────────
create table if not exists public.contactos (
  id             uuid primary key default gen_random_uuid(),
  created_at     timestamptz not null default now(),
  nombre         text not null check (char_length(nombre) between 2 and 120),
  telefono       text not null check (char_length(telefono) between 6 and 30),
  email          text not null check (char_length(email) between 5 and 160 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  -- Solo la condición, nunca el número de credencial.
  clu            text check (clu in ('si', 'no', 'tramite')),
  sector         text check (sector in ('armeria', 'camping')),
  consentimiento boolean not null check (consentimiento)
);

alter table public.contactos enable row level security;

-- Cualquiera puede ENVIAR el formulario (no puede leer, editar ni borrar).
drop policy if exists "publico envia contacto" on public.contactos;
create policy "publico envia contacto" on public.contactos
  for insert to anon, authenticated with check (consentimiento);

-- Solo los administradores ven y borran los contactos.
drop policy if exists "admins leen contactos" on public.contactos;
create policy "admins leen contactos" on public.contactos
  for select to authenticated using (public.es_admin());
drop policy if exists "admins borran contactos" on public.contactos;
create policy "admins borran contactos" on public.contactos
  for delete to authenticated using (public.es_admin());

-- Reubica el producto de protección auditiva en la subcategoría nueva.
update public.productos set subcategory = 'protectores-auditivos'
  where id = 'accesorio-proteccion' and subcategory = 'proteccion';

-- Descripciones más cortas: quita la frase repetida al final de las fichas de
-- referencia (el aviso general ya está en cada ficha del sitio).
update public.productos
  set description = regexp_replace(description, '\s*Modelo, (acabado|variante) y disponibilidad deben confirmarse con Armería Parabellum\.\s*$', '')
  where description ~ 'deben confirmarse con Armería Parabellum\.\s*$';
