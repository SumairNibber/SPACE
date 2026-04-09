create table if not exists public.space_cohort_members (
  id text primary key,
  name text not null
);

create table if not exists public.space_cases (
  id text primary key,
  title text not null,
  category text,
  difficulty text,
  link text,  
  notes text
);

create table if not exists public.space_sessions (
  id text primary key,
  date date not null,
  mentor_id text not null,
  mentor_name text not null,
  student_id text not null,
  student_name text not null,
  case_id text,
  case_title text not null,
  notes text,
  created_at timestamptz default now()
);

alter table public.space_cohort_members enable row level security;
alter table public.space_cases enable row level security;
alter table public.space_sessions enable row level security;

drop policy if exists "public read cohort" on public.space_cohort_members;
drop policy if exists "public write cohort" on public.space_cohort_members;
drop policy if exists "public update cohort" on public.space_cohort_members;
drop policy if exists "public delete cohort" on public.space_cohort_members;

drop policy if exists "public read cases" on public.space_cases;
drop policy if exists "public write cases" on public.space_cases;
drop policy if exists "public update cases" on public.space_cases;
drop policy if exists "public delete cases" on public.space_cases;

drop policy if exists "public read sessions" on public.space_sessions;
drop policy if exists "public write sessions" on public.space_sessions;
drop policy if exists "public update sessions" on public.space_sessions;
drop policy if exists "public delete sessions" on public.space_sessions;

create policy "public read cohort"
on public.space_cohort_members for select
to anon
using (true);

create policy "public write cohort"
on public.space_cohort_members for insert
to anon
with check (true);

create policy "public update cohort"
on public.space_cohort_members for update
to anon
using (true)
with check (true);

create policy "public delete cohort"
on public.space_cohort_members for delete
to anon
using (true);

create policy "public read cases"
on public.space_cases for select
to anon
using (true);

create policy "public write cases"
on public.space_cases for insert
to anon
with check (true);

create policy "public update cases"
on public.space_cases for update
to anon
using (true)
with check (true);

create policy "public delete cases"
on public.space_cases for delete
to anon
using (true);

create policy "public read sessions"
on public.space_sessions for select
to anon
using (true);

create policy "public write sessions"
on public.space_sessions for insert
to anon
with check (true);

create policy "public update sessions"
on public.space_sessions for update
to anon
using (true)
with check (true);

create policy "public delete sessions"
on public.space_sessions for delete
to anon
using (true);
