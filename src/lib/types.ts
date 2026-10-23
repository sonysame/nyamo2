/** 영상에서 배우는 영어 문장 하나 (핵심 카드의 한 줄) */
export type Sentence = {
  en: string;
  ko: string;
  /** 영상에서 이 문장이 처음 나오는 시각(초) */
  start: number;
  /** 핵심 표현과 뜻 (핵심 카드에서 노란색으로 표시) */
  expressions: { en: string; ko: string }[];
  /** AI가 자기 말로 쓴 짧은 해설 */
  note: string;
  /** AI가 새로 만든 응용 예문 */
  examples: { en: string; ko: string }[];
};

export type DeckContent = {
  summary: string;
  points: string[];
  sentences: Sentence[];
  closing: string;
};

export type DeckStatus = "processing" | "ready" | "failed";

export type Deck = {
  video_id: string;
  title: string;
  author: string;
  thumbnail_url: string | null;
  status: DeckStatus;
  content: DeckContent | null;
  error: string | null;
};
