// 앱과 같은 프롬프트로 영상 하나를 시험한다 (DB에는 저장하지 않음, Gemini 한도는 1회 씀)
// 사용법: node --conditions=react-server --env-file=.env.local scripts/try-video.mjs <영상 URL 또는 ID>
import { generateDeck } from "../src/lib/gemini.ts";
import { fetchComments, parseVideoId } from "../src/lib/youtube.ts";

const id = parseVideoId(process.argv[2] ?? "");
if (!id) throw new Error("영상 URL 또는 ID를 넣어 주세요.");
const t = Date.now();
const comments = await fetchComments(id);
console.error("댓글", comments.length, "개 참고");
const deck = await generateDeck(id, comments, async (a) => console.error("시도:", a));
console.log(JSON.stringify(deck, null, 2));
console.error((Date.now() - t) / 1000, "초");
