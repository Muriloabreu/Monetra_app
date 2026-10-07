-- Monetra: schema inicial para o roadmap completo (PostgreSQL / Supabase).
-- Apenas estrutura e autorizacao: sem lancamentos financeiros de exemplo.
-- Valores monetarios em NUMERIC para evitar erros de ponto flutuante.

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  preferred_currency char(3) not null default 'BRL',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  account_type text not null check (account_type in ('checking','savings','cash','digital','other')),
  currency char(3) not null default 'BRL',
  opening_balance numeric(18,2) not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id,id)
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  kind text not null check (kind in ('income','expense')),
  color text,
  icon text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (user_id,id),
  unique (user_id,kind,name)
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  account_id uuid not null,
  category_id uuid,
  kind text not null check (kind in ('income','expense')),
  description text not null check (length(trim(description)) > 0),
  amount numeric(18,2) not null check (amount > 0),
  occurred_on date not null,
  settled_on date,
  status text not null default 'posted' check (status in ('planned','posted','cancelled')),
  source text not null default 'manual' check (source in ('manual','recurring','import')),
  external_id text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id,id),
  unique (user_id,external_id),
  foreign key (user_id,account_id) references public.accounts(user_id,id) on delete restrict,
  foreign key (user_id,category_id) references public.categories(user_id,id) on delete restrict
);

create table public.transfers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  from_account_id uuid not null,
  to_account_id uuid not null,
  amount numeric(18,2) not null check (amount > 0),
  transferred_on date not null,
  status text not null default 'posted' check (status in ('planned','posted','cancelled')),
  description text,
  created_at timestamptz not null default now(),
  unique (user_id,id),
  check (from_account_id <> to_account_id),
  foreign key (user_id,from_account_id) references public.accounts(user_id,id) on delete restrict,
  foreign key (user_id,to_account_id) references public.accounts(user_id,id) on delete restrict
);

create table public.credit_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  last_four char(4),
  credit_limit numeric(18,2) not null default 0 check (credit_limit >= 0),
  closing_day smallint not null check (closing_day between 1 and 31),
  due_day smallint not null check (due_day between 1 and 31),
  default_account_id uuid,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (user_id,id),
  foreign key (user_id,default_account_id) references public.accounts(user_id,id) on delete restrict
);

create table public.card_invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  card_id uuid not null,
  reference_month date not null check (extract(day from reference_month) = 1),
  closing_on date not null,
  due_on date not null,
  status text not null default 'open' check (status in ('open','closed','partial','paid','overdue')),
  created_at timestamptz not null default now(),
  unique (user_id,id),
  unique (user_id,card_id,id),
  unique (user_id,card_id,reference_month),
  foreign key (user_id,card_id) references public.credit_cards(user_id,id) on delete restrict
);

create table public.card_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  card_id uuid not null,
  category_id uuid,
  description text not null check (length(trim(description)) > 0),
  total_amount numeric(18,2) not null check (total_amount > 0),
  purchased_on date not null,
  installments_count smallint not null default 1 check (installments_count between 1 and 120),
  status text not null default 'active' check (status in ('active','refunded','cancelled')),
  created_at timestamptz not null default now(),
  unique (user_id,id),
  unique (user_id,card_id,id),
  foreign key (user_id,card_id) references public.credit_cards(user_id,id) on delete restrict,
  foreign key (user_id,category_id) references public.categories(user_id,id) on delete restrict
);

create table public.card_installments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  card_id uuid not null,
  purchase_id uuid not null,
  invoice_id uuid,
  installment_number smallint not null check (installment_number between 1 and 120),
  amount numeric(18,2) not null check (amount > 0),
  due_on date not null,
  status text not null default 'pending' check (status in ('pending','billed','refunded')),
  created_at timestamptz not null default now(),
  unique (user_id,id),
  unique (user_id,purchase_id,installment_number),
  foreign key (user_id,card_id,purchase_id) references public.card_purchases(user_id,card_id,id) on delete restrict,
  foreign key (user_id,card_id,invoice_id) references public.card_invoices(user_id,card_id,id) on delete restrict
);

