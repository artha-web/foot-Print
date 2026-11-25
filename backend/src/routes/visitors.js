const express = require('express');
const db = require('../config/db');

const router = express.Router();

// GET /api/visitors - Paginated visitor profiles with filtering (All, Returning, New, City, Source)
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '20', 10) || 20));
    const offset = (page - 1) * limit;
    const type = (req.query.type || 'all').toLowerCase();
    const city = (req.query.city || '').trim();
    const source = (req.query.source || '').trim();
    const search = (req.query.search || '').trim();

    const conditions = [];
    const params = [];

    if (type === 'returning') {
      conditions.push('v.is_returning = TRUE');
    } else if (type === 'new') {
      conditions.push('v.is_returning = FALSE');
    }

    if (city) {
      params.push(city);
      conditions.push(`LOWER(v.city) = LOWER($${params.length})`);
    }

    if (source) {
      params.push(source);
      conditions.push(
        `EXISTS (SELECT 1 FROM page_views pv WHERE pv.visitor_id = v.id AND LOWER(pv.source) = LOWER($${params.length}))`
      );
    }

    if (search) {
      params.push(`%${search}%`);
      const idx = params.length;
      conditions.push(
        `(CAST(v.visitor_number AS TEXT) ILIKE $${idx} OR v.fingerprint_id ILIKE $${idx} OR v.city ILIKE $${idx} OR v.ip_address ILIKE $${idx})`
      );
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countQuery = `SELECT COUNT(*)::int AS total FROM visitors v ${whereClause}`;
    const countRes = await db.query(countQuery, params);
    const total = countRes.rows[0].total;

    const listParams = [...params, limit, offset];
    const listQuery = `
      SELECT
        v.id,
        v.visitor_number AS "visitorNumber",
        v.fingerprint_id AS "fingerprintId",
        v.ip_address AS "ipAddress",
        v.city,
        v.country,
        v.device,
        v.browser,
        v.first_seen AS "firstSeen",
        v.last_seen AS "lastSeen",
        v.total_visits AS "totalVisits",
        v.total_pages AS "totalPages",
        v.is_returning AS "isReturning",
        latest.url AS "lastUrl",
        latest.source AS "lastSource"
      FROM visitors v
      LEFT JOIN LATERAL (
        SELECT url, source
        FROM page_views
        WHERE visitor_id = v.id
        ORDER BY timestamp DESC
        LIMIT 1
      ) latest ON TRUE
      ${whereClause}
      ORDER BY v.last_seen DESC
      LIMIT $${listParams.length - 1} OFFSET $${listParams.length}
    `;

    const [visitorsRes, citiesRes, sourcesRes] = await Promise.all([
      db.query(listQuery, listParams),
      db.query(`SELECT DISTINCT city FROM visitors WHERE city <> 'Unknown' ORDER BY city ASC LIMIT 50`),
      db.query(`SELECT DISTINCT source FROM page_views ORDER BY source ASC LIMIT 50`),
    ]);

    return res.json({
      visitors: visitorsRes.rows,
      total,
      page,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      filters: {
        cities: citiesRes.rows.map((r) => r.city),
        sources: sourcesRes.rows.map((r) => r.source),
      },
    });
  } catch (err) {
    console.error('[Visitors] List error:', err);
    return res.status(500).json({ error: 'Failed to fetch visitors' });
  }
});

// GET /api/visitors/:fingerprintId - Full visitor Kundli timeline + Mon-Sun weekly activity
router.get('/:fingerprintId', async (req, res) => {
  try {
    const { fingerprintId } = req.params;
    const visitorRes = await db.query(
      `SELECT
        id,
        visitor_number AS "visitorNumber",
        fingerprint_id AS "fingerprintId",
        ip_address AS "ipAddress",
        city,
        country,
        device,
        browser,
        first_seen AS "firstSeen",
        last_seen AS "lastSeen",
        total_visits AS "totalVisits",
        total_pages AS "totalPages",
        is_returning AS "isReturning"
      FROM visitors
      WHERE fingerprint_id = $1
      LIMIT 1`,
      [fingerprintId]
    );

    if (visitorRes.rows.length === 0) {
      return res.status(404).json({ error: 'Visitor not found' });
    }

    const visitor = visitorRes.rows[0];

    const [viewsRes, sourcesRes, weeklyRes] = await Promise.all([
      db.query(
        `SELECT id, url, page_title AS "pageTitle", source, utm_source AS "utmSource",
                utm_medium AS "utmMedium", utm_campaign AS "utmCampaign",
                duration_seconds AS "durationSeconds", timestamp
         FROM page_views
         WHERE visitor_id = $1
         ORDER BY timestamp DESC
         LIMIT 100`,
        [visitor.id]
      ),
      db.query(
        `SELECT source, COUNT(*)::int AS count
         FROM page_views
         WHERE visitor_id = $1
         GROUP BY source
         ORDER BY count DESC`,
        [visitor.id]
      ),
      db.query(
        `SELECT EXTRACT(ISODOW FROM timestamp)::int AS iso_day, COUNT(*)::int AS count
         FROM page_views
         WHERE visitor_id = $1 AND timestamp >= NOW() - INTERVAL '7 days'
         GROUP BY iso_day`,
        [visitor.id]
      ),
    ]);

    const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const dayCounts = new Map(weeklyRes.rows.map((r) => [r.iso_day, r.count]));
    const weeklyActivity = dayLabels.map((label, idx) => ({
      day: label,
      count: dayCounts.get(idx + 1) || 0,
    }));

    return res.json({
      visitor,
      pageViews: viewsRes.rows,
      trafficSources: sourcesRes.rows,
      weeklyActivity,
    });
  } catch (err) {
    console.error('[Visitors] Detail error:', err);
    return res.status(500).json({ error: 'Failed to fetch visitor timeline' });
  }
});

module.exports = router;
