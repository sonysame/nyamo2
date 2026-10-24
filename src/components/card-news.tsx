"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import type { Deck, DeckContent } from "@/lib/types";
import { keyExpressions } from "@/lib/expressions";
import { CHANNEL, watchUrl } from "@/lib/youtube";
import { speak, VideoModal } from "./media";
import { Quiz } from "./quiz";

/** date: 핵심 카드를 만든 날짜 (한국 날짜, 카드 오른쪽 위에 표시), stars: 내가 누른 별 개수 (0~3) */
export type ReadyDeck = Pick<Deck, "video_id" | "title"> & { content: DeckContent; date?: string; stars?: number };

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
export function WrapUpCard({
  deck,
  n,
  linkTitle = false,
  onStarsChange,
}: {
  deck: ReadyDeck;
  n?: number;
  linkTitle?: boolean;
  /** 별을 바꾸면 알려 준다 (모아 보기 목록의 별과 정렬을 맞추려고) */
  onStarsChange?: (stars: number) => void;
}) {
  const { sentences } = deck.content;
  const [stars, setStarsState] = useState(deck.stars ?? 0);
  const [starError, setStarError] = useState("");
  // 별 누르기: 같은 개수를 다시 누르면 0개로. 바로 바꿔 보여 주고, 저장에 실패하면 되돌린다.
  const rate = async (count: number) => {
    const prev = stars;
    const next = count === prev ? 0 : count;
    setStarsState(next);
    setStarError("");
    onStarsChange?.(next);
    const res = await fetch("/api/stars", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ videoId: deck.video_id, stars: next }),
    }).catch(() => null);
    if (!res?.ok) {
      const data = (await res?.json().catch(() => ({}))) as { error?: string } | undefined;
      setStarsState(prev);
      onStarsChange?.(prev);
      setStarError(data?.error ?? "별을 저장하지 못했어요.");
    }
  };
  // 가리기: 한쪽 말을 가리고 떠올려 본다. 가린 줄은 눌러서 하나씩 볼 수 있다.
  const [hide, setHide] = useState<"none" | "ko" | "en">("none");
  const [peeked, setPeeked] = useState<Set<string>>(new Set());
  const toggle = (side: "ko" | "en") => {
    setHide((h) => (h === side ? "none" : side));
    setPeeked(new Set());
  };
  const peek = (key: string) => setPeeked((p) => new Set(p).add(key));
  const [playing, setPlaying] = useState(false);
  // 퀴즈를 푸는 동안에는 문장 목록 대신 퀴즈를 보여 준다
  const [quiz, setQuiz] = useState(false);
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
        <span className="flex shrink-0 items-center gap-2">
          <span className="flex" role="group" aria-label="별점">
            {[1, 2, 3].map((i) => (
              <button
                key={i}
                onClick={() => rate(i)}
                aria-label={`별 ${i}개`}
                aria-pressed={stars >= i}
                className={`px-0.5 text-lg leading-none ${stars >= i ? "text-mark" : "text-white/25 hover:text-white/50"}`}
              >
                ★
              </button>
            ))}
          </span>
          {deck.date && <span className="text-xs font-semibold text-white/50 tabular-nums">{deck.date}</span>}
        </span>
      </div>
      {starError && <p className="mt-1 text-xs text-danger">{starError}</p>}
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
        <button
          onClick={() => setQuiz((q) => !q)}
          aria-pressed={quiz}
          className={`rounded-full px-3 py-1.5 text-sm font-bold ${quiz ? "bg-mark text-ink" : "bg-white/10 text-white/80 hover:bg-white/20"}`}
        >
          ✏️ 퀴즈
        </button>
        {!quiz && (["ko", "en"] as const).map((side) => (
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

      {quiz ? (
        <div className="mt-5">
          <Quiz sentences={sentences} onExit={() => setQuiz(false)} />
        </div>
      ) : (
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
      )}

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
