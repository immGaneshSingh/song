export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const supabaseUrl = (process.env.SUPABASE_URL || 'https://itxjodboocydoupxngyg.supabase.co').replace(/\/$/, '');
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    'sb_publishable_NpTejiOSE5nJ43csRDcG7Q_gZg8jxNA';

  if (req.method === 'GET') {
    try {
      const fetchUrl = `${supabaseUrl}/rest/v1/site_catalog?id=eq.global_catalog&select=id,tracks,playlists,updated_at`;
      const response = await fetch(fetchUrl, {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          Accept: 'application/json',
        },
      });
      if (response.ok) {
        const rows = await response.json();
        if (Array.isArray(rows) && rows.length > 0 && Array.isArray(rows[0].tracks)) {
          res.status(200).json({
            tracks: rows[0].tracks,
            playlists: rows[0].playlists || [],
            updatedAt: rows[0].updated_at || new Date().toISOString(),
            storageMode: 'supabase+server',
          });
          return;
        }
      }
    } catch (err: any) {
      console.error('Error fetching catalog in serverless:', err);
    }

    res.status(200).json({
      tracks: [],
      playlists: [],
      updatedAt: new Date().toISOString(),
      storageMode: 'server-permanent',
    });
    return;
  }

  if (req.method === 'POST') {
    try {
      const { tracks, playlists } = req.body || {};
      const updatedAt = new Date().toISOString();

      if (Array.isArray(tracks) && tracks.length > 0) {
        const patchUrl = `${supabaseUrl}/rest/v1/site_catalog?id=eq.global_catalog`;
        await fetch(patchUrl, {
          method: 'PATCH',
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
            Prefer: 'return=representation',
          },
          body: JSON.stringify({
            tracks,
            playlists: playlists || [],
            updated_at: updatedAt,
          }),
        });
      }

      res.status(200).json({
        success: true,
        updatedAt,
        tracksCount: tracks?.length || 0,
        playlistsCount: playlists?.length || 0,
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: err?.message,
      });
    }
    return;
  }

  res.status(405).json({ error: 'Method Not Allowed' });
}
