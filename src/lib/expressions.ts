/**
 * 핵심 표현 걸러내기: 문장에 실제로 없거나, 문장 전체(또는 거의 전체)를 칠하는 표현은 뺀다.
 * 카드를 만들 때(모델이 프롬프트를 어겨도)와 보여 줄 때(예전에 만든 카드) 둘 다 쓴다.
 */
export function keyExpressions<T extends { en: string }>(sentence: string, expressions: T[]): T[] {
  const words = (s: string) => s.toLowerCase().replace(/[^a-z0-9' ]/g, " ").split(/\s+/).filter(Boolean);
  const total = words(sentence).length;
  return expressions.filter((e) => {
    const n = words(e.en).length;
    return sentence.toLowerCase().includes(e.en.toLowerCase()) && n > 0 && (total <= 3 || n < total * 0.8);
  });
}
