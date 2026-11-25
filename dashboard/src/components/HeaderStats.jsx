import React from 'react';
import { Activity, Users, Repeat, ShieldAlert } from 'lucide-react';

export function HeaderStats({ stats }) {
  const cards = [
    {
      label: 'Live Active',
      value: stats.liveActiveVisitors ?? 0,
      sub: 'Last 5 minutes',
      icon: Activity,
      accent: 'text-emerald-400',
      bg: 'bg-emerald-500/10 border-emerald-500/20',
      pulse: true,
    },
    {
      label: 'Human Visitors',
      value: (stats.totalHumanVisitors ?? 0).toLocaleString(),
      sub: 'Verified fingerprints',
      icon: Users,
      accent: 'text-sky-400',
      bg: 'bg-sky-500/10 border-sky-500/20',
    },
    {
      label: 'Returning Rate',
      value: `${stats.returningRate ?? 0}%`,
      sub: `${stats.returningVisitors ?? 0} returning profiles`,
      icon: Repeat,
      accent: 'text-violet-400',
      bg: 'bg-violet-500/10 border-violet-500/20',
    },
    {
      label: 'Bots Blocked',
      value: (stats.totalBotsBlocked ?? 0).toLocaleString(),
      sub: 'Excluded from analytics',
      icon: ShieldAlert,
      accent: 'text-rose-400',
      bg: 'bg-rose-500/10 border-rose-500/30',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className="relative overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/70 p-5 shadow-lg shadow-slate-950/50 backdrop-blur"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                  {card.label}
                </p>
                <p className="mt-2 text-3xl font-bold tracking-tight text-slate-50">
                  {card.value}
                </p>
                <p className="mt-1 text-xs text-slate-400">{card.sub}</p>
              </div>
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${card.bg}`}>
                <Icon className={`h-5 w-5 ${card.accent}`} />
              </div>
            </div>
            {card.pulse && (
              <span className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-400">
                <span className="h-2 w-2 animate-ping rounded-full bg-emerald-400" />
                Real-time stream active
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
