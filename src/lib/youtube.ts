export const CHANNEL = {
  id: "UCGDA1e6qQSAH0R9hoip9VrA",
  handle: "@LVACDMY",
  name: "라이브 아카데미",
  url: "https://www.youtube.com/@LVACDMY",
};

const ID = /^[A-Za-z0-9_-]{11}$/;

/** 여러 형식의 유튜브 주소(또는 영상 ID)에서 11자리 영상 ID를 꺼낸다. 못 찾으면 null */
export function parseVideoId(input: string): string | null {
  const s = input.trim();
  if (ID.test(s)) return s;
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^(www|m|music)\./, "");
  let id: string | null = null;
  if (host === "youtu.be") id = url.pathname.slice(1).split("/")[0];
  else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    if (url.pathname === "/watch") id = url.searchParams.get("v");
    else {
      const m = url.pathname.match(/^\/(shorts|live|embed|v)\/([^/]+)/);
      if (m) id = m[2];
    }
  }
  return id && ID.test(id) ? id : null;
}

export const watchUrl = (id: string, start = 0) =>
  `https://www.youtube.com/watch?v=${id}${start > 0 ? `&t=${Math.floor(start)}s` : ""}`;

export type VideoInfo = { title: string; author: string; thumbnail: string; isChannel: boolean };

/**
 * 공식 oEmbed로 영상 제목과 채널을 확인한다 (API 키 불필요).
 * 비공개·삭제된 영상이면 null. 작성자 주소가 @LVACDMY 또는 채널 ID 주소일 때만 이 채널 영상으로 본다.
 */
export async function fetchVideoInfo(id: string): Promise<VideoInfo | null> {
  const res = await fetch(
    `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(watchUrl(id))}`,
    { signal: AbortSignal.timeout(10_000) },
  );
  if (!res.ok) return null;
  const data = (await res.json()) as { title?: string; author_name?: string; author_url?: string; thumbnail_url?: string };
  const authorUrl = (data.author_url ?? "").toLowerCase();
  return {
    title: data.title ?? "",
    author: data.author_name ?? "",
    thumbnail: data.thumbnail_url ?? `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    isChannel:
      authorUrl.endsWith(`/${CHANNEL.handle.toLowerCase()}`) || authorUrl.endsWith(`/channel/${CHANNEL.id.toLowerCase()}`),
  };
}


// 영어 단어가 이만큼은 있어야 문장을 적어 둔 댓글로 본다
const ENGLISH_WORDS = /[A-Za-z]{2,}(?:[^A-Za-z]+[A-Za-z]{2,}){2,}/;
const MAX_COMMENT_CHARS = 500;
const MAX_TOTAL_CHARS = 15_000;

/**
 * 영상 댓글 중 영어 문장이 들어 있는 것 (공식 YouTube Data API, 관련성 순 100개).
 * 시청자들이 영상 속 문장을 그대로 정리해 둔 댓글이 많아서, 문장 철자·표기를 확인하는 데 도움이 된다.
 * 핵심 카드를 정리할 때 영상 속 문장의 철자를 확인하는 참고 자료로만 쓰고, 저장하거나 화면에 보여 주지 않는다.
 * YOUTUBE_API_KEY가 없거나 실패하면 빈 목록 (댓글 없이도 만든다).
 */
export async function fetchComments(videoId: string): Promise<string[]> {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) return [];
  try {
    const params = new URLSearchParams({
      part: "snippet",
      videoId,
      maxResults: "100",
      order: "relevance",
      textFormat: "plainText",
      key,
    });
    const res = await fetch(`https://www.googleapis.com/youtube/v3/commentThreads?${params}`, {
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      console.error(`[comments ${videoId}] ${res.status}`, (await res.text()).slice(0, 300));
      return [];
    }
    type Item = {
      snippet?: {
        topLevelComment?: { snippet?: { textOriginal?: string } };
      };
    };
    const data = (await res.json()) as { items?: Item[] };
    const out: string[] = [];
    let total = 0;
    for (const item of data.items ?? []) {
      const s = item.snippet?.topLevelComment?.snippet;
      const text = (s?.textOriginal ?? "").trim().slice(0, MAX_COMMENT_CHARS);
      if (!ENGLISH_WORDS.test(text)) continue;
      if (total + text.length > MAX_TOTAL_CHARS) break;
      total += text.length;
      out.push(text);
    }
    return out;
  } catch (err) {
    console.error(`[comments ${videoId}]`, err);
    return [];
  }
}

export type ChannelVideo = { id: string; title: string; published: string };

// 전체 목록은 자주 바뀌지 않으니 6시간 동안 저장해 두고 쓴다 (한 번 불러올 때 약 30유닛)
const LIST_REVALIDATE_S = 6 * 3600;
const MAX_PAGES = 60;

/**
 * 채널의 모든 공개 영상을 업로드 날짜가 오래된 순으로 (YouTube Data API, 업로드 재생목록).
 * 키가 없으면 null, 불러오다 실패하면 그때까지 받은 것만 준다.
 */
export async function fetchChannelVideos(): Promise<ChannelVideo[] | null> {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) return null;
  // 채널의 업로드 재생목록 ID는 채널 ID의 'UC'를 'UU'로 바꾼 것
  const playlistId = `UU${CHANNEL.id.slice(2)}`;
  const videos: ChannelVideo[] = [];
  let pageToken = "";
  for (let page = 0; page < MAX_PAGES; page++) {
    const params = new URLSearchParams({
      part: "snippet,contentDetails",
      playlistId,
      maxResults: "50",
      fields: "nextPageToken,items(snippet(title,resourceId/videoId),contentDetails/videoPublishedAt)",
      key,
    });
    if (pageToken) params.set("pageToken", pageToken);
    try {
      const res = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?${params}`, {
        next: { revalidate: LIST_REVALIDATE_S },
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) {
        console.error(`[channel list] ${res.status}`, (await res.text()).slice(0, 300));
        break;
      }
      type Item = { snippet?: { title?: string; resourceId?: { videoId?: string } }; contentDetails?: { videoPublishedAt?: string } };
      const data = (await res.json()) as { nextPageToken?: string; items?: Item[] };
      for (const item of data.items ?? []) {
        const id = item.snippet?.resourceId?.videoId;
        const published = item.contentDetails?.videoPublishedAt;
        // 비공개·삭제된 영상은 날짜가 없다
        if (!id || !published) continue;
        videos.push({ id, title: item.snippet?.title ?? "", published });
      }
      if (!data.nextPageToken) break;
      pageToken = data.nextPageToken;
    } catch (err) {
      console.error("[channel list]", err);
      break;
    }
  }
  return videos.sort((a, b) => a.published.localeCompare(b.published));
}
