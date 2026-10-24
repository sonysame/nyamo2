-- 핵심 카드마다 사용자가 누른 별 개수 (0~3). Supabase SQL Editor에서 한 번 실행한다.
alter table user_decks add column if not exists stars smallint not null default 0 check (stars between 0 and 3);
