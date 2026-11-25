# VisitorPulse — Real-Time Visitor Tracking, Digital Fingerprinting & Bot-Filtering System

## Folder Structure

```text
visitor-pulse/
├── .env.example
├── README.md
├── database/
│   └── schema.sql
├── backend/
│   ├── package.json
│   └── src/
│       ├── index.js
│       ├── config/
│       │   └── db.js
│       ├── middleware/
│       │   └── cors.js
│       ├── services/
│       │   ├── geoip.js
│       │   └── botDetector.js
│       ├── routes/
│       │   ├── track.js
│       │   ├── visitors.js
│       │   └── stats.js
│       └── ws/
│           └── broadcaster.js
├── tracker/
│   └── tracker.js
└── dashboard/
    ├── package.json
    ├── index.html
    ├── vite.config.js
    ├── tailwind.config.js
    ├── postcss.config.js
    └── src/
        ├── main.jsx
        ├── index.css
        ├── App.jsx
        ├── hooks/
        │   └── useTrafficSocket.js
        └── components/
            ├── HeaderStats.jsx
            ├── LiveTrafficFeed.jsx
            ├── VisitorTable.jsx
            ├── VisitorKundliDrawer.jsx
            └── EmbedCodeGenerator.jsx
```

## Local Setup & Run Commands

### 1. Configure Environment & PostgreSQL
```bash
cp .env.example .env
createdb visitor_pulse
psql -d visitor_pulse -f database/schema.sql
```

### 2. Start Backend API + WebSocket Server
```bash
cd backend
npm install
npm run dev
```
The API + WebSocket server runs on `http://localhost:4000` (and serves `http://localhost:4000/tracker.js`).

### 3. Start Admin Dashboard
```bash
cd dashboard
npm install
npm run dev
```
The React + Tailwind dashboard runs on `http://localhost:5173`.

### 4. Embed on Any Website
```html
<script src="http://localhost:4000/tracker.js" async></script>
```
