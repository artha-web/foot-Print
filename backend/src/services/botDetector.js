const BOT_UA_PATTERNS = [
  /bot\b/i,
  /crawl(er|ing)?/i,
  /spider/i,
  /slurp/i,
  /headlesschrome/i,
  /puppeteer/i,
  /playwright/i,
  /selenium/i,
  /phantomjs/i,
  /scrapy/i,
  /curl\//i,
  /wget\//i,
  /python-requests/i,
  /python-urllib/i,
  /aiohttp/i,
  /axios\//i,
  /node-fetch/i,
  /go-http-client/i,
  /java\//i,
  /libwww-perl/i,
  /ahrefs/i,
  /semrush/i,
  /mj12bot/i,
  /dotbot/i,
  /petalbot/i,
  /bytespider/i,
  /gptbot/i,
  /claudebot/i,
  /ccbot/i,
  /lighthouse/i,
  /gtmetrix/i,
];

const DATACENTER_ISP_PATTERNS = [
  /amazon/i,
  /\baws\b/i,
  /digitalocean/i,
  /hetzner/i,
  /ovh/i,
  /linode/i,
  /akamai connected cloud/i,
  /vultr/i,
  /google cloud/i,
  /microsoft azure/i,
  /oracle cloud/i,
  /choopa/i,
  /contabo/i,
  /scaleway/i,
];

const SUSPICIOUS_WEBGL_RENDERERS = [
  /swiftshader/i,
  /llvmpipe/i,
  /mesa offscreen/i,
  /virtualbox/i,
  /vmware/i,
  /microsoft basic render/i,
];

// Sliding-window IP rate tracker: ip -> array of timestamps (ms)
const ipHitWindow = new Map();
const WINDOW_MS = 10000;
const MAX_HITS_IN_WINDOW = 25;

function checkRateLimit(ip) {
  const now = Date.now();
  const hits = (ipHitWindow.get(ip) || []).filter((ts) => now - ts < WINDOW_MS);
  hits.push(now);
  ipHitWindow.set(ip, hits);

  if (ipHitWindow.size > 10000) {
    const firstKey = ipHitWindow.keys().next().value;
    ipHitWindow.delete(firstKey);
  }

  return hits.length > MAX_HITS_IN_WINDOW;
}

function evaluateBotRisk({ ip, userAgent = '', geo = {}, signals = {}, fingerprintId = '' }) {
  const reasons = [];
  let score = 0;

  if (!userAgent || userAgent.trim().length < 10) {
    score += 45;
    reasons.push('Missing or malformed User-Agent');
  } else {
    for (const pattern of BOT_UA_PATTERNS) {
      if (pattern.test(userAgent)) {
        score += 75;
        reasons.push(`Known bot/automation User-Agent (${pattern.source})`);
        break;
      }
    }
  }

  if (signals.webdriver === true) {
    score += 65;
    reasons.push('navigator.webdriver=true');
  }

  if (signals.webglRenderer) {
    for (const pattern of SUSPICIOUS_WEBGL_RENDERERS) {
      if (pattern.test(signals.webglRenderer)) {
        score += 40;
        reasons.push(`Headless WebGL renderer (${signals.webglRenderer})`);
        break;
      }
    }
  }

  if (signals.isDesktop && signals.pluginCount === 0 && /chrome|firefox/i.test(userAgent)) {
    score += 25;
    reasons.push('Desktop browser reports 0 plugins');
  }

  if (signals.chromeObjectMissing === true && /chrome/i.test(userAgent) && !/edg|opr/i.test(userAgent)) {
    score += 30;
    reasons.push('Chrome UA missing window.chrome runtime');
  }

  if (signals.languagesEmpty === true) {
    score += 25;
    reasons.push('Empty navigator.languages');
  }

  if (signals.eventType === 'engagement' && signals.entropyScore === 0) {
    score += 20;
    reasons.push('Zero pointer/scroll/touch entropy');
  }

  if (geo.isHosting) {
    score += 40;
    reasons.push('Datacenter/Hosting IP range');
  } else if (geo.isp) {
    for (const pattern of DATACENTER_ISP_PATTERNS) {
      if (pattern.test(geo.isp)) {
        score += 35;
        reasons.push(`Datacenter ASN/ISP (${geo.isp})`);
        break;
      }
    }
  }

  if (checkRateLimit(ip)) {
    score += 55;
    reasons.push(`High request burst (> ${MAX_HITS_IN_WINDOW} req / 10s)`);
  }

  if (!fingerprintId || fingerprintId.length < 6) {
    score += 35;
    reasons.push('Missing valid digital fingerprint');
  }

  const threshold = Number(process.env.BOT_SCORE_THRESHOLD || 50);
  const clampedScore = Math.min(100, score);

  return {
    isBot: clampedScore >= threshold,
    score: clampedScore,
    reasons: reasons.length ? reasons : ['Clean human heuristics'],
  };
}

module.exports = {
  evaluateBotRisk,
};
