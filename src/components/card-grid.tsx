"use client";

import { useEffect, useState } from "react";
import { WrapUpCard, type ReadyDeck } from "./card-news";

export type GridDeck = ReadyDeck & { n?: number };

/** 핵심 카드를 제목만 있는 작은 카드로 늘어놓고, 누르면 그 카드만 크게 펼쳐 보여 준다 */
export function CardGrid({ decks }: { decks: GridDeck[] }) {
  const [open, setOpen] = useState<GridDeck | null>(null);

  useEffect(() => {
    if (!open) return;
    // 카드 안에서 영상 창을 띄웠으면 Esc는 영상 창만 닫는다
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !document.querySelector('[role="dialog"][aria-label="원본 영상"]')) setOpen(null);
    };
    window.addEventListener("keydown", onKey);
    // 펼친 동안 뒤쪽 페이지가 같이 스크롤되지 않게 한다
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [open]);

  return (
    <>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {decks.map((d) => (
          <li key={d.video_id}>
            <button
              onClick={() => setOpen(d)}
              className="flex aspect-[4/3] w-full flex-col rounded-2xl bg-ink p-4 text-left text-white shadow-card transition hover:-translate-y-0.5 hover:ring-2 hover:ring-mark"
            >
              <span className="text-[11px] font-bold tracking-widest text-mark">{d.n ? `#${d.n}` : "WRAP UP"}</span>
              <span className="mt-1.5 line-clamp-4 text-sm font-bold leading-snug">{d.title}</span>
              <span className="mt-auto text-xs text-white/50">문장 {d.content.sentences.length}개</span>
            </button>
          </li>
        ))}
      </ul>

      {open && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-black/60 p-4 sm:p-8"
          onClick={() => setOpen(null)}
          role="dialog"
          aria-modal
          aria-label={open.title}
        >
          <div className="mx-auto max-w-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-2 flex justify-end">
              <button onClick={() => setOpen(null)} className="rounded-full bg-white/90 px-3 py-1 text-sm font-bold text-ink">
                닫기 ✕
              </button>
            </div>
            <WrapUpCard deck={open} n={open.n} linkTitle />
          </div>
        </div>
      )}
    </>
  );
}
