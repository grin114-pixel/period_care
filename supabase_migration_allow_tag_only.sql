-- 태그만(갈색혈/시작/끝) 저장을 위해 flow_level을 NULL 허용으로 변경
-- Supabase SQL Editor에서 실행하세요.

-- 1) flow_level NOT NULL 제거
alter table period_records
  alter column flow_level drop not null;

-- 2) 기존 체크 제약조건 제거 후, NULL 허용 체크로 교체
alter table period_records
  drop constraint if exists period_records_flow_level_check;

alter table period_records
  add constraint period_records_flow_level_check
  check (flow_level is null or (flow_level between 1 and 5));

