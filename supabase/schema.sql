-- 새 Supabase 프로젝트의 SQL Editor에 한 번 붙여 넣고 실행한다.
-- 모든 표는 RLS를 켜고 정책을 두지 않는다: 브라우저(publishable key)로는 읽고 쓸 수 없고,
-- 서버가 secret key로만 접근하며 사용자는 로그인 쿠키로 확인한다.

-- 영상별 카드뉴스. 같은 영상은 한 번만 만들고 모든 사용자가 같이 본다.
create table if not exists decks (
  video_id text primary key,
  title text not null default '',
  author text not null default '',
  thumbnail_url text,
  status text not null default 'processing' check (status in ('processing', 'ready', 'failed')),
  content jsonb,
  model text,
  error text,
  created_by uuid references auth.users (id) on delete set null,
  started_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 내가 연 핵심 카드 (본 영상 표시)
create table if not exists user_decks (
  user_id uuid not null references auth.users (id) on delete cascade,
  video_id text not null references decks (video_id) on delete cascade,
  last_opened_at timestamptz not null default now(),
  -- 사용자가 누른 별 개수 (0~3)
  stars smallint not null default 0 check (stars between 0 and 3),
  primary key (user_id, video_id)
);

-- Gemini 호출 기록. 구글은 실패와 재시도도 하루 한도에 세므로 시도마다 남긴다.
create table if not exists gemini_log (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  user_id uuid references auth.users (id) on delete set null,
  video_id text,
  model text not null,
  status text not null check (status in ('ok', 'error', 'rate_limited')),
  message text,
  input_tokens int,
  output_tokens int
);
create index if not exists gemini_log_created on gemini_log (created_at);

-- 관리자 페이지에서 고른 Gemini 모델 같은 앱 설정
create table if not exists app_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

alter table decks enable row level security;
alter table user_decks enable row level security;
alter table gemini_log enable row level security;
alter table app_settings enable row level security;

-- 복습 기능을 뺐다. 예전 버전으로 reviews 표를 만들었다면 지워도 된다:
-- drop table if exists reviews;
