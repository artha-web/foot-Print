import React from 'react';
import { Radio, Globe, Monitor, ArrowUpRight, ShieldX } from 'lucide-react';

function formatRelative(iso) {
  if (!iso) return 'just now';
  const diffSec = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (diffSec < 10) return 'just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  return `${Math.floor(diffSec / 3600)}h ago`;
}

export function LiveTrafficFeed({ liveFeed, blockedBots, onSelectVisitor }) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* Live Human Stream */}
      <div className="lg:col-span-2 rounded-2xl border border-slate-800/80 bg-slate-900/70 p-5 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
            </span>
            <h2 className="text-base font-semibold text-slate-100">Live Traffic Feed</h2>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-300">
            <Radio className="h-3 w-3" />
            WebSocket Live
          </span>
        </div>

        {liveFeed.length === 0 ? (
          <div className="flex h-56 flex-col items-center justify-center rounded-xl border border-dashed border-slate-800 bg-slate-950/40 text-center">
            <Globe className="h-8 w-8 text-slate-600" />
            <p className="mt-2 text-sm font-medium text-slate-400">Waiting for incoming visitors...</p>
            <p className="mt-1 text-xs text-slate-500">
              Embed <code className="text-emerald-400">tracker.js</code> on any page to see live arrivals.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
            {liveFeed.map((item, idx) => (
              <button
                key={`${item.visitor.fingerprintId}-${idx}`}
                onClick={() => onSelectVisitor(item.visitor.fingerprintId)}
                className="group flex w-full items-center justify-between rounded-xl border border-slate-800/80 bg-slate-950/60 px-4 py-3 text-left transition hover:border-emerald-500/40 hover:bg-slate-900"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 font-mono text-xs font-bold border border-emerald-500/20">
                    #{item.visitor.visitorNumber}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-slate-100 text-sm">
                        Visitor #{item.visitor.visitorNumber} · {item.visitor.city}
                      </span>
                      <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-300 border border-emerald-500/30">
                        Human
                      </span>
                      {item.visitor.isReturning && (
                        <span className="inline-flex items-center rounded-full bg-violet-500/15 px-2 py-0.5 text-[11px] font-medium text-violet-300 border border-violet-500/30">
                          Returning
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                      <span className="inline-flex items-center gap-1 truncate max-w-[260px]">
                        <Monitor className="h-3 w-3 text-slate-500" />
                        {item.visitor.device} · {item.visitor.browser}
                      </span>
                      <span className="truncate max-w-[220px] text-slate-500">
                        {item.pageView?.url}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-3">
                  <div className="text-right">
                    <span className="block text-xs font-medium text-sky-400">
                      {item.pageView?.source || 'Direct'}
                    </span>
                    <span className="block text-[11px] text-slate-500">
                      {formatRelative(item.pageView?.timestamp || item.visitor.lastSeen)}
                    </span>
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-slate-600 transition group-hover:text-emerald-400" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Bot Shield Log */}
      <div className="rounded-2xl border border-slate-800/80 bg-slate-900/70 p-5 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-100">Bot & Scraper Shield</h2>
          <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/30 bg-rose-500/10 px-2.5 py-0.5 text-xs font-semibold text-rose-300">
            <ShieldX className="h-3.5 w-3.5" />
            Filtered
          </span>
        </div>

        {blockedBots.length === 0 ? (
          <div className="flex h-56 flex-col items-center justify-center rounded-xl border border-dashed border-slate-800 bg-slate-950/40 text-center px-4">
            <ShieldX className="h-7 w-7 text-slate-600" />
            <p className="mt-2 text-sm text-slate-400">No blocked bots yet</p>
            <p className="mt-1 text-xs text-slate-500">
              Headless browsers, curl, and datacenter scrapers will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
            {blockedBots.map((bot, idx) => (
              <div
                key={`${bot.id || bot.ipAddress}-${idx}`}
                className="rounded-xl border border-rose-500/20 bg-rose-950/20 p-3"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-semibold text-rose-300">
                    {bot.ipAddress}
                  </span>
                  <span className="rounded bg-rose-500/20 px-1.5 py-0.5 font-mono text-[10px] font-bold text-rose-300">
                    Score {bot.score}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-300 line-clamp-2">{bot.reason}</p>
                <p className="mt-1 font-mono text-[10px] text-slate-500 truncate">
                  {bot.userAgent || 'No User-Agent'}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
