"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import type { Deck, DeckContent } from "@/lib/types";
import { keyExpressions } from "@/lib/expressions";
import { CHANNEL, watchUrl } from "@/lib/youtube";
import { speak, VideoModal } from "./media";

/** date: 핵심 카드를 만든 날짜 (한국 날짜, 카드 오른쪽 위에 표시) */
export type ReadyDeck = Pick<Deck, "video_id" | "title"> & { content: DeckContent; date?: string };

/** 영상 하나의 핵심 카드 화면 */
export function CardNews({ deck }: { deck: ReadyDeck }) {
  return (
    <div className="mx-auto max-w-2xl">
      <WrapUpCard deck={deck} />
    </div>
  );
}

/** 영어 문장 안의 핵심 표현만 형광펜 색으로 칠한다 (겹치면 앞에 나온 표현만, 대소문자 무시) */
function highlight(sentence: string, expressions: { en: string }[]): ReactNode {
  const lower = sentence.toLowerCase();
  const ranges: [number, number][] = [];
  for (const e of expressions) {
    const at = lower.indexOf(e.en.toLowerCase());
    const end = at + e.en.length;
    if (at >= 0 && !ranges.some(([a, b]) => at < b && end > a)) ranges.push([at, end]);
  }
  ranges.sort((a, b) => a[0] - b[0]);
  const parts: ReactNode[] = [];
  let pos = 0;
  ranges.forEach(([a, b], i) => {
    parts.push(sentence.slice(pos, a));
    parts.push(
      <span key={i} className="text-mark">
        {sentence.slice(a, b)}
      </span>,
    );
    pos = b;
  });
  parts.push(sentence.slice(pos));
  return parts;
}

/**
 * 핵심 카드(Wrap up): 영상에서 배운 영어 문장과 한국어 뜻을 한 장에 모아 보여 준다.
 * n은 채널 전체에서 몇 번째 영상인지 (핵심 카드 모아 보기 화면에서 표시).
 */
export function WrapUpCard({ deck, n, linkTitle = false }: { deck: ReadyDeck; n?: number; linkTitle?: boolean }) {
  const { sentences } = deck.content;
  // 가리기: 한쪽 말을 가리고 떠올려 본다. 가린 줄은 눌러서 하나씩 볼 수 있다.
  const [hide, setHide] = useState<"none" | "ko" | "en">("none");
  const [peeked, setPeeked] = useState<Set<string>>(new Set());
  const toggle = (side: "ko" | "en") => {
    setHide((h) => (h === side ? "none" : side));
    setPeeked(new Set());
  };
  const peek = (key: string) => setPeeked((p) => new Set(p).add(key));
  const [playing, setPlaying] = useState(false);
  const line = (key: string, hidden: boolean, className: string, text: ReactNode) =>
    hidden && !peeked.has(key) ? (
      <button
        onClick={() => peek(key)}
        className={`${className} block w-full cursor-pointer select-none text-left blur-[6px]`}
        aria-label="가린 문장 보기"
      >
        {text}
      </button>
    ) : (
      <p className={className}>{text}</p>
    );

  return (
    <article className="rounded-3xl bg-ink p-6 text-white shadow-card sm:p-8">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-bold tracking-widest text-mark">
          {n ? `#${n} · ` : ""}WRAP UP · {sentences.length} SENTENCES
        </p>
        {deck.date && <span className="shrink-0 text-xs font-semibold text-white/50 tabular-nums">{deck.date}</span>}
      </div>
      <h2 className="mt-2 text-xl font-black leading-snug sm:text-2xl">
        {linkTitle ? (
          <Link href={`/v/${deck.video_id}`} className="hover:text-mark">
            {deck.title}
          </Link>
        ) : (
          deck.title
        )}
      </h2>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          onClick={() => setPlaying(true)}
          className="rounded-full bg-accent px-3 py-1.5 text-sm font-bold text-white hover:bg-accent-strong"
        >
          ▶ 영상 보기
        </button>
        {(["ko", "en"] as const).map((side) => (
          <button
            key={side}
            onClick={() => toggle(side)}
            aria-pressed={hide === side}
            className={`rounded-full px-3 py-1.5 text-sm font-bold ${
              hide === side ? "bg-mark text-ink" : "bg-white/10 text-white/80 hover:bg-white/20"
            }`}
          >
            {side === "ko" ? "한국어" : "영어"} {hide === side ? "보이기" : "가리기"}
          </button>
        ))}
      </div>

      <ol className="mt-5 divide-y divide-white/10">
        {sentences.map((s, i) => (
          <li key={i} className="flex gap-3 py-3.5">
            <span className="w-6 shrink-0 pt-0.5 text-right font-black text-mark tabular-nums">{i + 1}</span>
            <div className="min-w-0 flex-1">
              {line(`en${i}`, hide === "en", "text-[17px] font-semibold leading-snug", highlight(s.en, keyExpressions(s.en, s.expressions)))}
              {line(`ko${i}`, hide === "ko", "mt-1 text-[15px] text-white/70", s.ko)}
            </div>
            <div className="shrink-0 text-white/50">
              <button
                onClick={() => speak(s.en)}
                className="rounded-full px-2 py-1 text-sm hover:bg-white/10 hover:text-white"
                aria-label={`${i + 1}번 문장 발음 듣기`}
                title="발음 듣기"
              >
                🔊
              </button>
            </div>
          </li>
        ))}
      </ol>

      <p className="mt-5 text-center text-xs text-white/50">
        출처:{" "}
        <a href={watchUrl(deck.video_id)} target="_blank" rel="noreferrer" className="underline">
          원본 영상
        </a>{" "}
        ·{" "}
        <a href={CHANNEL.url} target="_blank" rel="noreferrer" className="underline">
          {CHANNEL.name}
        </a>
      </p>
      {playing && <VideoModal videoId={deck.video_id} onClose={() => setPlaying(false)} />}
    </article>
  );
}
