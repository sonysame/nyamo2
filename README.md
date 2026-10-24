# RepeatUp (cardnews-app)

라이브 아카데미(@LVACDMY) 유튜브 영상 주소를 넣으면, 영상에서 가르치는 영어 문장과 핵심 표현을 **핵심 카드**로 모아 보게 해 주는 웹앱이에요. 기획 문서는 [docs/PRD.md](docs/PRD.md)에 있어요.

- Next.js 16 (App Router) + Tailwind 4
- Supabase: 구글 로그인, DB (무료 등급)
- Gemini: YouTube URL을 그대로 넘겨 영상을 이해한다(다운로드 없음). 기본 모델 `gemini-3.5-flash-lite`
- YouTube Data API: 홈의 채널 전체 영상 목록(오래된 순), 그리고 시청자들이 영상 문장을 정리해 둔 댓글을 철자 확인용 참고 자료로 쓴다(댓글은 저장하지 않음)
- 운영비 0원: Vercel Hobby + Supabase Free + Gemini 무료 등급

## 동작 방식

1. 영상 ID를 꺼내고, YouTube oEmbed(키 불필요)로 **@LVACDMY 채널의 공개 영상인지** 확인해요.
2. 이미 만들어진 카드뉴스가 있으면 Gemini를 부르지 않고 바로 열어요. 같은 영상은 모든 사용자가 같이 써요.
3. 없으면 Gemini를 **한 번** 불러 요약, 핵심 포인트, 문장 카드(뜻, 핵심 표현, 해설, 새 예문, 타임스탬프)를 JSON으로 받아요. 10분 영상 기준 15~40초, 영상 토큰 약 5만 개(저해상도 모드)예요.
   - 카드의 영어 문장은 **영상에서 가르친 것만** 넣어요. 댓글은 그 문장의 철자를 확인하는 데만 쓰고, 댓글에만 있는 문장(구독자가 만든 연습 문장)은 넣지 않도록 프롬프트로 막아요.
   - 503(붐빔)은 3초, 10초 쉬고 두 번까지 다시 시도해요. 호출 하나당 240초 제한이 있고, 함수 최대 시간은 300초예요.
   - 시도마다(실패와 재시도 포함) `gemini_log`에 남겨서 하루 한도를 셉니다. 앱 전체 기본 400회예요(사람별 제한은 없어요).
4. 핵심 카드(영어 문장과 한국어 뜻, 핵심 표현은 노란색)를 열면 내 목록에 들어가고 "본 영상"으로 표시돼요. 한국어/영어 가리기로 떠올려 보며 공부해요.

## 로컬에서 실행하기

### 1. Supabase 새 프로젝트

