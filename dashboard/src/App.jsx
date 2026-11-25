import React, { useCallback, useEffect, useState } from 'react';
import { ShieldCheck, Wifi, WifiOff } from 'lucide-react';
import { useTrafficSocket } from './hooks/useTrafficSocket';
import { HeaderStats } from './components/HeaderStats';
import { LiveTrafficFeed } from './components/LiveTrafficFeed';
import { VisitorTable } from './components/VisitorTable';
import { VisitorKundliDrawer } from './components/VisitorKundliDrawer';
import { EmbedCodeGenerator } from './components/EmbedCodeGenerator';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';
const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:4000/ws';

export default function App() {
  const [stats, setStats] = useState({
    liveActiveVisitors: 0,
    totalHumanVisitors: 0,
    returningVisitors: 0,
    returningRate: 0,
    totalBotsBlocked: 0,
  });
  const [liveFeed, setLiveFeed] = useState([]);
  const [blockedBots, setBlockedBots] = useState([]);
  const [visitorsData, setVisitorsData] = useState({
    visitors: [],
    total: 0,
    page: 1,
    totalPages: 1,
    filters: { cities: [], sources: [] },
  });
  const [filters, setFilters] = useState({
    type: 'all',
    city: '',
    source: '',
    search: '',
    page: 1,
  });
  const [selectedKundli, setSelectedKundli] = useState(null);
  const [kundliLoading, setKundliLoading] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/stats`);
      if (!res.ok) return;
      const data = await res.json();
      setStats(data);
      setBlockedBots(data.recentBlockedBots || []);
    } catch {
      // Handled gracefully when API is offline
    }
  }, []);

  const fetchVisitors = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        page: String(filters.page),
        limit: '15',
        type: filters.type,
      });
      if (filters.city) params.set('city', filters.city);
      if (filters.source) params.set('source', filters.source);
      if (filters.search) params.set('search', filters.search);

      const res = await fetch(`${API_BASE}/api/visitors?${params.toString()}`);
      if (!res.ok) return;
      const data = await res.json();
      setVisitorsData(data);
    } catch {
      // Handled gracefully
    }
  }, [filters]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchVisitors();
  }, [fetchVisitors]);

  const wsStatus = useTrafficSocket(WS_URL, {
    onVisitorActivity: (payload) => {
      setLiveFeed((prev) => [payload, ...prev].slice(0, 30));
      fetchStats();
      fetchVisitors();
    },
    onBotBlocked: (payload) => {
      if (payload?.bot) {
        setBlockedBots((prev) => [payload.bot, ...prev].slice(0, 20));
      }
      setStats((prev) => ({
        ...prev,
        totalBotsBlocked: payload?.totalBotsBlocked ?? prev.totalBotsBlocked + 1,
      }));
    },
  });

  async function handleSelectVisitor(fingerprintId) {
    setKundliLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/visitors/${encodeURIComponent(fingerprintId)}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedKundli(data);
      }
    } finally {
      setKundliLoading(false);
    }
  }

  function handleFilterChange(patch) {
    setFilters((prev) => ({ ...prev, ...patch, page: 1 }));
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-slate-950/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 border border-emerald-500/30">
              <ShieldCheck className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-slate-50">VisitorPulse</h1>
              <p className="text-[11px] text-slate-400">
                Real-Time Fingerprinting &amp; Bot Intelligence
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-300">
              Bots Blocked: <span className="font-mono">{stats.totalBotsBlocked}</span>
            </div>
            <div
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${
                wsStatus === 'connected'
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                  : 'border-amber-500/30 bg-amber-500/10 text-amber-300'
              }`}
            >
              {wsStatus === 'connected' ? (
                <Wifi className="h-3.5 w-3.5" />
              ) : (
                <WifiOff className="h-3.5 w-3.5" />
              )}
              {wsStatus === 'connected' ? 'Live' : 'Reconnecting'}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
        <HeaderStats stats={stats} />

        <LiveTrafficFeed
          liveFeed={liveFeed}
          blockedBots={blockedBots}
          onSelectVisitor={handleSelectVisitor}
        />

        <VisitorTable
          visitors={visitorsData.visitors}
          total={visitorsData.total}
          page={visitorsData.page}
          totalPages={visitorsData.totalPages}
          filters={filters}
          availableFilters={visitorsData.filters}
          onFilterChange={handleFilterChange}
          onPageChange={(page) => setFilters((prev) => ({ ...prev, page }))}
          onSelectVisitor={handleSelectVisitor}
        />

        <EmbedCodeGenerator defaultApiUrl={API_BASE} />
      </main>

      <VisitorKundliDrawer
        data={selectedKundli}
        loading={kundliLoading}
        onClose={() => setSelectedKundli(null)}
      />
    </div>
  );
}
