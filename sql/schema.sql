-- Furniture Workshop P&L Tracker - Supabase Schema
-- Run this in Supabase SQL Editor to create all tables

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Customers Table (from Customer Register sheet)
create table if not exists customers (
  id uuid default uuid_generate_v4() primary key,
  serial_no integer,
  order_no text unique not null,
  order_date date,
  customer_name text,
  phone text,
  item text,
  details text,
  order_amount numeric(12,2) default 0,
  advance numeric(12,2) default 0,
  remaining numeric(12,2) generated always as (order_amount - advance) stored,
  delivery_date date,
  status text default 'Pending' check (status in ('Pending', 'In Progress', 'Completed', 'Delivered', 'Cancelled')),
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Orders P&L Table (from Order Wise P&L sheet)
create table if not exists orders (
  id uuid default uuid_generate_v4() primary key,
  order_no text not null references customers(order_no) on delete cascade,
  material_cost numeric(12,2) default 0,
  labour_cost numeric(12,2) default 0,
  transport_cost numeric(12,2) default 0,
  other_cost numeric(12,2) default 0,
  total_expense numeric(12,2) generated always as (material_cost + labour_cost + transport_cost + other_cost) stored,
  profit_loss numeric(12,2) default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Daily Income & Expense Table
create table if not exists transactions (
  id uuid default uuid_generate_v4() primary key,
  date date not null default CURRENT_DATE,
  particulars text,
  category text,
  income numeric(12,2) default 0,
  expense numeric(12,2) default 0,
  payment_mode text check (payment_mode in ('Cash', 'Bank Transfer', 'JazzCash', 'EasyPaisa', 'Cheque', 'Other')),
  related_order_no text,
  balance numeric(12,2) default 0,
  month text,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Attendance Table
create table if not exists attendance (
  id uuid default uuid_generate_v4() primary key,
  worker_name text not null,
  designation text,
  monthly_salary numeric(12,2) default 0,
  daily_rate numeric(12,2) default 0,
  month text not null,
  year integer not null,
  working_days integer default 26,
  attendance_data jsonb default '{}',
  ot_data jsonb default '{}',
  present_days integer default 0,
  absent_days integer default 0,
  half_days integer default 0,
  payable_days numeric(5,2) default 0,
  ot_hours numeric(5,2) default 0,
  ot_multiplier numeric(3,1) default 1.5,
  ot_rate numeric(12,2) default 0,
  ot_amount numeric(12,2) default 0,
  gross_salary numeric(12,2) default 0,
  advance numeric(12,2) default 0,
  other_deduction numeric(12,2) default 0,
  net_payable numeric(12,2) default 0,
  paid_amount numeric(12,2) default 0,
  remaining numeric(12,2) default 0,
  status text default 'Active',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(worker_name, month, year)
);

-- Create indexes
create index if not exists idx_customers_order_no on customers(order_no);
create index if not exists idx_customers_status on customers(status);
create index if not exists idx_transactions_date on transactions(date);
create index if not exists idx_transactions_category on transactions(category);
create index if not exists idx_attendance_month_year on attendance(month, year);
create index if not exists idx_orders_order_no on orders(order_no);

-- Create updated_at trigger function
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

-- Apply triggers
create trigger update_customers_updated_at before update on customers
  for each row execute function update_updated_at_column();

create trigger update_orders_updated_at before update on orders
  for each row execute function update_updated_at_column();

-- 5. Cash Memos Table
create table if not exists cash_memos (
  id uuid default uuid_generate_v4() primary key,
  memo_no text not null,
  memo_date date not null default CURRENT_DATE,
  order_no text,
  customer_name text,
  phone text,
  items jsonb default '[]',
  advance_received numeric(12,2) default 0,
  total numeric(12,2) default 0,
  remaining numeric(12,2) default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_cash_memos_order_no on cash_memos(order_no);
create index if not exists idx_cash_memos_memo_date on cash_memos(memo_date);

-- RLS (Row Level Security) - Enable but allow all for now
alter table customers enable row level security;
alter table orders enable row level security;
alter table transactions enable row level security;
alter table attendance enable row level security;
alter table cash_memos enable row level security;

-- Allow all operations for authenticated and anon users (adjust for production)
create policy "Allow all on customers" on customers for all using (true) with check (true);
create policy "Allow all on orders" on orders for all using (true) with check (true);
create policy "Allow all on transactions" on transactions for all using (true) with check (true);
create policy "Allow all on attendance" on attendance for all using (true) with check (true);
create policy "Allow all on cash_memos" on cash_memos for all using (true) with check (true);
