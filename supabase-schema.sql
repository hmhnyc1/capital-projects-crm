-- Capital Projects CRM Schema

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Contacts table
create table if not exists contacts (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  first_name text not null,
  last_name text not null,
  email text,
  phone text,
  company text,
  title text,
  type text not null default 'lead' check (type in ('lead', 'contact')),
  status text not null default 'active' check (status in ('active', 'inactive', 'qualified', 'unqualified')),
  source text,
  address text,
  city text,
  state text,
  zip text,
  notes text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Deals table
create table if not exists deals (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  contact_id uuid references contacts(id) on delete set null,
  value numeric(15,2),
  stage text not null default 'Prospecting' check (stage in ('Prospecting', 'Qualified', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost')),
  probability integer check (probability >= 0 and probability <= 100),
  expected_close_date date,
  description text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Activities table
create table if not exists activities (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  contact_id uuid references contacts(id) on delete set null,
  deal_id uuid references deals(id) on delete set null,
  type text not null default 'note' check (type in ('note', 'call', 'email', 'meeting', 'task')),
  title text not null,
  content text,
  due_date timestamptz,
  completed boolean default false not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Updated_at trigger function
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Triggers for updated_at
create trigger update_contacts_updated_at
  before update on contacts
  for each row execute function update_updated_at_column();

create trigger update_deals_updated_at
  before update on deals
  for each row execute function update_updated_at_column();

create trigger update_activities_updated_at
  before update on activities
  for each row execute function update_updated_at_column();

-- Enable Row Level Security
alter table contacts enable row level security;
alter table deals enable row level security;
alter table activities enable row level security;

-- RLS Policies for contacts
create policy "Users can view their own contacts"
  on contacts for select
  using (auth.uid() = user_id);

create policy "Users can insert their own contacts"
  on contacts for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own contacts"
  on contacts for update
  using (auth.uid() = user_id);

create policy "Users can delete their own contacts"
  on contacts for delete
  using (auth.uid() = user_id);

-- RLS Policies for deals
create policy "Users can view their own deals"
  on deals for select
  using (auth.uid() = user_id);

create policy "Users can insert their own deals"
  on deals for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own deals"
  on deals for update
  using (auth.uid() = user_id);

create policy "Users can delete their own deals"
  on deals for delete
  using (auth.uid() = user_id);

-- RLS Policies for activities
create policy "Users can view their own activities"
  on activities for select
  using (auth.uid() = user_id);

create policy "Users can insert their own activities"
  on activities for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own activities"
  on activities for update
  using (auth.uid() = user_id);

create policy "Users can delete their own activities"
  on activities for delete
  using (auth.uid() = user_id);

-- Indexes for performance
create index if not exists contacts_user_id_idx on contacts(user_id);
create index if not exists contacts_type_idx on contacts(type);
create index if not exists contacts_status_idx on contacts(status);
create index if not exists deals_user_id_idx on deals(user_id);
create index if not exists deals_stage_idx on deals(stage);
create index if not exists deals_contact_id_idx on deals(contact_id);
create index if not exists activities_user_id_idx on activities(user_id);
create index if not exists activities_contact_id_idx on activities(contact_id);
create index if not exists activities_deal_id_idx on activities(deal_id);
