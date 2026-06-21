create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text,
  founder_eligible boolean not null default false,
  founder_price_gbp integer,
  created_at timestamptz not null default now()
);

alter table public.user_profiles enable row level security;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

create table if not exists public.founder_waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  user_id uuid references auth.users (id) on delete set null,
  source text not null default 'founder_page',
  status text not null default 'interested',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.founder_waitlist
  add column if not exists user_id uuid references auth.users (id) on delete set null,
  add column if not exists source text not null default 'founder_page',
  add column if not exists status text not null default 'interested',
  add column if not exists updated_at timestamptz not null default now();

create index if not exists founder_waitlist_created_at_idx
  on public.founder_waitlist (created_at desc);

create index if not exists founder_waitlist_email_idx
  on public.founder_waitlist (lower(email));

alter table public.founder_waitlist enable row level security;

create policy "Admins can read admin membership"
  on public.admin_users
  for select
  using (auth.uid() = user_id);

create policy "Anyone can register founder interest"
  on public.founder_waitlist
  for insert
  with check (true);

create policy "Admins can read founder waitlist"
  on public.founder_waitlist
  for select
  using (
    exists (
      select 1
      from public.admin_users
      where admin_users.user_id = auth.uid()
    )
  );

create policy "Admins can update founder waitlist"
  on public.founder_waitlist
  for update
  using (
    exists (
      select 1
      from public.admin_users
      where admin_users.user_id = auth.uid()
    )
  );

create policy "Users and admins can read profiles"
  on public.user_profiles
  for select
  using (
    auth.uid() = user_id
    or exists (
      select 1
      from public.admin_users
      where admin_users.user_id = auth.uid()
    )
  );

create policy "Users can insert their own profile"
  on public.user_profiles
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own profile"
  on public.user_profiles
  for update
  using (auth.uid() = user_id);

create policy "Admins can update all profiles"
  on public.user_profiles
  for update
  using (
    exists (
      select 1
      from public.admin_users
      where admin_users.user_id = auth.uid()
    )
  );

create table if not exists public.saved_emails (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  playbook_id text not null,
  template_id text not null,
  template_label text not null,
  subject text not null,
  body text not null,
  tags text[] not null default '{}',
  folder text,
  is_favorite boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.saved_emails
  add column if not exists tags text[] not null default '{}',
  add column if not exists folder text,
  add column if not exists is_favorite boolean not null default false;

create index if not exists saved_emails_user_id_idx
  on public.saved_emails (user_id, created_at desc);

alter table public.saved_emails enable row level security;

create policy "Users can read their own saved emails"
  on public.saved_emails
  for select
  using (auth.uid() = user_id);

create policy "Users can insert their own saved emails"
  on public.saved_emails
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own saved emails"
  on public.saved_emails
  for update
  using (auth.uid() = user_id);

create table if not exists public.custom_templates (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  subject text not null,
  body text not null,
  source_playbook_id text not null,
  source_template_id text not null,
  tags text[] not null default '{}',
  folder text,
  is_favorite boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.custom_templates
  add column if not exists tags text[] not null default '{}',
  add column if not exists folder text,
  add column if not exists is_favorite boolean not null default false;

create index if not exists custom_templates_user_id_idx
  on public.custom_templates (user_id, created_at desc);

alter table public.custom_templates enable row level security;

create policy "Users can read their own custom templates"
  on public.custom_templates
  for select
  using (auth.uid() = user_id);

create policy "Users can insert their own custom templates"
  on public.custom_templates
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own custom templates"
  on public.custom_templates
  for update
  using (auth.uid() = user_id);