create table public.card_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  invoice_id uuid not null,
  account_id uuid not null,
  amount numeric(18,2) not null check (amount > 0),
  paid_on date not null,
  notes text,
  created_at timestamptz not null default now(),
  unique (user_id,id),
  foreign key (user_id,invoice_id) references public.card_invoices(user_id,id) on delete restrict,
  foreign key (user_id,account_id) references public.accounts(user_id,id) on delete restrict
);

create table public.investments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  ticker text,
  asset_class text not null check (asset_class in ('fixed_income','stock','etf','reit','fund','crypto','other')),
  currency char(3) not null default 'BRL',
  current_price numeric(20,8) check (current_price >= 0),
  price_updated_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id,id)
);

create table public.investment_movements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  investment_id uuid not null,
  account_id uuid,
  kind text not null check (kind in ('buy','sell','dividend','interest','fee','adjustment')),
  quantity numeric(20,8) not null default 0 check (quantity >= 0),
  unit_price numeric(20,8) check (unit_price >= 0),
  amount numeric(18,2) not null check (amount >= 0),
  occurred_on date not null,
  notes text,
  created_at timestamptz not null default now(),
  unique (user_id,id),
  foreign key (user_id,investment_id) references public.investments(user_id,id) on delete restrict,
  foreign key (user_id,account_id) references public.accounts(user_id,id) on delete restrict
);

create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  category_id uuid not null,
  reference_month date not null check (extract(day from reference_month) = 1),
  budget_amount numeric(18,2) not null check (budget_amount > 0),
  created_at timestamptz not null default now(),
  unique (user_id,id),
  unique (user_id,category_id,reference_month),
  foreign key (user_id,category_id) references public.categories(user_id,id) on delete restrict
);

create table public.financial_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  target_amount numeric(18,2) not null check (target_amount > 0),
  initial_amount numeric(18,2) not null default 0 check (initial_amount >= 0),
  target_on date,
  status text not null default 'active' check (status in ('active','reached','paused','cancelled')),
  created_at timestamptz not null default now(),
  unique (user_id,id)
);

create table public.goal_contributions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  goal_id uuid not null,
  account_id uuid,
  kind text not null check (kind in ('deposit','withdrawal')),
  amount numeric(18,2) not null check (amount > 0),
  occurred_on date not null,
  notes text,
  created_at timestamptz not null default now(),
  unique (user_id,id),
  foreign key (user_id,goal_id) references public.financial_goals(user_id,id) on delete restrict,
  foreign key (user_id,account_id) references public.accounts(user_id,id) on delete restrict
);

create table public.recurring_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  account_id uuid not null,
  category_id uuid,
  kind text not null check (kind in ('income','expense')),
  description text not null check (length(trim(description)) > 0),
  amount numeric(18,2) not null check (amount > 0),
  frequency text not null check (frequency in ('daily','weekly','monthly','yearly')),
  starts_on date not null,
  ends_on date,
  next_occurrence_on date,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  unique (user_id,id),
  check (ends_on is null or ends_on >= starts_on),
  foreign key (user_id,account_id) references public.accounts(user_id,id) on delete restrict,
  foreign key (user_id,category_id) references public.categories(user_id,id) on delete restrict
);

create table public.recurring_occurrences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  rule_id uuid not null,
  transaction_id uuid,
  scheduled_on date not null,
  status text not null default 'pending' check (status in ('pending','generated','skipped')),
  created_at timestamptz not null default now(),
  unique (user_id,id),
  unique (user_id,rule_id,scheduled_on),
  foreign key (user_id,rule_id) references public.recurring_rules(user_id,id) on delete restrict,
  foreign key (user_id,transaction_id) references public.transactions(user_id,id) on delete restrict
);

create table public.import_batches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  account_id uuid not null,
  filename text not null,
  file_type text not null check (file_type in ('csv','ofx')),
  status text not null default 'pending' check (status in ('pending','completed','failed')),
  imported_count integer not null default 0 check (imported_count >= 0),
  created_at timestamptz not null default now(),
  unique (user_id,id),
  foreign key (user_id,account_id) references public.accounts(user_id,id) on delete restrict
);

