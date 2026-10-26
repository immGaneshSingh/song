export const config = {
  maxDuration: 30,
};

const YT_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.9',
  Cookie: 'CONSENT=YES+cb; SOCS=CAISHAgBEhJnd3NfMjAyNDA1MTQtMF9SQzIaAmVuIAEaBgiAo_CmBg',
};

function parseYtInitialDataFromHtml(html: string): any | null {
  const marker = 'var ytInitialData = ';
  const idx = html.indexOf(marker);
  if (idx !== -1) {
    const start = idx + marker.length;
    let depth = 0;
    let end = start;
    let inString = false;
    let escape = false;

    for (let i = start; i < html.length; i++) {
      const c = html[i];
      if (escape) {
        escape = false;
        continue;
      }
      if (c === '\\') {
        escape = true;
        continue;
      }
      if (c === '"') {
        inString = !inString;
        continue;
      }
      if (!inString) {
        if (c === '{') depth++;
        else if (c === '}') {
          depth--;
          if (depth === 0) {
            end = i + 1;
            break;
          }
        }
      }
    }
    if (end > start) {
      try {
        return JSON.parse(html.slice(start, end));
      } catch {}
    }
  }
  return null;
}

function cleanTrackTitle(raw: string): string {
  return raw
    .replace(/\s*(\(|\[)\s*(official\s*(music\s*)?(video|audio|lyric\s*video|lyrics|visualizer)|full\s*(video|audio|song)|lyrical\s*(video|song)?|4k|hd|audio\s*song|video\s*song)\s*(\)|\])/gi, '')
    .trim();
}

function extractPlaylistItems(data: any, seen: Set<string>, videos: any[], max: number) {
  function walk(node: any) {
    if (!node || typeof node !== 'object' || videos.length >= max) return;
    if (node.playlistVideoRenderer) {
      const r = node.playlistVideoRenderer;
      const vid = String(r.videoId || '').trim();
      const rawTitle = r.title?.runs?.[0]?.text || r.title?.simpleText || '';
      const artist = r.shortBylineText?.runs?.[0]?.text || 'YouTube Music';
      if (vid && /^[a-zA-Z0-9_-]{11}$/.test(vid) && rawTitle && !seen.has(vid)) {
        seen.add(vid);
        videos.push({
          videoId: vid,
          title: cleanTrackTitle(rawTitle),
          artist: String(artist).trim(),
          coverUrl: `https://img.youtube.com/vi/${vid}/mqdefault.jpg`,
          audioUrl: '',
          duration: Number(r.lengthSeconds) || 240,
        });
      }
    } else if (node.playlistPanelVideoRenderer) {
      const r = node.playlistPanelVideoRenderer;
      const vid = String(r.videoId || '').trim();
      const rawTitle = r.title?.simpleText || r.title?.runs?.[0]?.text || '';
      const artist = r.shortBylineText?.runs?.[0]?.text || 'YouTube Music';
      if (vid && /^[a-zA-Z0-9_-]{11}$/.test(vid) && rawTitle && !seen.has(vid)) {
        seen.add(vid);
        videos.push({
          videoId: vid,
          title: cleanTrackTitle(rawTitle),
          artist: String(artist).trim(),
          coverUrl: `https://img.youtube.com/vi/${vid}/mqdefault.jpg`,
          audioUrl: '',
          duration: 240,
        });
      }
    } else if (node.videoRenderer) {
      const r = node.videoRenderer;
      const vid = String(r.videoId || '').trim();
      const rawTitle = r.title?.runs?.[0]?.text || r.title?.simpleText || '';
      const artist = r.ownerText?.runs?.[0]?.text || 'YouTube Music';
      if (vid && /^[a-zA-Z0-9_-]{11}$/.test(vid) && rawTitle && !seen.has(vid)) {
        seen.add(vid);
        videos.push({
          videoId: vid,
          title: cleanTrackTitle(rawTitle),
          artist: String(artist).trim(),
          coverUrl: `https://img.youtube.com/vi/${vid}/mqdefault.jpg`,
          audioUrl: '',
          duration: 240,
        });
      }
    }
    for (const k of Object.keys(node)) {
      walk(node[k]);
    }
  }
  walk(data);
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const playlistId = String(req.query.playlistId || '').trim();
    const fallbackTitle = String(req.query.title || '').trim() || undefined;
    const maxItems = Math.min(300, Math.max(1, Number(req.query.max || 200)));

    if (!playlistId) {
      res.status(400).json({ error: 'Missing playlistId parameter' });
      return;
    }

    const seenIds = new Set<string>();
    const videos: any[] = [];
    let title = fallbackTitle || '';

    // 1. If standard playlist
    if (!playlistId.startsWith('RD') && /^[a-zA-Z0-9_-]{8,}$/.test(playlistId)) {
      const ytUrl = `https://www.youtube.com/playlist?list=${encodeURIComponent(playlistId)}`;
      const response = await fetch(ytUrl, { headers: YT_HEADERS });
      if (response.ok) {
        const html = await response.text();
        const titleMatch = html.match(/<meta property="og:title" content="([^"]+)"/);
        if (titleMatch?.[1] && titleMatch[1] !== 'YouTube') {
          title = titleMatch[1];
        }
        const parsed = parseYtInitialDataFromHtml(html);
        if (parsed) {
          extractPlaylistItems(parsed, seenIds, videos, maxItems);
        }
        if (videos.length === 0) {
          const allVids = [...new Set([...html.matchAll(/"videoId":"([a-zA-Z0-9_-]{11})"/g)].map((m) => m[1]))];
          for (const vid of allVids.slice(0, maxItems)) {
            if (!seenIds.has(vid)) {
              seenIds.add(vid);
              videos.push({
                videoId: vid,
                title: `YouTube Song (${vid})`,
                artist: 'YouTube Music',
                coverUrl: `https://img.youtube.com/vi/${vid}/mqdefault.jpg`,
                audioUrl: '',
                duration: 240,
              });
            }
          }
        }
      }
    }

    // 2. Mix / Radio or Watch+list fallback
    if (videos.length === 0) {
      const seedVid = playlistId.startsWith('RD') ? playlistId.slice(2, 13) : playlistId;
      if (/^[a-zA-Z0-9_-]{11}$/.test(seedVid)) {
        const watchUrl = `https://www.youtube.com/watch?v=${encodeURIComponent(seedVid)}&list=${encodeURIComponent(playlistId)}`;
        const response = await fetch(watchUrl, { headers: YT_HEADERS });
        if (response.ok) {
          const html = await response.text();
          const parsed = parseYtInitialDataFromHtml(html);
          if (parsed) {
            extractPlaylistItems(parsed, seenIds, videos, maxItems);
          }
        }
      }
    }

    // 3. Search fallback
    if (videos.length === 0) {
      const searchTerms = title || fallbackTitle || playlistId;
      const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(`${searchTerms} official audio`)}`;
      const response = await fetch(searchUrl, { headers: YT_HEADERS });
      if (response.ok) {
        const html = await response.text();
        const parsed = parseYtInitialDataFromHtml(html);
        if (parsed) {
          extractPlaylistItems(parsed, seenIds, videos, maxItems);
        }
      }
    }

    if (videos.length === 0) {
      res.status(404).json({ error: 'Could not resolve songs from this YouTube playlist' });
      return;
    }

    res.status(200).json({
      playlistId,
      title: title || `${videos[0].artist} Playlist`,
      videos,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to resolve YouTube playlist', message: err?.message });
  }
}
