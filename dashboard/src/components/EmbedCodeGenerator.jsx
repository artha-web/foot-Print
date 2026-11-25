import React, { useState } from 'react';
import { Code2, Copy, Check } from 'lucide-react';

export function EmbedCodeGenerator({ defaultApiUrl }) {
  const [domain, setDomain] = useState(defaultApiUrl || 'http://localhost:4000');
  const [copied, setCopied] = useState(false);

  const cleanDomain = domain.replace(/\/+$/, '');
  const snippet = `<script src="${cleanDomain}/tracker.js" async></script>`;

  function handleCopy() {
    navigator.clipboard.writeText(snippet).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="rounded-2xl border border-slate-800/80 bg-slate-900/70 p-5 shadow-lg">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Code2 className="h-4 w-4 text-emerald-400" />
            <h2 className="text-base font-semibold text-slate-100">Embed Tracking Script</h2>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Paste this single async tag into the <code className="text-slate-300">&lt;head&gt;</code> of any website. Works cross-domain via CORS.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            type="url"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="https://your-domain.com"
            className="w-full sm:w-64 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 font-mono text-xs text-slate-200 focus:border-emerald-500 focus:outline-none"
          />
          <button
            onClick={handleCopy}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-500 px-3.5 py-2 text-xs font-semibold text-slate-950 transition hover:bg-emerald-400"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? 'Copied!' : 'Copy Snippet'}
          </button>
        </div>
      </div>

      <pre className="mt-4 overflow-x-auto rounded-xl border border-slate-800 bg-slate-950 p-3.5 font-mono text-xs text-emerald-300">
        {snippet}
      </pre>
    </div>
  );
}
