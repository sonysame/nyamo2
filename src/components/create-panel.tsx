"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import type { ChannelVideo } from "@/lib/youtube";
import { useCreateDeck, type CreateState } from "./use-create-deck";
import { VideoModal } from "./media";
import { CardModal, type GridDeck } from "./card-grid";
import { koreanDate } from "@/lib/day";
import type { DeckContent } from "@/lib/types";

const PER_PAGE = 20;

const thumb = (id: string) => `https://i.ytimg.com/vi/${id}/mqdefault.jpg`;

/**
 * 홈의 URL 입력창과 채널 전체 영상 목록(오래된 순). 둘 다 같은 '만들기' 상태를 쓴다 (한 번에 하나만 만든다).
 * 목록은 20개씩 페이지로 나누고, 처음에는 '이어서 볼 영상'이 있는 페이지를 연다.
 */
export function CreatePanel({
  videos,
  ready,
  mine,
}: {
  /** 채널 전체 영상, 오래된 순. YouTube API 키가 없으면 null */
  videos: ChannelVideo[] | null;
  /** 핵심 카드가 이미 만들어진 영상 */
  ready: string[];
  /** 내가 본 영상 → 핵심 카드를 만든 날짜 */
  mine: Record<string, string>;
}) {
  const { state, create } = useCreateDeck();
  const [url, setUrl] = useState("");
  const busy = state.phase === "working";

  return (
    <div className="space-y-10">
      <section className="rounded-3xl bg-ink p-6 text-white shadow-card sm:p-8">
        <h2 className="text-xl font-black sm:text-2xl">
          영상 주소를 넣으면 <span className="text-mark">핵심 카드</span>가 나와요
        </h2>
        <p className="mt-1 text-sm text-white/70">라이브 아카데미(@LVACDMY) 채널의 공개 영상만 돼요.</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (url.trim() && !busy) create(url.trim());
          }}
          className="mt-5 flex flex-col gap-2 sm:flex-row"
        >
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            className="min-w-0 flex-1 rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-[15px] text-white placeholder:text-white/40 focus:border-mark focus:outline-none"
            aria-label="유튜브 영상 주소"
          />
          <button
            disabled={busy || !url.trim()}
            className="rounded-xl bg-mark px-5 py-3 font-bold text-ink hover:brightness-95 disabled:opacity-50"
          >
            정리하기
          </button>
        </form>
        <Progress state={state} />
      </section>

      {videos ? (
        <ChannelList videos={videos} ready={ready} mine={mine} busy={busy} onCreate={create} />
      ) : (
        <p className="rounded-2xl border border-dashed border-line p-6 text-center text-sm text-muted">
          채널 전체 영상 목록을 보려면 <code>.env.local</code>에 <code>YOUTUBE_API_KEY</code>를 넣어 주세요.
        </p>
      )}
    </div>
  );
}

