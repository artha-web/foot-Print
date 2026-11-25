(function (window, document) {
  'use strict';

  var currentScript =
    document.currentScript ||
    (function () {
      var scripts = document.getElementsByTagName('script');
      for (var i = scripts.length - 1; i >= 0; i--) {
        if (scripts[i].src && scripts[i].src.indexOf('tracker.js') !== -1) {
          return scripts[i];
        }
      }
      return null;
    })();

  var apiBase = '';
  if (currentScript) {
    var explicitApi = currentScript.getAttribute('data-api');
    if (explicitApi) {
      apiBase = explicitApi.replace(/\/+$/, '');
    } else if (currentScript.src) {
      try {
        apiBase = new URL(currentScript.src).origin;
      } catch (e) {
        apiBase = '';
      }
    }
  }
  var TRACK_ENDPOINT = (apiBase || '') + '/api/track';

  var pageEnteredAt = Date.now();
  var lastTrackedUrl = window.location.href;
  var entropyScore = 0;
  var engagementSent = false;

  function recordEntropy() {
    if (entropyScore < 100) entropyScore += 1;
  }

  ['mousemove', 'scroll', 'touchstart', 'keydown', 'click'].forEach(function (evt) {
    window.addEventListener(evt, recordEntropy, { passive: true, once: false });
  });

  // Fast 64-bit FNV-1a style hash -> 12-char stable hex ID
  function hashString(str) {
    var h1 = 0x811c9dc5;
    var h2 = 0x01000193;
    for (var i = 0; i < str.length; i++) {
      var c = str.charCodeAt(i);
      h1 ^= c;
      h1 = Math.imul(h1, 0x01000193);
      h2 ^= c + (i & 255);
      h2 = Math.imul(h2, 0x85ebca6b);
    }
    var hex1 = (h1 >>> 0).toString(16).padStart(8, '0');
    var hex2 = (h2 >>> 0).toString(16).padStart(8, '0');
    return (hex1 + hex2).slice(0, 12);
  }

  function getCanvasFingerprint() {
    try {
      var canvas = document.createElement('canvas');
      canvas.width = 220;
      canvas.height = 40;
      var ctx = canvas.getContext('2d');
      if (!ctx) return 'no-canvas';
      ctx.textBaseline = 'top';
      ctx.font = '14px "Arial"';
      ctx.fillStyle = '#f60';
      ctx.fillRect(10, 2, 62, 20);
      ctx.fillStyle = '#069';
      ctx.fillText('VisitorPulse#91', 2, 15);
      ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
      ctx.fillText('VisitorPulse#91', 4, 17);
      return hashString(canvas.toDataURL());
    } catch (e) {
      return 'canvas-err';
    }
  }

  function getWebGLInfo() {
    try {
      var canvas = document.createElement('canvas');
      var gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) return { vendor: 'none', renderer: 'none', hash: 'no-webgl' };
      var dbg = gl.getExtension('WEBGL_debug_renderer_info');
      var vendor = dbg ? gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR);
      var renderer = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
      var exts = (gl.getSupportedExtensions() || []).slice(0, 12).join(',');
      return {
        vendor: String(vendor || ''),
        renderer: String(renderer || ''),
        hash: hashString(vendor + '|' + renderer + '|' + exts),
      };
    } catch (e) {
      return { vendor: 'err', renderer: 'err', hash: 'webgl-err' };
    }
  }

  function getAudioFingerprint() {
    try {
      var AudioCtx = window.OfflineAudioContext || window.webkitOfflineAudioContext;
      if (!AudioCtx) return Promise.resolve('no-audio');
      var ctx = new AudioCtx(1, 44100, 44100);
      var osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(10000, ctx.currentTime);
      var comp = ctx.createDynamicsCompressor();
      comp.threshold.setValueAtTime(-50, ctx.currentTime);
      comp.knee.setValueAtTime(40, ctx.currentTime);
      comp.ratio.setValueAtTime(12, ctx.currentTime);
      comp.attack.setValueAtTime(0, ctx.currentTime);
      comp.release.setValueAtTime(0.25, ctx.currentTime);
      osc.connect(comp);
      comp.connect(ctx.destination);
      osc.start(0);
      return ctx
        .startRendering()
        .then(function (buffer) {
          var data = buffer.getChannelData(0);
          var sum = 0;
          for (var i = 4500; i < 5000; i++) {
            sum += Math.abs(data[i]);
          }
          return sum.toFixed(6);
        })
        .catch(function () {
          return 'audio-err';
        });
    } catch (e) {
      return Promise.resolve('audio-err');
    }
  }

  function getInstalledFontsSignature() {
    try {
      var baseFonts = ['monospace', 'sans-serif', 'serif'];
      var testFonts = [
        'Arial',
        'Helvetica Neue',
        'Times New Roman',
        'Courier New',
        'Georgia',
        'Verdana',
        'Trebuchet MS',
        'Segoe UI',
        'Roboto',
        'SF Pro Display',
        'Ubuntu',
      ];
      var canvas = document.createElement('canvas');
      var ctx = canvas.getContext('2d');
      if (!ctx) return 'no-fonts';
      var sample = 'mmmmmmmmmmlli';
      var baseWidths = {};
      baseFonts.forEach(function (bf) {
        ctx.font = '72px ' + bf;
        baseWidths[bf] = ctx.measureText(sample).width;
      });
      var detected = [];
      testFonts.forEach(function (font) {
        for (var i = 0; i < baseFonts.length; i++) {
          ctx.font = '72px "' + font + '",' + baseFonts[i];
          if (ctx.measureText(sample).width !== baseWidths[baseFonts[i]]) {
            detected.push(font);
            break;
          }
        }
      });
      return detected.join(',');
    } catch (e) {
      return 'font-err';
    }
  }

  function parseDeviceAndBrowser() {
    var ua = navigator.userAgent || '';
    var os = 'Unknown OS';
    var deviceType = 'Desktop';

    if (/iPhone/i.test(ua)) {
      os = 'iOS';
      deviceType = 'iPhone';
    } else if (/iPad/i.test(ua)) {
      os = 'iPadOS';
      deviceType = 'iPad';
    } else if (/Android/i.test(ua)) {
      os = 'Android';
      deviceType = /Mobile/i.test(ua) ? 'Android Phone' : 'Android Tablet';
    } else if (/Mac OS X/i.test(ua)) {
      os = 'macOS';
      deviceType = 'Mac';
    } else if (/Windows NT/i.test(ua)) {
      os = 'Windows';
      deviceType = 'Windows PC';
    } else if (/Linux/i.test(ua)) {
      os = 'Linux';
      deviceType = 'Linux PC';
    }

    var browser = 'Unknown';
    var m;
    if ((m = ua.match(/Edg\/([\d.]+)/))) browser = 'Edge ' + m[1].split('.')[0];
    else if ((m = ua.match(/OPR\/([\d.]+)/))) browser = 'Opera ' + m[1].split('.')[0];
    else if ((m = ua.match(/Chrome\/([\d.]+)/)) && !/Edg|OPR/.test(ua)) browser = 'Chrome ' + m[1].split('.')[0];
    else if ((m = ua.match(/Firefox\/([\d.]+)/))) browser = 'Firefox ' + m[1].split('.')[0];
    else if ((m = ua.match(/Version\/([\d.]+).*Safari/))) browser = 'Safari ' + m[1].split('.')[0];

    return {
      device: deviceType + ' · ' + os,
      browser: browser + ' (' + window.innerWidth + 'x' + window.innerHeight + ')',
      isDesktop: deviceType === 'Mac' || deviceType === 'Windows PC' || deviceType === 'Linux PC',
    };
  }

  function getUtmParams() {
    var params = new URLSearchParams(window.location.search);
    return {
      utm_source: params.get('utm_source') || '',
      utm_medium: params.get('utm_medium') || '',
      utm_campaign: params.get('utm_campaign') || '',
    };
  }

  function sendPayload(payload) {
    var json = JSON.stringify(payload);
    if (navigator.sendBeacon) {
      try {
        var blob = new Blob([json], { type: 'application/json' });
        if (navigator.sendBeacon(TRACK_ENDPOINT, blob)) {
          return;
        }
      } catch (e) {
        // Fallback to fetch below
      }
    }

    if (window.fetch) {
      fetch(TRACK_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: json,
        keepalive: true,
        mode: 'cors',
      }).catch(function () {});
    }
  }

  var cachedFingerprint = null;
  var cachedWebGL = null;

  function buildFingerprint() {
    if (cachedFingerprint) return Promise.resolve(cachedFingerprint);
    cachedWebGL = getWebGLInfo();
    var canvasHash = getCanvasFingerprint();
    var fonts = getInstalledFontsSignature();
    var tz = '';
    try {
      tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    } catch (e) {}

    return getAudioFingerprint().then(function (audioSig) {
      var raw = [
        canvasHash,
        cachedWebGL.hash,
        audioSig,
        fonts,
        screen.width + 'x' + screen.height + 'x' + (screen.colorDepth || 24),
        tz,
        navigator.language || '',
        navigator.hardwareConcurrency || '',
        navigator.deviceMemory || '',
        navigator.platform || '',
      ].join('||');
      cachedFingerprint = hashString(raw);
      return cachedFingerprint;
    });
  }

  function trackEvent(eventType) {
    var info = parseDeviceAndBrowser();
    buildFingerprint().then(function (fingerprintId) {
      var durationSeconds = Math.max(0, Math.round((Date.now() - pageEnteredAt) / 1000));
      var ua = navigator.userAgent || '';
      var isChromeUA = /Chrome\//.test(ua) && !/Edg|OPR/.test(ua);

      sendPayload({
        eventType: eventType,
        fingerprintId: fingerprintId,
        url: window.location.href,
        title: document.title || '',
        referrer: document.referrer || '',
        utm: getUtmParams(),
        device: info.device,
        browser: info.browser,
        durationSeconds: durationSeconds,
        botSignals: {
          webdriver: Boolean(navigator.webdriver),
          pluginCount: navigator.plugins ? navigator.plugins.length : 0,
          isDesktop: info.isDesktop,
          webglRenderer: cachedWebGL ? cachedWebGL.renderer : '',
          chromeObjectMissing: isChromeUA && !window.chrome,
          languagesEmpty: !navigator.languages || navigator.languages.length === 0,
          entropyScore: entropyScore,
        },
      });
    });
  }

  function handleEngagementFlush() {
    if (engagementSent) return;
    engagementSent = true;
    trackEvent('engagement');
  }

  // Initial pageview
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      trackEvent('pageview');
    });
  } else {
    trackEvent('pageview');
  }

  // Time-on-page and entropy flush
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') {
      handleEngagementFlush();
    }
  });
  window.addEventListener('pagehide', handleEngagementFlush);

  // SPA navigation support
  var origPushState = history.pushState;
  history.pushState = function () {
    origPushState.apply(this, arguments);
    if (window.location.href !== lastTrackedUrl) {
      lastTrackedUrl = window.location.href;
      pageEnteredAt = Date.now();
      engagementSent = false;
      trackEvent('pageview');
    }
  };
  window.addEventListener('popstate', function () {
    if (window.location.href !== lastTrackedUrl) {
      lastTrackedUrl = window.location.href;
      pageEnteredAt = Date.now();
      engagementSent = false;
      trackEvent('pageview');
    }
  });
})(window, document);
