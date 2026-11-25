const express = require('express');
const db = require('../config/db');

const router = express.Router();

// GET /api/stats - Live active visitors, total human visitors, returning rate, and bots blocked
router.get('/', async (_req, res) => {
  try {
    const [summaryRes, activeRes, botsRes, recentBotsRes, topSourcesRes] = await Promise.all([
      db.query(`
        SELECT
          COUNT(*)::int AS total_visitors,
          COUNT(*) FILTER (WHERE is_returning = TRUE)::int AS returning_visitors
        FROM visitors
      `),
      db.query(`
        SELECT COUNT(*)::int AS live_active
        FROM visitors
        WHERE last_seen >= NOW() - INTERVAL '5 minutes'
      `),
      db.query('SELECT COUNT(*)::int AS bots_blocked FROM blocked_bots'),
      db.query(`
        SELECT id, ip_address AS "ipAddress", user_agent AS "userAgent", reason, score, timestamp
        FROM blocked_bots
        ORDER BY timestamp DESC
        LIMIT 15
      `),
      db.query(`
        SELECT source, COUNT(*)::int AS visits
        FROM page_views
        GROUP BY source
        ORDER BY visits DESC
        LIMIT 6
      `),
    ]);

    const totalHumanVisitors = summaryRes.rows[0].total_visitors;
    const returningVisitors = summaryRes.rows[0].returning_visitors;
    const returningRate =
      totalHumanVisitors > 0 ? Math.round((returningVisitors / totalHumanVisitors) * 1000) / 10 : 0;

    return res.json({
      liveActiveVisitors: activeRes.rows[0].live_active,
      totalHumanVisitors,
      returningVisitors,
      returningRate,
      totalBotsBlocked: botsRes.rows[0].bots_blocked,
      recentBlockedBots: recentBotsRes.rows,
      topSources: topSourcesRes.rows,
    });
  } catch (err) {
    console.error('[Stats] Error:', err);
    return res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

module.exports = router;
