export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const title = String(req.query.title || '').trim();
  const artist = String(req.query.artist || '').trim();
  const excludeRaw = String(req.query.exclude || '').trim();

  if (!title) {
    res.status(400).json({ error: 'Missing song title' });
    return;
  }

  const excludeIds = new Set(
    excludeRaw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  );

  const query = `${title} ${artist} audio song`.trim();

  try {
    const ytRes = await fetch(
      `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      }
    );
    if (!ytRes.ok) {
      res.status(200).json({ videoIds: [] });
      return;
    }

    const html = await ytRes.text();
    const matches = Array.from(html.matchAll(/"videoId":"([a-zA-Z0-9_-]{11})"/g));
    const candidates = Array.from(new Set(matches.map((m) => m[1]))).filter(
      (id) => !excludeIds.has(id)
    );

    res.status(200).json({ videoIds: candidates.slice(0, 6) });
  } catch {
    res.status(200).json({ videoIds: [] });
  }
}
