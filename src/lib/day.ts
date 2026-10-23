/**
 * Gemini 무료 한도가 다시 채워지는 시각(미국 태평양 시간 자정)부터의 '오늘' 시작 시각.
 * 한국 시간으로는 오후 4시(서머타임) 또는 5시다.
 */
export function startOfQuotaDay(now = new Date()): Date {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Los_Angeles",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      timeZoneName: "shortOffset",
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  // "GMT-7" → -7
  const offset = Number((parts.timeZoneName ?? "GMT-8").replace("GMT", "") || 0);
  return new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day)) - offset * 3600_000);
}

/** 한국 날짜 (예: 2026-10-24). 서버에서 만들어 넘겨서 브라우저 시간대와 상관없이 같게 보인다 */
export const koreanDate = (iso: string) => new Date(iso).toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
