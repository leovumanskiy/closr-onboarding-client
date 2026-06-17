-- Rollback for 0019_drop_legacy_password_hash.sql
--
-- Re-creates the column AND restores the original values from the private
-- archive table. Only works while private._archive_clients_password_hash
-- still exists -- once that archive table is dropped, this rollback can
-- restore the column structure but not the data.

alter table public.clients add column if not exists password_hash text;

update public.clients c
   set password_hash = a.password_hash
  from private._archive_clients_password_hash a
 where a.id = c.id;
