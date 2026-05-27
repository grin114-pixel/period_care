-- Supabase에서 아래 SQL을 실행하세요 (SQL Editor)

create table if not exists period_records (
  id            bigserial primary key,
  record_date   date        not null unique,
  flow_level    smallint    not null check (flow_level between 1 and 5),
  is_brown      boolean     not null default false,
  is_start      boolean     not null default false,
  is_end        boolean     not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- 날짜 인덱스
create index if not exists idx_period_records_date on period_records (record_date);

-- updated_at 자동 갱신 트리거
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_period_records_updated_at
  before update on period_records
  for each row execute function update_updated_at();

-- RLS (Row Level Security) - 필요 시 활성화
-- alter table period_records enable row level security;
-- create policy "allow all" on period_records for all using (true);
