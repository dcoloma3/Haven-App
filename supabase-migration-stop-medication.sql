-- ============================================================
-- Migration: protect medication history from deletion
-- Deleting a medication used to CASCADE-delete every administration
-- record for it (medication_administrations + medication_not_given),
-- which wiped the resident's MAR. The app now "Stops" a medication
-- (sets end_date) instead of deleting it. This migration changes those
-- foreign keys from ON DELETE CASCADE to ON DELETE RESTRICT, so a
-- medication that has recorded doses can no longer be hard-deleted and
-- its history can't be lost. Idempotent (only touches FKs still CASCADE).
--
-- NOTE: this does not recover doses already deleted by a prior cascade;
-- those are only restorable from a database backup / point-in-time restore.
-- ============================================================

do $$
declare r record; col text;
begin
  for r in
    select con.conname, con.conrelid, cl.relname as child, con.conkey
    from pg_constraint con
    join pg_class cl  on cl.oid  = con.conrelid
    join pg_class ref on ref.oid = con.confrelid
    where con.contype = 'f'
      and ref.relname = 'medications'
      and con.connamespace = 'public'::regnamespace
      and cl.relname in ('medication_administrations', 'medication_not_given')
      and con.confdeltype = 'c'            -- currently ON DELETE CASCADE
  loop
    select a.attname into col
      from pg_attribute a
     where a.attrelid = r.conrelid and a.attnum = r.conkey[1];
    execute format('alter table public.%I drop constraint %I', r.child, r.conname);
    execute format('alter table public.%I add constraint %I foreign key (%I) references public.medications(id) on delete restrict',
                   r.child, r.conname, col);
  end loop;
end $$;

-- ROLLBACK (restores the old, data-losing cascade — not recommended):
-- do $$
-- declare r record; col text;
-- begin
--   for r in
--     select con.conname, con.conrelid, cl.relname as child, con.conkey
--     from pg_constraint con
--     join pg_class cl on cl.oid = con.conrelid
--     join pg_class ref on ref.oid = con.confrelid
--     where con.contype='f' and ref.relname='medications'
--       and con.connamespace='public'::regnamespace
--       and cl.relname in ('medication_administrations','medication_not_given')
--       and con.confdeltype='r'
--   loop
--     select a.attname into col from pg_attribute a where a.attrelid=r.conrelid and a.attnum=r.conkey[1];
--     execute format('alter table public.%I drop constraint %I', r.child, r.conname);
--     execute format('alter table public.%I add constraint %I foreign key (%I) references public.medications(id) on delete cascade', r.child, r.conname, col);
--   end loop;
-- end $$;
