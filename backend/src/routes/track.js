const express = require('express');
const db = require('../config/db');
const { extractClientIp, resolveGeoIp } = require('../services/geoip');
const { evaluateBotRisk } = require('../services/botDetector');
const { broadcast } = require('../ws/broadcaster');

const router = express.Router();

function normalizeSource(referrer, utmSource) {
  if (utmSource && typeof utmSource === 'string' && utmSource.trim()) {
    const clean = utmSource.trim().toLowerCase();
    const map = {
      ig: 'Instagram',
      instagram: 'Instagram',
      fb: 'Facebook',
      facebook: 'Facebook',
      google: 'Google',
      twitter: 'Twitter/X',
      x: 'Twitter/X',
      linkedin: 'LinkedIn',
      youtube: 'YouTube',
      yt: 'YouTube',
      reddit: 'Reddit',
      newsletter: 'Email',
      email: 'Email',
    };
    return map[clean] || utmSource.trim().charAt(0).toUpperCase() + utmSource.trim().slice(1);
  }

  if (!referrer || typeof referrer !== 'string') return 'Direct';
  try {
    const host = new URL(referrer).hostname.toLowerCase();
    if (host.includes('google.')) return 'Google';
    if (host.includes('instagram.com') || host.includes('l.instagram.com')) return 'Instagram';
    if (host.includes('facebook.com') || host.includes('fb.com')) return 'Facebook';
    if (host.includes('t.co') || host.includes('twitter.com') || host.includes('x.com')) return 'Twitter/X';
    if (host.includes('linkedin.com')) return 'LinkedIn';
    if (host.includes('youtube.com') || host.includes('youtu.be')) return 'YouTube';
    if (host.includes('reddit.com')) return 'Reddit';
    if (host.includes('bing.com')) return 'Bing';
    if (host.includes('duckduckgo.com')) return 'DuckDuckGo';
    return host.replace(/^www\./, '');
  } catch {
    return 'Direct';
  }
}

router.post('/', async (req, res) => {
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const ip = extractClientIp(req);
    const userAgent = req.headers['user-agent'] || '';
    const fingerprintId = String(body.fingerprintId || '').trim().slice(0, 64);

    const geo = await resolveGeoIp(ip);
    const botCheck = evaluateBotRisk({
      ip,
      userAgent,
      geo,
      signals: {
        ...(body.botSignals || {}),
        eventType: body.eventType || 'pageview',
      },
      fingerprintId,
    });

    if (botCheck.isBot) {
      const reasonText = botCheck.reasons.join('; ');
      const insertedBot = await db.query(
        `INSERT INTO blocked_bots (ip_address, user_agent, reason, score)
         VALUES ($1, $2, $3, $4)
         RETURNING id, ip_address, user_agent, reason, score, timestamp`,
        [ip, userAgent.slice(0, 500), reasonText, botCheck.score]
      );

      const totalBotsRes = await db.query('SELECT COUNT(*)::int AS count FROM blocked_bots');
      broadcast('bot_blocked', {
        bot: insertedBot.rows[0],
        totalBotsBlocked: totalBotsRes.rows[0].count,
      });

      return res.status(202).json({
        status: 'blocked',
        score: botCheck.score,
        reason: reasonText,
      });
    }

    const device = String(body.device || 'Desktop').slice(0, 120);
    const browser = String(body.browser || 'Unknown').slice(0, 120);
    const url = String(body.url || '/').slice(0, 2000);
    const pageTitle = String(body.title || '').slice(0, 500);
    const utmSource = String(body.utm?.utm_source || '').slice(0, 120);
    const utmMedium = String(body.utm?.utm_medium || '').slice(0, 120);
    const utmCampaign = String(body.utm?.utm_campaign || '').slice(0, 120);
    const source = normalizeSource(body.referrer, utmSource);
    const durationSeconds = Math.max(0, Math.min(86400, parseInt(body.durationSeconds || 0, 10) || 0));
    const eventType = body.eventType === 'engagement' ? 'engagement' : 'pageview';

    const existing = await db.query(
      'SELECT * FROM visitors WHERE fingerprint_id = $1 LIMIT 1',
      [fingerprintId]
    );

    let visitor;
    if (existing.rows.length > 0) {
      const current = existing.rows[0];
      const minutesSinceLast = (Date.now() - new Date(current.last_seen).getTime()) / 60000;
      const isNewSession = eventType === 'pageview' && minutesSinceLast >= 30;

      if (eventType === 'engagement') {
        const updated = await db.query(
          `UPDATE visitors
           SET last_seen = NOW(), ip_address = $2, city = $3, country = $4
           WHERE id = $1
           RETURNING *`,
          [current.id, ip, geo.city, geo.country]
        );
        visitor = updated.rows[0];

        await db.query(
          `UPDATE page_views
           SET duration_seconds = GREATEST(duration_seconds, $2)
           WHERE id = (
             SELECT id FROM page_views
             WHERE visitor_id = $1 AND url = $3
             ORDER BY timestamp DESC LIMIT 1
           )`,
          [visitor.id, durationSeconds, url]
        );
      } else {
        const updated = await db.query(
          `UPDATE visitors
           SET last_seen = NOW(),
               ip_address = $2,
               city = $3,
               country = $4,
               device = $5,
               browser = $6,
               total_pages = total_pages + 1,
               total_visits = total_visits + $7,
               is_returning = TRUE
           WHERE id = $1
           RETURNING *`,
          [current.id, ip, geo.city, geo.country, device, browser, isNewSession ? 1 : 0]
        );
        visitor = updated.rows[0];

        await db.query(
          `INSERT INTO page_views (visitor_id, url, page_title, source, utm_source, utm_medium, utm_campaign, duration_seconds)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [visitor.id, url, pageTitle, source, utmSource, utmMedium, utmCampaign, durationSeconds]
        );
      }
    } else {
      const inserted = await db.query(
        `INSERT INTO visitors (fingerprint_id, ip_address, city, country, device, browser, total_visits, total_pages, is_returning)
         VALUES ($1, $2, $3, $4, $5, $6, 1, 1, FALSE)
         RETURNING *`,
        [fingerprintId, ip, geo.city, geo.country, device, browser]
      );
      visitor = inserted.rows[0];

      await db.query(
        `INSERT INTO page_views (visitor_id, url, page_title, source, utm_source, utm_medium, utm_campaign, duration_seconds)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [visitor.id, url, pageTitle, source, utmSource, utmMedium, utmCampaign, durationSeconds]
      );
    }

    if (eventType === 'pageview') {
      broadcast('visitor_activity', {
        visitor: {
          id: visitor.id,
          visitorNumber: visitor.visitor_number,
          fingerprintId: visitor.fingerprint_id,
          ipAddress: visitor.ip_address,
          city: visitor.city,
          country: visitor.country,
          device: visitor.device,
          browser: visitor.browser,
          firstSeen: visitor.first_seen,
          lastSeen: visitor.last_seen,
          totalVisits: visitor.total_visits,
          totalPages: visitor.total_pages,
          isReturning: visitor.is_returning,
        },
        pageView: {
          url,
          pageTitle,
          source,
          timestamp: new Date().toISOString(),
        },
      });
    }

    return res.status(200).json({
      status: 'ok',
      visitorNumber: visitor.visitor_number,
      isReturning: visitor.is_returning,
    });
  } catch (err) {
    console.error('[Track] Error processing tracking event:', err);
    return res.status(500).json({ error: 'Internal tracking error' });
  }
});

module.exports = router;
