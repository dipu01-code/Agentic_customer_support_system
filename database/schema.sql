create table if not exists tickets (
  id text primary key,
  customer_name text not null,
  email text not null,
  subject text not null,
  message text not null,
  channel text not null default 'web',
  category text not null,
  urgency text not null,
  sentiment text not null,
  status text not null,
  assigned_to text,
  source text not null default 'portal',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tickets_status_idx on tickets(status);
create index if not exists tickets_created_at_idx on tickets(created_at desc);
