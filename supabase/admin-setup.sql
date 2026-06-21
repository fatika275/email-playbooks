-- 1. Sign in through the app once so your user/profile exists.
-- 2. Copy your user ID from Supabase Authentication -> Users.
-- 3. Replace the placeholder below and run this file in the Supabase SQL editor.

insert into public.admin_users (user_id)
values ('YOUR-USER-UUID-HERE')
on conflict (user_id) do nothing;

-- Optional: give a signed-up user founder access at the default price.
update public.user_profiles
set founder_eligible = true,
    founder_price_gbp = 12
where user_id = 'SIGNED-UP-USER-UUID-HERE';

-- Optional: approve Founder by email after they have signed up.
-- Replace the email with the address you received in founder_waitlist.
update public.user_profiles
set founder_eligible = true,
    founder_price_gbp = 12
where lower(email) = lower('USER-EMAIL-HERE');

update public.founder_waitlist
set status = 'approved',
    updated_at = now()
where lower(email) = lower('USER-EMAIL-HERE');

-- Optional: remove founder access later.
update public.user_profiles
set founder_eligible = false,
    founder_price_gbp = null
where user_id = 'SIGNED-UP-USER-UUID-HERE';
