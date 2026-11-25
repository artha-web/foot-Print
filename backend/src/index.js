require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const http = require('http');
const path = require('path');
const express = require('express');
const { trackingCors, adminCors } = require('./middleware/cors');
const { initWebSocketServer } = require('./ws/broadcaster');
const trackRouter = require('./routes/track');
const visitorsRouter = require('./routes/visitors');
const statsRouter = require('./routes/stats');

const app = express();
app.set('trust proxy', true);

// Parse JSON and text/plain payloads (navigator.sendBeacon often sends text/plain or application/json)
app.use(express.json({ limit: '64kb' }));
app.use(express.text({ type: 'text/plain', limit: '64kb' }));

// Serve tracker.js across any customer domain
app.get('/tracker.js', (_req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.type('application/javascript');
  res.sendFile(path.resolve(__dirname, '../../tracker/tracker.js'));
});

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'visitor-pulse-api', timestamp: new Date().toISOString() });
});

// Public cross-domain tracking endpoint
app.options('/api/track', trackingCors);
app.use('/api/track', trackingCors, trackRouter);

// Admin dashboard endpoints
app.use('/api/visitors', adminCors, visitorsRouter);
app.use('/api/stats', adminCors, statsRouter);

const PORT = Number(process.env.PORT || 4000);
const server = http.createServer(app);
initWebSocketServer(server);

server.listen(PORT, () => {
  console.log(`[VisitorPulse] API + WebSocket server listening on http://localhost:${PORT}`);
});
