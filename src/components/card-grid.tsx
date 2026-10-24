"use client";

import { useEffect, useMemo, useState } from "react";
import { WrapUpCard, type ReadyDeck } from "./card-news";

export type GridDeck = ReadyDeck & { n?: number };

/**
 * 핵심 카드를 제목만 있는 작은 카드로 늘어놓고, 누르면 그 카드만 크게 펼쳐 보여 준다.
 * sortable이면 영상 순(받은 순서)과 별 많은 순으로 정렬할 수 있다.
 */
export function CardGrid({ decks, sortable = false }: { decks: GridDeck[]; sortable?: boolean }) {
  const [openId, setOpenId] = useState<string | null>(null);
  // 펼친 카드에서 별을 바꾸면 작은 카드의 별과 정렬에도 바로 반영한다
  const [stars, setStars] = useState<Record<string, number>>(() =>
    Object.fromEntries(decks.map((d) => [d.video_id, d.stars ?? 0])),
  );
  const [sort, setSort] = useState<"video" | "stars">("video");

  const shown = useMemo(() => {
    if (sort === "video") return decks;
    // 별이 같으면 원래(영상) 순서를 지킨다
    return decks
      .map((d, i) => ({ d, i }))
      .sort((a, b) => (stars[b.d.video_id] ?? 0) - (stars[a.d.video_id] ?? 0) || a.i - b.i)
      .map(({ d }) => d);
  }, [decks, sort, stars]);
  const open = decks.find((d) => d.video_id === openId);

  return (
    <>
      {sortable && (
        <div className="mb-3 flex gap-1.5" role="group" aria-label="정렬">
          {(
            [
              ["video", "영상 순"],
              ["stars", "★ 별 많은 순"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setSort(key)}
              aria-pressed={sort === key}
              className={`rounded-full px-3 py-1.5 text-sm font-bold ${
                sort === key ? "bg-ink text-white" : "border border-line bg-surface text-muted hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {shown.map((d) => (
          <li key={d.video_id}>
            <button
              onClick={() => setOpenId(d.video_id)}
              className="flex aspect-[4/3] w-full flex-col rounded-2xl bg-ink p-4 text-left text-white shadow-card transition hover:-translate-y-0.5 hover:ring-2 hover:ring-mark"
            >
              <span className="flex items-start justify-between gap-2">
                <span className="text-[11px] font-bold tracking-widest text-mark">{d.n ? `#${d.n}` : "WRAP UP"}</span>
                {d.date && <span className="text-[11px] text-white/50 tabular-nums">{d.date}</span>}
              </span>
              <span className="mt-1.5 line-clamp-4 text-sm font-bold leading-snug">{d.title}</span>
              <span className="mt-auto flex items-center justify-between text-xs text-white/50">
                문장 {d.content.sentences.length}개
                <Stars count={stars[d.video_id] ?? 0} />
              </span>
            </button>
          </li>
        ))}
      </ul>

      {open && (
        <CardModal
          deck={{ ...open, stars: stars[open.video_id] ?? 0 }}
          onClose={() => setOpenId(null)}
          onStarsChange={(s) => setStars((m) => ({ ...m, [open.video_id]: s }))}
        />
      )}
    </>
  );
}

/** 작은 카드에 보여 주는 별 (누를 수는 없다) */
function Stars({ count }: { count: number }) {
  if (!count) return null;
  return (
    <span className="text-mark" aria-label={`별 ${count}개`}>
      {"★".repeat(count)}
    </span>
  );
}

/** 핵심 카드 한 장을 화면 위에 크게 띄운다. 닫기 버튼, Esc, 바깥쪽 클릭으로 닫는다. */
export function CardModal({
  deck,
  onClose,
  onStarsChange,
}: {
  deck: GridDeck;
  onClose: () => void;
  onStarsChange?: (stars: number) => void;
}) {
  useEffect(() => {
    // 카드 안에서 영상 창을 띄웠으면 Esc는 영상 창만 닫는다
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !document.querySelector('[role="dialog"][aria-label="원본 영상"]')) onClose();
    };
    window.addEventListener("keydown", onKey);
    // 펼친 동안 뒤쪽 페이지가 같이 스크롤되지 않게 한다
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/60 p-4 sm:p-8"
      onClick={onClose}
      role="dialog"
      aria-modal
      aria-label={deck.title}
    >
      <div className="mx-auto max-w-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-2 flex justify-end">
          <button onClick={onClose} className="rounded-full bg-white/90 px-3 py-1 text-sm font-bold text-ink">
            닫기 ✕
          </button>
        </div>
        <WrapUpCard deck={deck} n={deck.n} linkTitle onStarsChange={onStarsChange} />
      </div>
    </div>
  );
}
