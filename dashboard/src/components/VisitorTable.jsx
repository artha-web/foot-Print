import React from 'react';
import { Search, Filter, ChevronLeft, ChevronRight, Fingerprint } from 'lucide-react';

function timeAgo(iso) {
  if (!iso) return '-';
  const sec = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
}

export function VisitorTable({
  visitors,
  total,
  page,
  totalPages,
  filters,
  availableFilters,
  onFilterChange,
  onPageChange,
  onSelectVisitor,
}) {
  return (
    <div className="rounded-2xl border border-slate-800/80 bg-slate-900/70 p-5 shadow-lg">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-100">Visitor Profiles</h2>
          <p className="text-xs text-slate-400">
            Click any row to open the visitor&apos;s full Kundli &amp; 7-day activity timeline.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => onFilterChange({ search: e.target.value })}
              placeholder="Search #ID, hash, IP, city..."
              className="w-48 rounded-lg border border-slate-800 bg-slate-950 py-1.5 pl-8 pr-3 text-xs text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div className="inline-flex rounded-lg border border-slate-800 bg-slate-950 p-0.5 text-xs">
            {['all', 'returning', 'new'].map((t) => (
              <button
                key={t}
                onClick={() => onFilterChange({ type: t })}
                className={`rounded-md px-2.5 py-1 capitalize transition ${
                  filters.type === t
                    ? 'bg-emerald-500/20 text-emerald-300 font-medium'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <select
            value={filters.city}
            onChange={(e) => onFilterChange({ city: e.target.value })}
            className="rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none"
          >
            <option value="">All Cities</option>
            {(availableFilters.cities || []).map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            value={filters.source}
            onChange={(e) => onFilterChange({ source: e.target.value })}
            className="rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none"
          >
            <option value="">All Sources</option>
            {(availableFilters.sources || []).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400">
              <th className="py-3 px-3">Visitor</th>
              <th className="py-3 px-3">Fingerprint</th>
              <th className="py-3 px-3">Location &amp; IP</th>
              <th className="py-3 px-3">Device / Browser</th>
              <th className="py-3 px-3">Source</th>
              <th className="py-3 px-3 text-right">Pages</th>
              <th className="py-3 px-3 text-right">Last Seen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {visitors.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-10 text-center text-slate-500">
                  <Filter className="mx-auto mb-2 h-5 w-5 text-slate-600" />
                  No matching visitor profiles found.
                </td>
              </tr>
            ) : (
              visitors.map((v) => (
                <tr
                  key={v.fingerprintId}
                  onClick={() => onSelectVisitor(v.fingerprintId)}
                  className="cursor-pointer transition hover:bg-slate-800/40"
                >
                  <td className="py-3 px-3 font-medium text-slate-100">
                    <div className="flex items-center gap-2">
                      <span>Visitor #{v.visitorNumber}</span>
                      {v.isReturning ? (
                        <span className="rounded-full bg-violet-500/15 px-2 py-0.5 text-[10px] font-medium text-violet-300 border border-violet-500/30">
                          Returning
                        </span>
                      ) : (
                        <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-300 border border-emerald-500/30">
                          New
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-3 font-mono text-emerald-400">
                    <span className="inline-flex items-center gap-1">
                      <Fingerprint className="h-3.5 w-3.5" />
                      {v.fingerprintId}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-slate-300">
                    <div>{v.city}, {v.country}</div>
                    <div className="font-mono text-[11px] text-slate-500">{v.ipAddress}</div>
                  </td>
                  <td className="py-3 px-3 text-slate-300">
                    <div>{v.device}</div>
                    <div className="text-[11px] text-slate-500">{v.browser}</div>
                  </td>
                  <td className="py-3 px-3">
                    <span className="rounded-md bg-sky-500/10 px-2 py-0.5 font-medium text-sky-300 border border-sky-500/20">
                      {v.lastSource || 'Direct'}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-slate-200">{v.totalPages}</td>
                  <td className="py-3 px-3 text-right text-slate-400">{timeAgo(v.lastSeen)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-slate-800/80 pt-3 text-xs text-slate-400">
        <span>
          Showing {visitors.length} of {total} profiles
        </span>
        <div className="flex items-center gap-2">
          <button
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-800 px-2.5 py-1 hover:bg-slate-800 disabled:opacity-40"
          >
            <ChevronLeft className="h-3.5 w-3.5" /> Prev
          </button>
          <span className="font-mono text-slate-300">
            {page} / {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-800 px-2.5 py-1 hover:bg-slate-800 disabled:opacity-40"
          >
            Next <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