1. [supabase.com](https://supabase.com)에서 **New project**를 만들어요(무료 등급, 지역은 Northeast Asia (Seoul) 추천).
2. **SQL Editor**에 [supabase/schema.sql](supabase/schema.sql) 내용을 붙여 넣고 실행해요. (이미 예전 schema.sql로 만들었다면 [supabase/migrations](supabase/migrations)의 파일을 번호 순서대로 실행해요: `001_app_settings.sql`(관리자 모델 선택), `002_stars.sql`(별).)
3. **Project Settings → API Keys**에서 다음 값을 복사해요.
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - Publishable key → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - Secret key → `SUPABASE_SECRET_KEY` (서버 전용, 절대 공개하지 마세요)

### 2. 구글 로그인 켜기

1. [Google Cloud Console](https://console.cloud.google.com/apis/credentials)에서 **OAuth 클라이언트 ID**(웹 애플리케이션)를 만들거나, ListenUp에서 쓰던 클라이언트를 같이 써도 돼요.
2. 그 클라이언트의 **승인된 리디렉션 URI**에 새 프로젝트의 콜백 주소를 추가해요.
   `https://<새 프로젝트 ref>.supabase.co/auth/v1/callback`
3. Supabase **Authentication → Sign In / Providers → Google**을 켜고 Client ID와 Client Secret을 넣어요.
4. Supabase **Authentication → URL Configuration**
   - Site URL: `http://localhost:3000` (배포 후에는 배포 주소로 바꿔요)
   - Redirect URLs: `http://localhost:3000/**`, (배포 후) `https://<배포 주소>/**`

### 3. YouTube API 키 (채널 전체 목록, 댓글 참고)

1. Google Cloud Console → **API 및 서비스 → 라이브러리**에서 **YouTube Data API v3**를 사용 설정해요.
2. **사용자 인증 정보 → API 키 만들기**를 하고, 키 제한에서 YouTube Data API v3만 허용해요.
3. 무료 할당량은 하루 10,000유닛이에요. 채널 전체 목록을 한 번 불러올 때 약 30유닛(6시간 캐시), 영상 하나 정리할 때 댓글로 1유닛을 써요. 키가 없으면 홈 목록이 보이지 않고, 댓글 없이 정리해요.

### 4. 환경 변수와 실행

```bash
cp .env.example .env.local
```

`.env.local`에 Gemini 키([aistudio.google.com/apikey](https://aistudio.google.com/apikey)), Supabase 값, YouTube 키를 채워요.

```bash
npm install
```

```bash
npm run dev
```

http://localhost:3000 을 열고 구글로 로그인한 뒤, 영상 주소를 넣거나 채널 전체 영상 목록(오래된 순)에서 **정리하기**를 눌러요.

DB 없이 프롬프트만 시험하려면 다음처럼 해요(Gemini 1회 사용).

```bash
node --conditions=react-server --env-file=.env.local scripts/try-video.mjs https://www.youtube.com/watch?v=-JeHIasMRsI
```

## Vercel에 배포하기

지금 배포 주소: **https://nyamo2.vercel.app** (Vercel 프로젝트 `nyamo2`, GitHub `sonysame/nyamo2`). CLI로 다시 배포하려면 이 폴더에서 `vercel deploy --prod`를 실행해요. `vercel.json`에 `"framework": "nextjs"`를 적어 둬서 CLI로 만든 프로젝트에서도 Next.js로 빌드돼요.

1. 이 폴더를 GitHub 저장소로 올려요(`.env.local`은 `.gitignore`에 들어 있어 올라가지 않아요).
2. [vercel.com](https://vercel.com) → **Add New → Project**에서 저장소를 가져와요. Framework는 Next.js로 자동 인식돼요.
3. **Environment Variables**에 `.env.example`의 값을 모두 넣어요(`GEMINI_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `YOUTUBE_API_KEY`, `GEMINI_MODEL`, `DAILY_GENERATE_LIMIT`).
4. **Deploy**를 눌러요. 카드뉴스 생성 API는 `maxDuration = 300`(Hobby 최대)으로 설정돼 있어요.
5. 배포 주소가 나오면 Supabase **URL Configuration**의 Site URL과 Redirect URLs에 그 주소를 추가해요.

## 관리자 페이지

`/admin` 에서 사용자, 만들어진 핵심 카드, 오늘 Gemini 요청 수와 오류를 보고, 카드를 만들 Gemini 모델을 고를 수 있어요. `.env.local`과 Vercel의 `ADMIN_EMAILS`에 적은 이메일(쉼표로 여러 개)로 로그인해야 보여요. 계정 메뉴에 "관리자 페이지" 링크가 생겨요.

## 무료 한도 메모

| 항목 | 한도 | 이 앱에서 |
|---|---|---|
| Gemini 무료 등급 | 모델마다 하루 한도가 달라요. 실제 값은 [AI Studio Rate limit](https://aistudio.google.com/rate-limit)에서 확인하세요. 실패와 재시도도 세져요. | 새 영상 1개 = 1회(붐비면 최대 3회). 같은 영상은 다시 부르지 않아요. 한도는 태평양 시간 자정(한국 시간 오후 4~5시)에 다시 채워져요. |
| Gemini YouTube 입력 | 무료 등급은 하루 8시간 분량까지, 공개 영상만 돼요. | 회원 전용과 비공개 영상은 만들 수 없어요. |
| YouTube Data API | 하루 10,000유닛 | 영상 1개에 1유닛 |
| Vercel Hobby | 함수 최대 300초 | Gemini 240초에서 끊고 기록해요. |
| Supabase Free | DB 500MB | 카드뉴스 JSON은 영상당 수 KB예요. |

한국 밤(미국 오전)에는 Gemini가 503 "high demand"를 자주 내요. 앱이 자동으로 다시 시도하지만 계속 실패하면 "잠시 후 다시 시도해 주세요"라고 안내해요.

## 저작권·약관 원칙

- 영상 대본 전문이나 해설을 옮겨 저장하지 않아요. 저장하는 것은 영상이 가르치는 짧은 학습 문장과, AI가 자기 말로 쓴 짧은 요약·해설, AI가 새로 만든 예문뿐이에요.
- 영상은 YouTube 공식 임베드 플레이어로만 재생하고, 모든 카드뉴스에 원본 영상과 채널 링크를 표시해요.
- 댓글은 철자 확인용으로만 Gemini에 넘기고 저장하거나 화면에 보여 주지 않아요.
- 개인 학습용으로 운영해요. 공개 서비스로 키우려면 채널에 먼저 허락을 받으세요.

## 폴더 구조

```
src/
  app/
    page.tsx               홈 (비로그인: 소개 / 로그인: 주소 입력·이어서 볼 영상·채널 전체 목록)
    v/[videoId]/page.tsx   핵심 카드 (영어 + 한국어, 가리기)
    cards/page.tsx         핵심 카드 모아 보기 (오래된 영상부터)
    api/decks/             카드뉴스 만들기·상태 확인
    auth/callback/         구글 로그인 콜백
  components/              화면 조각 (card-news, card-grid, create-panel 등)
  lib/
    gemini.ts              Gemini 호출, 프롬프트, 재시도, 오류 구분
    youtube.ts             영상 ID 해석, oEmbed 채널 확인, 채널 전체 목록, 댓글
    data.ts                DB 읽기·쓰기
    usage.ts               하루 한도 세기
  proxy.ts                 로그인 세션 갱신, 로그인 필요한 화면 보호
supabase/schema.sql        DB 표
```
