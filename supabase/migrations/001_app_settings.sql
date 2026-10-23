-- 관리자 페이지에서 고른 Gemini 모델 같은 앱 설정. Supabase SQL Editor에서 한 번 실행한다.
create table if not exists app_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);
alter table app_settings enable row level security;
