-- ─── Extensions ──────────────────────────────────────────────────────────────
create extension if not exists "pgcrypto";

-- ─── Enums ────────────────────────────────────────────────────────────────────
create type user_role as enum ('client', 'admin');
create type client_status as enum ('active', 'paused', 'completed', 'churned');
create type step_type as enum ('video', 'document', 'form', 'upload', 'booking', 'conditional', 'external', 'dashboard');
create type step_status as enum ('locked', 'available', 'in_progress', 'completed');
create type notification_type as enum ('step_completed', 'module_unlocked', 'reminder', 'stuck_alert', 'file_uploaded', 'system');

-- ─── Profiles ─────────────────────────────────────────────────────────────────
create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  role        user_role not null default 'client',
  display_name text,
  email       text not null,
  created_at  timestamptz not null default now()
);

alter table profiles enable row level security;
create policy "Users read own profile"     on profiles for select using (auth.uid() = id);
create policy "Users update own profile"   on profiles for update using (auth.uid() = id);
create policy "Admins read all profiles"   on profiles for select using (
  exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
);

-- ─── Clients ──────────────────────────────────────────────────────────────────
create table clients (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid unique not null references auth.users(id) on delete cascade,
  company_name      text not null,
  has_ghl           boolean not null default false,
  has_fb_ads        boolean not null default false,
  status            client_status not null default 'active',
  current_module_id uuid,
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

alter table clients enable row level security;
create policy "Clients read own row"   on clients for select using (auth.uid() = user_id);
create policy "Clients update own row" on clients for update using (auth.uid() = user_id);
create policy "Admins read all"        on clients for select using (
  exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
);
create policy "Admins update all"      on clients for update using (
  exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
);
create policy "Admins insert"          on clients for insert with check (
  exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
);

-- ─── Modules ──────────────────────────────────────────────────────────────────
create table modules (
  id           uuid primary key default gen_random_uuid(),
  slug         text unique not null,
  order_index  int not null,
  title        text not null,
  description  text,
  unlock_rule  text not null default 'previous_complete',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table modules enable row level security;
create policy "Anyone read modules" on modules for select using (true);
create policy "Admins manage modules" on modules for all using (
  exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
);

-- ─── Steps ────────────────────────────────────────────────────────────────────
create table steps (
  id          uuid primary key default gen_random_uuid(),
  module_id   uuid not null references modules(id) on delete cascade,
  slug        text not null,
  order_index int not null,
  title       text not null,
  type        step_type not null,
  config      jsonb not null default '{}',
  sla_hours   int not null default 72,
  version     int not null default 1,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (module_id, slug)
);

alter table steps enable row level security;
create policy "Anyone read steps"   on steps for select using (true);
create policy "Admins manage steps" on steps for all using (
  exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
);

-- ─── Client Progress ──────────────────────────────────────────────────────────
create table client_progress (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid not null references clients(id) on delete cascade,
  step_id      uuid not null references steps(id) on delete cascade,
  status       step_status not null default 'locked',
  started_at   timestamptz,
  completed_at timestamptz,
  due_at       timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (client_id, step_id)
);

alter table client_progress enable row level security;
create policy "Clients read own progress" on client_progress for select using (
  exists (select 1 from clients c where c.id = client_id and c.user_id = auth.uid())
);
create policy "Clients update own progress" on client_progress for update using (
  exists (select 1 from clients c where c.id = client_id and c.user_id = auth.uid())
);
create policy "Admins read all progress" on client_progress for select using (
  exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
);
create policy "Admins update all progress" on client_progress for update using (
  exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
);
create policy "Service role insert" on client_progress for insert with check (true);

-- ─── Form Submissions ─────────────────────────────────────────────────────────
create table client_form_submissions (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid not null references clients(id) on delete cascade,
  step_id      uuid not null references steps(id) on delete cascade,
  payload      jsonb not null,
  submitted_at timestamptz not null default now()
);

alter table client_form_submissions enable row level security;
create policy "Clients read own submissions" on client_form_submissions for select using (
  exists (select 1 from clients c where c.id = client_id and c.user_id = auth.uid())
);
create policy "Clients insert own submissions" on client_form_submissions for insert with check (
  exists (select 1 from clients c where c.id = client_id and c.user_id = auth.uid())
);
create policy "Admins read all submissions" on client_form_submissions for select using (
  exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
);

-- ─── Uploads ──────────────────────────────────────────────────────────────────
create table client_uploads (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references clients(id) on delete cascade,
  step_id     uuid not null references steps(id) on delete cascade,
  file_path   text not null,
  file_name   text not null,
  size        bigint not null,
  mime        text not null,
  uploaded_at timestamptz not null default now()
);

alter table client_uploads enable row level security;
create policy "Clients read own uploads" on client_uploads for select using (
  exists (select 1 from clients c where c.id = client_id and c.user_id = auth.uid())
);
create policy "Clients insert own uploads" on client_uploads for insert with check (
  exists (select 1 from clients c where c.id = client_id and c.user_id = auth.uid())
);
create policy "Admins read all uploads" on client_uploads for select using (
  exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
);

-- ─── Bookings ─────────────────────────────────────────────────────────────────
create table client_bookings (
  id             uuid primary key default gen_random_uuid(),
  client_id      uuid not null references clients(id) on delete cascade,
  step_id        uuid not null references steps(id) on delete cascade,
  scheduled_for  timestamptz,
  provider       text not null default 'calendly',
  external_id    text,
  notes          text,
  created_at     timestamptz not null default now()
);

alter table client_bookings enable row level security;
create policy "Clients read own bookings" on client_bookings for select using (
  exists (select 1 from clients c where c.id = client_id and c.user_id = auth.uid())
);
create policy "Clients insert own bookings" on client_bookings for insert with check (
  exists (select 1 from clients c where c.id = client_id and c.user_id = auth.uid())
);
create policy "Admins read all bookings" on client_bookings for select using (
  exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
);

-- ─── Notifications ────────────────────────────────────────────────────────────
create table notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  type       notification_type not null,
  title      text not null,
  body       text not null,
  link       text,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);

alter table notifications enable row level security;
create policy "Users read own notifications" on notifications for select using (auth.uid() = user_id);
create policy "Users update own notifications" on notifications for update using (auth.uid() = user_id);
create policy "Service insert notifications" on notifications for insert with check (true);

-- ─── Reminder Log ─────────────────────────────────────────────────────────────
create table reminder_log (
  id         uuid primary key default gen_random_uuid(),
  client_id  uuid not null references clients(id) on delete cascade,
  step_id    uuid not null references steps(id) on delete cascade,
  kind       text not null,
  sent_at    timestamptz not null default now()
);

alter table reminder_log enable row level security;
create policy "Admins read reminder log" on reminder_log for select using (
  exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
);
create policy "Service insert reminder log" on reminder_log for insert with check (true);

-- ─── Audit Log ────────────────────────────────────────────────────────────────
create table audit_log (
  id            uuid primary key default gen_random_uuid(),
  actor_id      uuid not null references auth.users(id),
  action        text not null,
  subject_table text not null,
  subject_id    text not null,
  meta          jsonb not null default '{}',
  created_at    timestamptz not null default now()
);

alter table audit_log enable row level security;
create policy "Admins read audit log" on audit_log for select using (
  exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
);
create policy "Service insert audit log" on audit_log for insert with check (true);

-- ─── Updated_at triggers ──────────────────────────────────────────────────────
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger clients_updated_at    before update on clients    for each row execute function set_updated_at();
create trigger modules_updated_at    before update on modules    for each row execute function set_updated_at();
create trigger steps_updated_at      before update on steps      for each row execute function set_updated_at();
create trigger progress_updated_at   before update on client_progress for each row execute function set_updated_at();

-- ─── Auto-create profile on signup ───────────────────────────────────────────
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, email, role)
  values (
    new.id,
    new.email,
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'client')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ─── unlock_next_steps ────────────────────────────────────────────────────────
create or replace function unlock_next_steps(p_client_id uuid)
returns void language plpgsql security definer as $$
declare
  v_completed_step  steps%rowtype;
  v_next_step       steps%rowtype;
  v_current_module  modules%rowtype;
  v_next_module     modules%rowtype;
  v_all_done        boolean;
  v_progress_row    client_progress%rowtype;
