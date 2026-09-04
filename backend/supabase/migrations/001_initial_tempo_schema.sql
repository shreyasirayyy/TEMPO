create extension if not exists pgcrypto;

create or replace function public.tempo_set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = timezone('utc', now()); return new; end;
$$;

create table if not exists public.profiles (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null unique references auth.users(id) on delete cascade,
  name text not null default '',
  avatar_url text,
  planning_mode text check (planning_mode in ('Gentle', 'Pressure')),
  theme text check (theme in ('light', 'dark')) default 'light',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.tasks (
  id text primary key default gen_random_uuid()::text, user_id uuid not null references auth.users(id) on delete cascade,
  title text not null, category text, due text, due_at timestamptz, effort text, done boolean not null default false,
  priority text, notes text, created_at timestamptz not null default timezone('utc', now()), updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.plan_blocks (
  id text primary key default gen_random_uuid()::text, user_id uuid not null references auth.users(id) on delete cascade,
  task_id text references public.tasks(id) on delete set null, title text not null, day text not null, start_time time not null,
  duration_minutes integer not null check (duration_minutes > 0), kind text, priority text, done boolean not null default false,
  fixed boolean not null default false, flexibility text, can_move boolean not null default true, source_type text, source_id text,
  notes text, created_at timestamptz not null default timezone('utc', now()), updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.captured_items (
  id text primary key default gen_random_uuid()::text, user_id uuid not null references auth.users(id) on delete cascade,
  capture_type text not null, raw_text text, proof text, status text not null default 'processing', extracted jsonb,
  created_at timestamptz not null default timezone('utc', now()), updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.applications (
  id text primary key default gen_random_uuid()::text, user_id uuid not null references auth.users(id) on delete cascade,
  company text not null default '', role text not null default '', status text not null, deadline text, deadline_at timestamptz,
  applied_on text, link text, questions jsonb not null default '[]'::jsonb, submitted_items jsonb not null default '[]'::jsonb,
  proof text, notes text, follow_up_date text, created_at timestamptz not null default timezone('utc', now()), updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.application_timeline_events (
  id text primary key default gen_random_uuid()::text, user_id uuid not null references auth.users(id) on delete cascade,
  application_id text not null references public.applications(id) on delete cascade, label text not null, event_date text not null, note text,
  created_at timestamptz not null default timezone('utc', now()), updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.career_goals (
  id text primary key default gen_random_uuid()::text, user_id uuid not null references auth.users(id) on delete cascade,
  title text not null, notes text, created_at timestamptz not null default timezone('utc', now()), updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.career_skills (
  id text primary key default gen_random_uuid()::text, user_id uuid not null references auth.users(id) on delete cascade,
  career_goal_id text not null references public.career_goals(id) on delete cascade, name text not null, status text not null,
  evidence text, is_gap boolean not null default false, created_at timestamptz not null default timezone('utc', now()), updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.learning_goals (
  id text primary key default gen_random_uuid()::text, user_id uuid not null references auth.users(id) on delete cascade,
  name text not null, progress numeric not null default 0, next_session text, notes text,
  created_at timestamptz not null default timezone('utc', now()), updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.learning_sessions (
  id text primary key default gen_random_uuid()::text, user_id uuid not null references auth.users(id) on delete cascade,
  learning_goal_id text references public.learning_goals(id) on delete cascade, title text, minutes integer not null default 0,
  completed_at timestamptz, notes text, created_at timestamptz not null default timezone('utc', now()), updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.subjects (
  id text primary key default gen_random_uuid()::text, user_id uuid not null references auth.users(id) on delete cascade,
  name text not null, code text, instructor text, created_at timestamptz not null default timezone('utc', now()), updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.courses (
  id text primary key default gen_random_uuid()::text, user_id uuid not null references auth.users(id) on delete cascade,
  subject_id text references public.subjects(id) on delete set null, name text not null, target numeric not null default 75,
  total_classes integer not null default 0, held_classes integer not null default 0, attended_classes integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()), updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.attendance (
  id text primary key default gen_random_uuid()::text, user_id uuid not null references auth.users(id) on delete cascade,
  course_id text not null references public.courses(id) on delete cascade, class_date date not null, attended boolean not null,
  created_at timestamptz not null default timezone('utc', now()), updated_at timestamptz not null default timezone('utc', now()), unique(user_id, course_id, class_date)
);

create table if not exists public.assignments (
  id text primary key default gen_random_uuid()::text, user_id uuid not null references auth.users(id) on delete cascade,
  course_id text references public.courses(id) on delete set null, title text not null, due_at timestamptz, status text not null default 'open',
  created_at timestamptz not null default timezone('utc', now()), updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.exams (
  id text primary key default gen_random_uuid()::text, user_id uuid not null references auth.users(id) on delete cascade,
  course_id text references public.courses(id) on delete set null, title text not null, starts_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()), updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.focus_sessions (
  id text primary key default gen_random_uuid()::text, user_id uuid not null references auth.users(id) on delete cascade,
  source_type text, source_id text, title text, started_at timestamptz, ended_at timestamptz, minutes integer not null default 0,
  status text not null default 'active', created_at timestamptz not null default timezone('utc', now()), updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.user_preferences (
  id text primary key default gen_random_uuid()::text, user_id uuid not null unique references auth.users(id) on delete cascade,
  planning_mode text check (planning_mode in ('Gentle', 'Pressure')), theme text check (theme in ('light', 'dark')) default 'light',
  planning_window_start time default '08:00', planning_window_end time default '23:00', created_at timestamptz not null default timezone('utc', now()), updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists plan_blocks_user_day_idx on public.plan_blocks(user_id, day, start_time);
create index if not exists applications_user_status_idx on public.applications(user_id, status);
create index if not exists timeline_application_idx on public.application_timeline_events(user_id, application_id);
create index if not exists career_skills_goal_idx on public.career_skills(user_id, career_goal_id);
create index if not exists attendance_course_idx on public.attendance(user_id, course_id, class_date);
create index if not exists focus_sessions_user_started_idx on public.focus_sessions(user_id, started_at);

create or replace function public.tempo_create_profile()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (user_id, name) values (new.id, coalesce(new.raw_user_meta_data->>'name', '')) on conflict (user_id) do nothing;
  insert into public.user_preferences (user_id) values (new.id) on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists tempo_on_auth_user_created on auth.users;
create trigger tempo_on_auth_user_created after insert on auth.users for each row execute function public.tempo_create_profile();

do $$
declare table_name text;
begin
  foreach table_name in array array['profiles','tasks','plan_blocks','captured_items','applications','application_timeline_events','career_goals','career_skills','learning_goals','learning_sessions','subjects','courses','attendance','assignments','exams','focus_sessions','user_preferences'] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('drop policy if exists %I on public.%I', table_name || '_select_own', table_name);
    execute format('drop policy if exists %I on public.%I', table_name || '_insert_own', table_name);
    execute format('drop policy if exists %I on public.%I', table_name || '_update_own', table_name);
    execute format('drop policy if exists %I on public.%I', table_name || '_delete_own', table_name);
    execute format('create policy %I on public.%I for select using (auth.uid() = user_id)', table_name || '_select_own', table_name);
    execute format('create policy %I on public.%I for insert with check (auth.uid() = user_id)', table_name || '_insert_own', table_name);
    execute format('create policy %I on public.%I for update using (auth.uid() = user_id) with check (auth.uid() = user_id)', table_name || '_update_own', table_name);
    execute format('create policy %I on public.%I for delete using (auth.uid() = user_id)', table_name || '_delete_own', table_name);
    execute format('drop trigger if exists %I on public.%I', table_name || '_updated_at', table_name);
    execute format('create trigger %I before update on public.%I for each row execute function public.tempo_set_updated_at()', table_name || '_updated_at', table_name);
  end loop;
end $$;
