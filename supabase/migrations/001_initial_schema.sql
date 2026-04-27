-- スタッフ
create table staffs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  employment_type text not null check (employment_type in ('part_time', 'full_time')),
  hourly_rate integer,
  monthly_salary integer,
  working_days_per_month integer not null default 22,
  created_at timestamptz not null default now()
);
-- シフトテンプレ
create table shift_templates (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references staffs(id) on delete cascade,
  slot integer not null check (slot in (1, 2, 3)),
  label text,
  start_time time not null,
  end_time time not null,
  days_of_week integer[],
  updated_at timestamptz not null default now(),
  unique (staff_id, slot)
);
-- シフト希望・確定
create table shift_requests (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references staffs(id) on delete cascade,
  date date not null,
  start_time time not null,
  end_time time not null,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'rejected', 'added')),
  created_at timestamptz not null default now(),
  unique (staff_id, date)
);
-- 通知
create table notifications (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid references staffs(id) on delete cascade,
  message text not null,
  type text not null check (type in ('deadline', 'offer', 'confirmed')),
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
-- ポイント
create table points (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references staffs(id) on delete cascade,
  date date not null,
  amount integer not null,
  reason text,
  approved boolean not null default false,
  approved_at timestamptz,
  created_at timestamptz not null default now()
);
-- 日報
create table daily_reports (
  id uuid primary key default gen_random_uuid(),
  date date unique not null,
  revenue integer,
  total_labor_cost integer,
  labor_rate numeric(5,2),
  overtime_logs jsonb default '[]',
  created_at timestamptz not null default now()
);
-- 設定
create table settings (key text primary key, value jsonb not null);
insert into settings (key, value) values
  ('budget', '{"weekday": 45000, "weekend": 55000}'),
  ('deadline', '{"first_half": 5, "second_half": 20}'),
  ('salary_formula', '{"working_days_per_month": 22}');
-- RLS無効化（認証なし設計のため）
alter table staffs disable row level security;
alter table shift_templates disable row level security;
alter table shift_requests disable row level security;
alter table notifications disable row level security;
alter table points disable row level security;
alter table daily_reports disable row level security;
alter table settings disable row level security;