create table public.attachments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  transaction_id uuid not null,
  storage_path text not null,
  original_name text not null,
  mime_type text,
  size_bytes bigint check (size_bytes >= 0),
  created_at timestamptz not null default now(),
  unique (user_id,id),
  unique (user_id,storage_path),
  foreign key (user_id,transaction_id) references public.transactions(user_id,id) on delete cascade
);

-- Indexes for owner-filtered queries, period filters and foreign-key joins.
create index accounts_user_id_idx on public.accounts (user_id);
create index categories_user_id_idx on public.categories (user_id);
create index transactions_user_date_idx on public.transactions (user_id,occurred_on desc);
create index transactions_user_account_date_idx on public.transactions (user_id,account_id,occurred_on desc);
create index transactions_user_category_idx on public.transactions (user_id,category_id);
create index transfers_user_date_idx on public.transfers (user_id,transferred_on desc);
create index transfers_from_idx on public.transfers (user_id,from_account_id);
create index transfers_to_idx on public.transfers (user_id,to_account_id);
create index credit_cards_user_idx on public.credit_cards (user_id);
create index credit_cards_default_account_idx on public.credit_cards (user_id,default_account_id);
create index card_invoices_user_due_idx on public.card_invoices (user_id,due_on);
create index card_purchases_user_date_idx on public.card_purchases (user_id,purchased_on desc);
create index card_purchases_category_idx on public.card_purchases (user_id,category_id);
create index card_installments_invoice_idx on public.card_installments (user_id,invoice_id);
create index card_installments_due_idx on public.card_installments (user_id,due_on);
create index card_payments_invoice_idx on public.card_payments (user_id,invoice_id);
create index card_payments_account_idx on public.card_payments (user_id,account_id);
create index investments_user_idx on public.investments (user_id);
create index investment_movements_asset_date_idx on public.investment_movements (user_id,investment_id,occurred_on desc);
create index investment_movements_account_idx on public.investment_movements (user_id,account_id);
create index budgets_user_month_idx on public.budgets (user_id,reference_month desc);
create index financial_goals_user_idx on public.financial_goals (user_id);
create index goal_contributions_goal_idx on public.goal_contributions (user_id,goal_id);
create index goal_contributions_account_idx on public.goal_contributions (user_id,account_id);
create index recurring_rules_active_idx on public.recurring_rules (user_id,next_occurrence_on) where enabled = true;
create index recurring_rules_account_idx on public.recurring_rules (user_id,account_id);
create index recurring_rules_category_idx on public.recurring_rules (user_id,category_id);
create index recurring_occurrences_tx_idx on public.recurring_occurrences (user_id,transaction_id);
create index import_batches_account_idx on public.import_batches (user_id,account_id);
create index attachments_transaction_idx on public.attachments (user_id,transaction_id);

-- The API may expose the public schema; deny anonymous access and isolate
-- authenticated rows by auth.uid() for every table.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles','accounts','categories','transactions','transfers',
    'credit_cards','card_invoices','card_purchases','card_installments','card_payments',
    'investments','investment_movements','budgets','financial_goals','goal_contributions',
    'recurring_rules','recurring_occurrences','import_batches','attachments'
  ] loop
    execute format('alter table public.%I enable row level security',table_name);
    execute format('revoke all on public.%I from anon',table_name);
    execute format('grant select,insert,update,delete on public.%I to authenticated',table_name);
    execute format(
      'create policy %I on public.%I for select to authenticated using (user_id = (select auth.uid()))',
      table_name || '_select_self',table_name
    );
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (user_id = (select auth.uid()))',
      table_name || '_insert_self',table_name
    );
    execute format(
      'create policy %I on public.%I for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))',
      table_name || '_update_self',table_name
    );
    execute format(
      'create policy %I on public.%I for delete to authenticated using (user_id = (select auth.uid()))',
      table_name || '_delete_self',table_name
    );
  end loop;
end
$$;
