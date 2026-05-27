-- 기존 period_records 테이블에 태그 컬럼 추가 (SQL Editor에서 실행)

alter table period_records
  add column if not exists is_brown boolean not null default false,
  add column if not exists is_start boolean not null default false,
  add column if not exists is_end   boolean not null default false;
