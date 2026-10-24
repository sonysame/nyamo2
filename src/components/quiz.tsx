"use client";

import { useState } from "react";
import { keyExpressions } from "@/lib/expressions";
import type { Sentence } from "@/lib/types";
import { speak } from "./media";

type Question = {
  /** 문제로 보여 줄 한국어 뜻 */
  ko: string;
  /** 빈칸 문제면 핵심 표현 자리를 ____로 바꾼 영어 문장, 문장 고르기 문제면 없음 */
  blanked?: string;
  options: string[];
  answer: string;
  /** 정답 공개 때 보여 주고 읽어 줄 영어 문장 */
  en: string;
};

const shuffle = <T,>(list: T[]) => {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/**
 * 카드에 이미 있는 문장으로 문제를 만든다 (Gemini를 부르지 않는다).
 * 핵심 표현이 있고 다른 보기가 3개 이상 있으면 빈칸 채우기, 아니면 한국어를 보고 영어 문장 고르기.
 */
function makeQuestions(sentences: Sentence[]): Question[] {
  const keyOf = (s: Sentence) => keyExpressions(s.en, s.expressions)[0]?.en;
  const lower = (s: string) => s.toLowerCase();
  const allKeys = [...new Map(sentences.map(keyOf).filter((k): k is string => !!k).map((k) => [lower(k), k])).values()];

  return shuffle(
    sentences.map((s) => {
      const key = keyOf(s);
      const others = key ? allKeys.filter((k) => lower(k) !== lower(key)) : [];
      if (key && others.length >= 3) {
        const at = lower(s.en).indexOf(lower(key));
        return {
          ko: s.ko,
          blanked: `${s.en.slice(0, at)}____${s.en.slice(at + key.length)}`,
          options: shuffle([key, ...shuffle(others).slice(0, 3)]),
          answer: key,
          en: s.en,
        };
      }
      const wrong = shuffle(sentences.filter((o) => o.en !== s.en).map((o) => o.en)).slice(0, 3);
      return { ko: s.ko, options: shuffle([s.en, ...wrong]), answer: s.en, en: s.en };
    }),
  );
}

/** 핵심 카드 퀴즈: 한 문제씩 풀고, 고르면 바로 정답을 보여 준다 */
export function Quiz({ sentences, onExit }: { sentences: Sentence[]; onExit: () => void }) {
  const [questions, setQuestions] = useState(() => makeQuestions(sentences));
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const q = questions[index];

  const restart = () => {
    setQuestions(makeQuestions(sentences));
    setIndex(0);
    setPicked(null);
    setScore(0);
  };

  if (!q) {
    return (
      <div className="py-6 text-center">
        <p className="text-4xl">{score === questions.length ? "🎉" : "👏"}</p>
        <p className="mt-3 text-xl font-black">
          {questions.length}문제 중 {score}개 맞혔어요
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <button onClick={restart} className="rounded-xl bg-mark px-4 py-2 text-sm font-bold text-ink">
            다시 풀기
          </button>
          <button onClick={onExit} className="rounded-xl bg-white/10 px-4 py-2 text-sm font-bold text-white hover:bg-white/20">
            카드로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  const choose = (option: string) => {
    if (picked) return;
    setPicked(option);
    if (option === q.answer) setScore((s) => s + 1);
  };

  return (
    <div className="py-2">
      <div className="flex items-center justify-between text-xs text-white/50">
        <span className="tabular-nums">
          {index + 1} / {questions.length}
        </span>
        <span>{q.blanked ? "빈칸에 들어갈 핵심 표현은?" : "이 뜻의 영어 문장은?"}</span>
      </div>
      <p className="mt-3 text-lg font-bold leading-snug">{q.ko}</p>
      {q.blanked && <p className="mt-2 text-[17px] text-white/80">{q.blanked}</p>}

      <div className="mt-4 grid gap-2">
        {q.options.map((o) => {
          const state = !picked ? "" : o === q.answer ? "bg-success text-white" : o === picked ? "bg-danger text-white" : "opacity-50";
          return (
            <button
              key={o}
              onClick={() => choose(o)}
              disabled={!!picked}
              className={`rounded-xl bg-white/10 px-4 py-2.5 text-left text-[15px] font-semibold hover:bg-white/20 disabled:hover:bg-white/10 ${state}`}
            >
              {o}
            </button>
          );
        })}
      </div>

      {picked && (
        <div className="mt-4 flex items-center justify-between gap-2 rounded-xl bg-white/5 px-4 py-3">
          <p className="text-sm">
            <span className={`font-black ${picked === q.answer ? "text-success" : "text-danger"}`}>
              {picked === q.answer ? "정답!" : "아쉬워요"}
            </span>{" "}
            {q.en}
          </p>
          <span className="flex shrink-0 gap-1">
            <button onClick={() => speak(q.en)} className="rounded-full px-2 py-1 text-sm hover:bg-white/10" aria-label="발음 듣기">
              🔊
            </button>
            <button
              onClick={() => {
                setIndex((i) => i + 1);
                setPicked(null);
              }}
              className="rounded-full bg-mark px-3 py-1 text-sm font-bold text-ink"
            >
              {index + 1 === questions.length ? "결과 보기" : "다음"}
            </button>
          </span>
        </div>
      )}

      <button onClick={onExit} className="mt-5 text-xs text-white/50 underline">
        퀴즈 그만하고 카드 보기
      </button>
    </div>
  );
}