begin
  -- Find all steps in modules where client has completed all steps
  -- For each module, check if all steps are completed
  for v_current_module in
    select distinct m.*
    from modules m
    join steps s on s.module_id = m.id
    join client_progress cp on cp.step_id = s.id
    where cp.client_id = p_client_id and cp.status = 'completed'
  loop
    -- Check if all steps in this module are completed
    select bool_and(cp.status = 'completed') into v_all_done
    from steps s
    join client_progress cp on cp.step_id = s.id and cp.client_id = p_client_id
    where s.module_id = v_current_module.id;

    if v_all_done then
      -- Find next module
      select * into v_next_module
      from modules
      where order_index = v_current_module.order_index + 1
      limit 1;

      if found then
        -- Unlock first step of next module
        select * into v_next_step
        from steps
        where module_id = v_next_module.id
        order by order_index
        limit 1;

        if found then
          -- Only unlock if currently locked (idempotent)
          update client_progress
          set status = 'available',
              due_at = now() + (v_next_step.sla_hours || ' hours')::interval
          where client_id = p_client_id
            and step_id = v_next_step.id
            and status = 'locked';

          -- Update client current_module_id
          update clients
          set current_module_id = v_next_module.id
          where id = p_client_id
            and (current_module_id = v_current_module.id or current_module_id is null);
        end if;
      end if;
    else
      -- Within module: unlock next step after each completed one
      for v_completed_step in
        select s.*
        from steps s
        join client_progress cp on cp.step_id = s.id
        where s.module_id = v_current_module.id
          and cp.client_id = p_client_id
          and cp.status = 'completed'
        order by s.order_index
      loop
        select * into v_next_step
        from steps
        where module_id = v_current_module.id
          and order_index = v_completed_step.order_index + 1
        limit 1;

        if found then
          update client_progress
          set status = 'available',
              due_at = now() + (v_next_step.sla_hours || ' hours')::interval
          where client_id = p_client_id
            and step_id = v_next_step.id
            and status = 'locked';
        end if;
      end loop;
    end if;
  end loop;
end;
$$;

-- ─── Storage bucket (run manually in Supabase dashboard or via CLI) ───────────
-- insert into storage.buckets (id, name, public) values ('client-assets', 'client-assets', false);
