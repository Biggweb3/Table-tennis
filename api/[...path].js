import { getGlobalWeather, getPlayer, updatePlayer, resetPlayer } from './_db.js';

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { path } = req.query; // matches rewrite /api/:path*

  // Handle weather endpoint: /api/weather
  if (path === 'weather' || req.url.includes('/weather')) {
    return res.status(200).json(getGlobalWeather());
  }

  // Handle player endpoints: /api/player/:id or /api/player/:id/progress or /api/player/:id/reset
  const match = req.url.match(/\/api\/player\/([^/?#]+)(?:\/(progress|reset))?/);
  if (match) {
    const playerId = match[1];
    const action = match[2];

    if (!playerId) {
      return res.status(400).json({ error: 'Missing player ID' });
    }

    if (req.method === 'GET') {
      const player = getPlayer(playerId);
      return res.status(200).json(player);
    }

    if (req.method === 'POST') {
      if (action === 'reset') {
        const player = resetPlayer(playerId);
        return res.status(200).json({ success: true, player });
      } else {
        const updated = updatePlayer(playerId, req.body || {});
        return res.status(200).json({ success: true, player: updated });
      }
    }
  }

  return res.status(404).json({ error: 'Endpoint not found' });
}
