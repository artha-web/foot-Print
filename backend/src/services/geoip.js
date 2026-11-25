const geoCache = new Map();
const CACHE_TTL_MS = 1000 * 60 * 60 * 6; // 6 hours

function extractClientIp(req) {
  const cfIp = req.headers['cf-connecting-ip'];
  if (cfIp && typeof cfIp === 'string') {
    return cfIp.trim();
  }

  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded && typeof forwarded === 'string') {
    const firstHop = forwarded.split(',')[0].trim();
    if (firstHop) return firstHop;
  }

  const realIp = req.headers['x-real-ip'];
  if (realIp && typeof realIp === 'string') {
    return realIp.trim();
  }

  const raw = req.socket?.remoteAddress || req.ip || '127.0.0.1';
  return raw.replace(/^::ffff:/, '');
}

function isPrivateOrLocalIp(ip) {
  if (!ip) return true;
  if (ip === '127.0.0.1' || ip === '::1' || ip === 'localhost') return true;
  if (ip.startsWith('10.') || ip.startsWith('192.168.') || ip.startsWith('169.254.')) return true;
  const parts = ip.split('.');
  if (parts.length === 4 && parts[0] === '172') {
    const second = parseInt(parts[1], 10);
    if (second >= 16 && second <= 31) return true;
  }
  return false;
}

async function resolveGeoIp(ip) {
  if (isPrivateOrLocalIp(ip)) {
    return {
      ip,
      city: 'Localhost',
      country: 'Development',
      isp: 'Local Loopback',
      isHosting: false,
    };
  }

  const cached = geoCache.get(ip);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return cached.data;
  }

  const token = process.env.IPINFO_TOKEN;
  let result = {
    ip,
    city: 'Unknown',
    country: 'Unknown',
    isp: '',
    isHosting: false,
  };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);

    if (token) {
      const resp = await fetch(`https://ipinfo.io/${encodeURIComponent(ip)}?token=${encodeURIComponent(token)}`, {
        signal: controller.signal,
      });
      if (resp.ok) {
        const json = await resp.json();
        result = {
          ip,
          city: json.city || 'Unknown',
          country: json.country || 'Unknown',
          isp: json.org || '',
          isHosting: false,
        };
      }
    } else {
      // ip-api.com free JSON endpoint with hosting/proxy flags
      const resp = await fetch(
        `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,country,city,isp,org,as,hosting,proxy`,
        { signal: controller.signal }
      );
      if (resp.ok) {
        const json = await resp.json();
        if (json.status === 'success') {
          result = {
            ip,
            city: json.city || 'Unknown',
            country: json.country || 'Unknown',
            isp: json.org || json.isp || json.as || '',
            isHosting: Boolean(json.hosting || json.proxy),
          };
        }
      }
    }
    clearTimeout(timeout);
  } catch {
    // Graceful fallback when upstream GeoIP times out or is unreachable
  }

  if (geoCache.size > 5000) {
    const oldestKey = geoCache.keys().next().value;
    geoCache.delete(oldestKey);
  }
  geoCache.set(ip, { ts: Date.now(), data: result });
  return result;
}

module.exports = {
  extractClientIp,
  resolveGeoIp,
};
