-- Programs: let clients be assigned to a cohort (DFY / DWY / …) and have the
-- portal render only that cohort's modules.
--
-- Modelled as a many-to-many join rather than `modules.program_id` so a module
-- like "Getting Started" can live in several programs at once and be authored
-- once. Ordering is per-program, which is why `order_index` sits on the join
-- and not on `modules`.
--
-- Purely additive: no drops, no type changes, no existing row is rewritten.
-- Existing behaviour is preserved by 0021, which backfills every current module
-- and client onto a default `core` program. Run 0020 and 0021 together.

begin;

-- ─── programs ─────────────────────────────────────────────────────────────────

create table if not exists public.programs (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  description text,
  is_default  boolean not null default false,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- At most one default program. The default is the fallback for any client whose
-- program_id is null, so two defaults would make that fallback non-deterministic.
create unique index if not exists programs_one_default_idx
  on public.programs (is_default) where is_default;

drop trigger if exists programs_set_updated_at on public.programs;
create trigger programs_set_updated_at
  before update on public.programs
  for each row execute function public.set_updated_at();

-- ─── module_programs ──────────────────────────────────────────────────────────

create table if not exists public.module_programs (
  module_id   uuid not null references public.modules(id)  on delete cascade,
  program_id  uuid not null references public.programs(id) on delete cascade,
  order_index int  not null,
  primary key (module_id, program_id)
);

-- Deliberately NOT unique on (program_id, order_index): reorderModulesInProgram
-- renumbers with sequential UPDATEs, which a non-deferrable unique index would
-- reject mid-renumber. Matches modules.order_index, which is also non-unique.
create index if not exists module_programs_program_order_idx
  on public.module_programs (program_id, order_index);

-- ─── clients.program_id ───────────────────────────────────────────────────────

alter table public.clients
  add column if not exists program_id uuid references public.programs(id) on delete set null;

create index if not exists clients_program_id_idx on public.clients (program_id);

-- 0018 revoked blanket SELECT on clients in favour of a column allowlist, so a
-- new column is invisible to `authenticated` until it is granted explicitly.
-- Without this, getClient() in lib/auth/requireUser.ts fails for every client.
grant select (program_id) on public.clients to authenticated;

commit;
