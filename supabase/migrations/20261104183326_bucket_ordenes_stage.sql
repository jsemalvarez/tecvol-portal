-- PDF de las órdenes en el ambiente de pruebas. Igual que `ordenes`: privado, sin políticas para anon ni
-- authenticated, solo la clave secreta del servidor crea los enlaces firmados.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('ordenes-stage', 'ordenes-stage', false, 52428800, array['application/pdf']);
