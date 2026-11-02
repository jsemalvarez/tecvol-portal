-- PDF de las órdenes de trabajo. Privado: sin políticas para anon ni authenticated, solo la clave secreta
-- del servidor (Vercel) crea los enlaces firmados para subir y abrir cada archivo.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('ordenes', 'ordenes', false, 52428800, array['application/pdf']);
