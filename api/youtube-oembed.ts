export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const videoId = String(req.query.videoId || '').trim();
  if (!videoId || !/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
    res.status(400).json({ error: 'Invalid videoId' });
    return;
  }

  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}&format=json`;
    const response = await fetch(oembedUrl);
    if (response.ok) {
      const data = await response.json();
      res.status(200).json({
        title: data.title || '',
        author: data.author_name || '',
      });
      return;
    }

    // Fallback to noembed
    const noembed = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`);
    if (noembed.ok) {
      const ndata = await noembed.json();
      res.status(200).json({
        title: ndata.title || '',
        author: ndata.author_name || '',
      });
      return;
    }

    res.status(200).json({
      title: `YouTube Song (${videoId})`,
      author: 'YouTube Artist',
    });
  } catch (err: any) {
    res.status(200).json({
      title: `YouTube Song (${videoId})`,
      author: 'YouTube Artist',
    });
  }
}
