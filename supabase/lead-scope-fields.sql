-- Run this once in Supabase SQL Editor to add agency scope qualification fields.

alter table public.prospects
  add column if not exists budget_range text,
  add column if not exists deliverables text,
  add column if not exists timeline text,
  add column if not exists decision_maker text,
  add column if not exists service_type text;
