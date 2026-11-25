import React from 'react';
import { X, Fingerprint, MapPin, Monitor, Clock, Globe, Layers } from 'lucide-react';

function relativeTime(iso) {
  if (!iso) return '-';
  const sec = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
}

export function VisitorKundliDrawer({ data, loading, onClose }) {
  if (!data && !loading) return null;

  const visitor = data?.visitor;
  const isLive =
    visitor && Date.now() - new Date(visitor.lastSeen).getTime() < 5 * 60 * 1000;
  const maxDayCount = Math.max(1, ...(data?.weeklyActivity || []).map((d) => d.count));

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/70 backdrop-blur-sm">
      <div className="h-full w-full max-w-xl overflow-y-auto border-l border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h3 className="text-lg font-bold text-slate-50">
                {visitor ? `Visitor #${visitor.visitorNumber}` : 'Loading Kundli...'}
              </h3>
              {isLive && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[11px] font-bold text-emerald-300 border border-emerald-500/30">
                  <span className="h-1.5 w-1.5 animate-ping rounded-full bg-emerald-400" />
                  LIVE
                </span>
              )}
              {visitor && (
                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-300">
                  Human
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Complete Visitor Kundli &amp; Returning Activity Timeline
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-800 p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {loading ? (
          <div className="py-16 text-center text-sm text-slate-400">
            Loading visitor fingerprint history...
          </div>
        ) : (
          visitor && (
            <div className="mt-5 space-y-6">
              {/* Identity Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5">
                  <div className="flex items-center gap-1.5 text-[11px] uppercase text-slate-400">
                    <Fingerprint className="h-3.5 w-3.5 text-emerald-400" />
                    Fingerprint Hash
                  </div>
                  <div className="mt-1 font-mono text-sm font-semibold text-emerald-300">
                    {visitor.fingerprintId}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5">
                  <div className="flex items-center gap-1.5 text-[11px] uppercase text-slate-400">
                    <MapPin className="h-3.5 w-3.5 text-sky-400" />
                    Location &amp; IP
                  </div>
                  <div className="mt-1 text-sm font-medium text-slate-100">
                    {visitor.city}, {visitor.country}
                  </div>
                  <div className="font-mono text-[11px] text-slate-500">{visitor.ipAddress}</div>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5">
                  <div className="flex items-center gap-1.5 text-[11px] uppercase text-slate-400">
                    <Monitor className="h-3.5 w-3.5 text-violet-400" />
                    Device &amp; Browser
                  </div>
                  <div className="mt-1 text-sm font-medium text-slate-100">{visitor.device}</div>
                  <div className="text-[11px] text-slate-400">{visitor.browser}</div>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5">
                  <div className="flex items-center gap-1.5 text-[11px] uppercase text-slate-400">
                    <Clock className="h-3.5 w-3.5 text-amber-400" />
                    Engagement
                  </div>
                  <div className="mt-1 text-sm font-semibold text-slate-100">
                    {visitor.totalPages} pages · {visitor.totalVisits} visits
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Last seen {relativeTime(visitor.lastSeen)}
                  </div>
                </div>
              </div>

              {/* 7-Day Activity Strip (Mon-Sun) */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                    7-Day Activity Strip (Mon–Sun)
                  </span>
                  <span className="text-[11px] text-slate-500">Page views per day</span>
                </div>
                <div className="grid grid-cols-7 gap-2">
                  {(data.weeklyActivity || []).map((day) => {
                    const intensity = day.count / maxDayCount;
                    const bgClass =
                      day.count === 0
                        ? 'bg-slate-900 border-slate-800 text-slate-500'
                        : intensity > 0.66
                        ? 'bg-emerald-500/35 border-emerald-400/50 text-emerald-100'
                        : intensity > 0.33
                        ? 'bg-emerald-500/20 border-emerald-500/35 text-emerald-200'
                        : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300';
                    return (
                      <div
                        key={day.day}
                        className={`flex flex-col items-center justify-center rounded-lg border py-2.5 ${bgClass}`}
                      >
                        <span className="text-[10px] font-medium uppercase">{day.day}</span>
                        <span className="mt-1 font-mono text-sm font-bold">{day.count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Traffic Sources */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                <div className="mb-2.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-300">
                  <Globe className="h-3.5 w-3.5 text-sky-400" />
                  Traffic Sources
                </div>
                <div className="flex flex-wrap gap-2">
                  {(data.trafficSources || []).map((src) => (
                    <span
                      key={src.source}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-sky-500/25 bg-sky-500/10 px-2.5 py-1 text-xs font-medium text-sky-300"
                    >
                      {src.source}
                      <span className="rounded bg-sky-500/20 px-1.5 py-0.2 font-mono text-[10px]">
                        {src.count}
                      </span>
                    </span>
                  ))}
                </div>
              </div>

              {/* Page View Timeline */}
              <div>
                <div className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-300">
                  <Layers className="h-3.5 w-3.5 text-emerald-400" />
                  Page View Timeline
                </div>
                <div className="space-y-2.5">
                  {(data.pageViews || []).map((pv) => (
                    <div
                      key={pv.id}
                      className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-xs font-medium text-slate-100">
                          {pv.pageTitle || pv.url}
                        </span>
                        <span className="shrink-0 text-[11px] text-slate-500">
                          {relativeTime(pv.timestamp)}
                        </span>
                      </div>
                      <p className="mt-1 truncate font-mono text-[11px] text-slate-400">{pv.url}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-slate-400">
                        <span className="rounded bg-slate-800 px-1.5 py-0.5 text-sky-300">
                          Source: {pv.source}
                        </span>
                        {pv.durationSeconds > 0 && (
                          <span className="rounded bg-slate-800 px-1.5 py-0.5">
                            Time on page: {pv.durationSeconds}s
                          </span>
                        )}
                        {pv.utmCampaign && (
                          <span className="rounded bg-slate-800 px-1.5 py-0.5 text-violet-300">
                            Campaign: {pv.utmCampaign}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}
