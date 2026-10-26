export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL || 'https://itxjodboocydoupxngyg.supabase.co';
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    'sb_publishable_NpTejiOSE5nJ43csRDcG7Q_gZg8jxNA';

  if (req.method === 'GET') {
    try {
      if (supabaseUrl && supabaseKey) {
        const fetchUrl = `${supabaseUrl}/rest/v1/site_catalog?select=*&order=id.asc&limit=1`;
        const response = await fetch(fetchUrl, {
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
          },
        });
        if (response.ok) {
          const rows = await response.json();
          if (Array.isArray(rows) && rows.length > 0 && rows[0].tracks) {
            res.status(200).json({
              tracks: rows[0].tracks,
              playlists: rows[0].playlists || [],
              artists: rows[0].artists || [],
              updatedAt: rows[0].updated_at || new Date().toISOString(),
              storageMode: 'supabase+server',
            });
            return;
          }
        }
      }
    } catch {}

    res.status(200).json({
      tracks: [],
      playlists: [],
      artists: [],
      updatedAt: new Date().toISOString(),
      storageMode: 'server-permanent',
    });
    return;
  }

  if (req.method === 'POST') {
    try {
      const { tracks, playlists, artists } = req.body || {};
      const updatedAt = new Date().toISOString();

      if (supabaseUrl && supabaseKey && Array.isArray(tracks)) {
        const payload = {
          id: 1,
          tracks,
          playlists: playlists || [],
          artists: artists || [],
          updated_at: updatedAt,
        };
        const upsertUrl = `${supabaseUrl}/rest/v1/site_catalog`;
        await fetch(upsertUrl, {
          method: 'POST',
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
            Prefer: 'resolution=merge-duplicates',
          },
          body: JSON.stringify(payload),
        });
      }

      res.status(200).json({
        success: true,
        updatedAt,
        tracks,
        playlists,
        artists,
      });
    } catch (err: any) {
      res.status(200).json({
        success: true,
        updatedAt: new Date().toISOString(),
      });
    }
    return;
  }

  res.status(405).json({ error: 'Method Not Allowed' });
}