function ChannelList({
  videos,
  ready,
  mine,
  busy,
  onCreate,
}: {
  videos: ChannelVideo[];
  ready: string[];
  mine: Record<string, string>;
  busy: boolean;
  onCreate: (id: string) => void;
}) {
  const readySet = useMemo(() => new Set(ready), [ready]);
  const mineSet = useMemo(() => new Set(Object.keys(mine)), [mine]);
  // 이어서 볼 영상: 내가 연 영상 중 가장 나중 것의 바로 다음 (하나도 없으면 첫 영상)
  const nextIndex = useMemo(() => {
    let last = -1;
    videos.forEach((v, i) => {
      if (mineSet.has(v.id)) last = i;
    });
    return Math.min(last + 1, videos.length - 1);
  }, [videos, mineSet]);

  const [query, setQuery] = useState("");
  // 내가 연 영상(본 영상)과 아직 안 연 영상(남은 영상)으로 거른다
  const [filter, setFilter] = useState<"all" | "done" | "todo">("all");
  const [page, setPage] = useState(Math.floor(Math.max(0, nextIndex) / PER_PAGE));

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return videos
      .map((v, i) => ({ ...v, n: i + 1 }))
      .filter((v) => (filter === "all" ? true : filter === "done" ? mineSet.has(v.id) : !mineSet.has(v.id)))
      .filter((v) => !q || v.title.toLowerCase().includes(q));
  }, [videos, query, filter, mineSet]);
  const doneCount = videos.filter((v) => mineSet.has(v.id)).length;
  const pages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const current = Math.min(page, pages - 1);
  const shown = filtered.slice(current * PER_PAGE, (current + 1) * PER_PAGE);
  const next = videos[nextIndex];
  const [playing, setPlaying] = useState<string | null>(null);
  // '보기'를 누르면 페이지를 옮기지 않고 그 자리에서 핵심 카드를 크게 띄운다
  const [viewing, setViewing] = useState<GridDeck | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const view = async (id: string) => {
    setLoadingId(id);
    const res = await fetch(`/api/decks/${id}`, { cache: "no-store" }).catch(() => null);
    const data = (await res?.json().catch(() => ({}))) as
      | { deck?: { video_id: string; title: string; content: DeckContent; created_at: string; stars: number } }
      | undefined;
    setLoadingId(null);
    if (!data?.deck) return;
    const n = videos.findIndex((v) => v.id === id) + 1;
    setViewing({ ...data.deck, n: n || undefined, date: mine[id] ?? koreanDate(data.deck.created_at) });
  };

  const play = (id: string) => (
    <button
      onClick={() => setPlaying(id)}
      className="rounded-full border border-line bg-surface px-3 py-1 text-xs font-bold text-foreground hover:border-accent hover:text-accent"
      aria-label="영상 보기"
    >
      ▶ 영상
    </button>
  );

  const action = (id: string) => (
    <span className="flex shrink-0 items-center gap-1.5">
      {play(id)}
      {readySet.has(id) ? (
      <button
        onClick={() => view(id)}
        disabled={loadingId === id}
        className="rounded-full bg-success-soft px-3 py-1 text-xs font-bold text-success disabled:opacity-50"
      >
        {loadingId === id ? "여는 중…" : "보기"}
      </button>
    ) : (
      <button
        disabled={busy}
        onClick={() => {
          window.scrollTo({ top: 0, behavior: "smooth" });
          onCreate(id);
        }}
        className="rounded-full bg-accent-soft px-3 py-1 text-xs font-bold text-accent disabled:opacity-50"
      >
        정리하기
      </button>
      )}
    </span>
  );

  return (
    <section className="space-y-4">
      {next && (
        <div className="flex items-center gap-4 rounded-2xl border-2 border-mark bg-mark-soft p-3">
          <button onClick={() => setPlaying(next.id)} className="shrink-0" aria-label="이어서 볼 영상 재생">
            <Image src={thumb(next.id)} alt="" width={160} height={90} className="h-[90px] w-[160px] rounded-lg object-cover" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-accent">
              이어서 볼 영상 · {nextIndex + 1}번째 / {videos.length}
            </p>
            <p className="mt-0.5 line-clamp-2 font-bold leading-snug">{next.title}</p>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs text-muted">{next.published.slice(0, 10)}</span>
              {action(next.id)}
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-end justify-between gap-2">
        <h2 className="text-lg font-black">
          채널 전체 영상 <span className="text-sm font-semibold text-muted">오래된 순 · {videos.length}개</span>
        </h2>
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(0);
          }}
          placeholder="제목으로 찾기"
          className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm focus:border-accent focus:outline-none sm:w-60"
          aria-label="영상 제목으로 찾기"
        />
      </div>

      <div className="flex gap-1.5" role="group" aria-label="보기 거르기">
        {(
          [
            ["all", `전체 ${videos.length}`],
            ["done", `본 영상 ${doneCount}`],
            ["todo", `남은 영상 ${videos.length - doneCount}`],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => {
              setFilter(key);
              setPage(0);
            }}
            aria-pressed={filter === key}
            className={`rounded-full px-3 py-1.5 text-sm font-bold ${
              filter === key ? "bg-ink text-white" : "border border-line bg-surface text-muted hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
        {shown.map((v) => (
          <li key={v.id} className={`flex items-center gap-3 px-3 py-2.5 ${v.n - 1 === nextIndex ? "bg-mark-soft" : ""}`}>
            <span className="w-10 shrink-0 text-right text-xs font-bold text-muted tabular-nums">{v.n}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{v.title}</p>
              <p className="text-xs text-muted">
                {v.published.slice(0, 10)}
                {mine[v.id] && <span className="ml-2 font-bold text-success">✓ 봤어요 · {mine[v.id]}</span>}
              </p>
            </div>
            {action(v.id)}
          </li>
        ))}
        {shown.length === 0 && <li className="p-6 text-center text-sm text-muted">찾는 영상이 없어요.</li>}
      </ul>

      <div className="flex items-center justify-center gap-2 text-sm">
        <button
          onClick={() => setPage(Math.max(0, current - 1))}
          disabled={current === 0}
          className="rounded-lg border border-line px-3 py-1.5 font-semibold disabled:opacity-40"
        >
          ‹ 이전
        </button>
        <label className="flex items-center gap-1.5 text-muted">
          <select
            value={current}
            onChange={(e) => setPage(Number(e.target.value))}
            className="rounded-lg border border-line bg-surface px-2 py-1.5 font-semibold text-foreground"
            aria-label="페이지"
          >
            {Array.from({ length: pages }, (_, i) => (
              <option key={i} value={i}>
                {i + 1}
              </option>
            ))}
          </select>
          / {pages}쪽
        </label>
        <button
          onClick={() => setPage(Math.min(pages - 1, current + 1))}
          disabled={current >= pages - 1}
          className="rounded-lg border border-line px-3 py-1.5 font-semibold disabled:opacity-40"
        >
          다음 ›
        </button>
      </div>
      {playing && <VideoModal videoId={playing} onClose={() => setPlaying(null)} />}
      {viewing && <CardModal deck={viewing} onClose={() => setViewing(null)} />}
    </section>
  );
}

function Progress({ state }: { state: CreateState }) {
  if (state.phase === "error") {
    return <p className="mt-4 rounded-xl bg-danger-soft px-4 py-3 text-sm font-semibold text-danger">{state.message}</p>;
  }
  if (state.phase !== "working") return null;
  const message = state.waiting
    ? "다른 분이 이 영상을 정리하는 중이에요. 끝나면 바로 열어 드릴게요."
    : state.seconds < 5
      ? "영상을 확인하고 있어요…"
      : "Gemini가 영상을 보면서 문장을 정리하고 있어요… (10분 영상 기준 15~40초)";
  return (
    <p className="mt-4 flex items-center gap-2 text-sm text-white/80" role="status">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-mark border-t-transparent" />
      {message} <span className="tabular-nums text-white/50">{state.seconds}초</span>
    </p>
  );
}
