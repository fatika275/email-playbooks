alter table public.user_profiles
  add column if not exists plan text not null default 'free'
    check (plan in ('free', 'pro', 'founder', 'business')),
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists updated_at timestamptz not null default now();

create index if not exists user_profiles_plan_idx
  on public.user_profiles (plan);

create index if not exists user_profiles_stripe_subscription_idx
  on public.user_profiles (stripe_subscription_id);
