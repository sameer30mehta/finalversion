import React, { useState } from 'react';

const STATUS_LABEL = {
  completed: 'Live scan completed',
  completed_no_accepted_events: 'Live scan completed — no accepted events',
  live_unavailable_cached: 'Live unavailable — cached official + media events shown',
  live_unavailable_no_cached_events: 'No locality events available',
  partial: 'Partial live scan',
};
const STATUS_TONE = {
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  completed_no_accepted_events: 'bg-slate-50 text-slate-600 border-slate-200',
  live_unavailable_cached: 'bg-amber-50 text-amber-700 border-amber-200',
  live_unavailable_no_cached_events: 'bg-slate-50 text-slate-600 border-slate-200',
  partial: 'bg-amber-50 text-amber-700 border-amber-200',
};
const SOURCE_STATUS_TONE = {
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  failed: 'bg-red-50 text-red-700 border-red-200',
  skipped: 'bg-slate-50 text-slate-600 border-slate-200',
};
const TIER_TONE = {
  official: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  reputed_media: 'bg-sky-50 text-sky-700 border-sky-200',
  local_media: 'bg-slate-50 text-slate-600 border-slate-200',
};
const TIER_LABEL = {
  official: 'Official',
  reputed_media: 'Reputed Media',
  local_media: 'Local Media',
};
const CORROBORATION_TONE = {
  official_plus_media: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  official_only: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  media_corroborated: 'bg-sky-50 text-sky-700 border-sky-200',
  media_only: 'bg-amber-50 text-amber-700 border-amber-200',
  local_media_only: 'bg-slate-50 text-slate-600 border-slate-200',
  unconfirmed: 'bg-slate-50 text-slate-500 border-slate-200',
  rejected: 'bg-red-50 text-red-700 border-red-200',
};
const CORROBORATION_LABEL = {
  official_plus_media: 'Official + Media',
  official_only: 'Official Confirmed',
  media_corroborated: 'Media Corroborated',
  media_only: 'Media-only Watchlist',
  local_media_only: 'Local Media Watchlist',
  unconfirmed: 'Unconfirmed',
  rejected: 'Rejected',
};
const DIRECTION_TONE = {
  positive: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  negative: 'bg-red-50 text-red-700 border-red-200',
  neutral: 'bg-slate-50 text-slate-600 border-slate-200',
};
const ROUTE_LABEL = {
  none: 'No inspection required',
  field_officer_review: 'Field Officer Review',
  technical_valuer_inspection: 'Technical Valuer Inspection',
  legal_review: 'Legal Review',
  senior_credit_review: 'Senior Credit Review',
  structural_engineer_inspection: 'Structural Engineer Inspection',
};
const ROUTE_TONE = {
  none: 'bg-slate-50 text-slate-600 border-slate-200',
  field_officer_review: 'bg-blue-50 text-blue-700 border-blue-200',
  technical_valuer_inspection: 'bg-amber-50 text-amber-700 border-amber-200',
  legal_review: 'bg-red-50 text-red-700 border-red-200',
  senior_credit_review: 'bg-amber-50 text-amber-700 border-amber-200',
  structural_engineer_inspection: 'bg-red-50 text-red-700 border-red-200',
};

const fmtSigned = (v, digits = 4) => {
  if (!Number.isFinite(Number(v)) || Number(v) === 0) return '0.0000';
  const n = Number(v);
  return `${n > 0 ? '+' : ''}${n.toFixed(digits)}`;
};
const fmtSignedPct = (v) => {
  if (!Number.isFinite(Number(v)) || Number(v) === 0) return '0.0%';
  const n = Number(v) * 100;
  return `${n > 0 ? '+' : ''}${n.toFixed(1)}%`;
};

function isCached(li) {
  return li?.status === 'live_unavailable_cached';
}

const REJECTION_LABEL = {
  weak_locality_relevance: 'Weak locality relevance',
  low_confidence: 'Low confidence',
  missing_evidence_quote: 'Missing evidence quote',
  irrelevant_event_type: 'Irrelevant event type',
  unsupported_source: 'Unsupported source',
  other: 'Other',
};

export default function LocalityIntelligenceSection({ localityIntelligence }) {
  const [auditOpen, setAuditOpen] = useState(false);
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false);

  if (!localityIntelligence) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <span aria-hidden="true" className="material-symbols-outlined text-indigo-500 text-[22px]">public</span>
          <h3 className="text-lg font-bold text-slate-900">Hyperlocal Event Intelligence</h3>
        </div>
        <p className="text-sm font-semibold text-slate-500">
          Locality intelligence unavailable — backend did not return a payload. Core valuation is unaffected.
        </p>
      </section>
    );
  }

  const li = localityIntelligence;
  const status = li.status || 'live_unavailable_no_cached_events';
  const cached = isCached(li);
  const events = li.events || [];
  const accepted = events.filter((e) => e.accepted);
  const ignored = events.filter((e) => !e.accepted);
  const sources = li.sourceStatuses || [];
  const tierCounts = li.sourceTierCounts || { official: 0, reputed_media: 0, local_media: 0 };
  const corrCounts = li.corroborationCounts || {};
  const watchlist = li.watchlistSignals || [];

  return (
    <section className="space-y-6">
      {/* Header card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span aria-hidden="true" className="material-symbols-outlined text-indigo-500 text-[22px]">public</span>
              <h3 className="text-lg font-bold text-slate-900">Hyperlocal Event Intelligence</h3>
              <span className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-500">OPTIONAL</span>
            </div>
            <p className="max-w-3xl text-sm font-medium leading-relaxed text-slate-500">
              Live scan of whitelisted official and reputed media sources for locality-level infrastructure, development, and risk signals.
              Media-only signals are treated as lower-trust watchlist signals. Events affect liquidity, confidence, and review routing only — not base market value.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 md:justify-end">
            <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider border ${STATUS_TONE[status] || STATUS_TONE.live_unavailable_no_cached_events}`}>
              {STATUS_LABEL[status] || status}
            </span>
            {cached && (
              <span className="px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider border bg-amber-50 text-amber-700 border-amber-200">
                Cached
              </span>
            )}
            {li.runMode && (
              <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider border ${
                li.runMode === 'live' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}>
                {li.runMode === 'live' ? 'Live run' : 'Cache run'}
              </span>
            )}
            {li.capPolicy?.band && (
              <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider border ${
                li.capPolicy.relaxPositiveCaps
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                  : 'bg-slate-50 text-slate-600 border-slate-200'
              }`}>
                Caps: {li.capPolicy.relaxPositiveCaps ? 'Relaxed' : 'Tight'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Tier counts + corroboration counts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6 shadow-sm">
          <h4 className="text-sm font-bold uppercase tracking-wider text-slate-700 mb-3">Sources by tier</h4>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-3">
              <p className="text-xs font-bold uppercase tracking-wider text-indigo-700">Official</p>
              <p className="mt-1 text-xl font-bold text-indigo-900">{tierCounts.official || 0}</p>
            </div>
            <div className="rounded-lg border border-sky-200 bg-sky-50 p-3">
              <p className="text-xs font-bold uppercase tracking-wider text-sky-700">Reputed Media</p>
              <p className="mt-1 text-xl font-bold text-sky-900">{tierCounts.reputed_media || 0}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Local Media</p>
              <p className="mt-1 text-xl font-bold text-slate-700">{tierCounts.local_media || 0}</p>
            </div>
          </div>
          <p className="mt-3 text-xs font-mono text-slate-500">
            {li.eventsFound || 0} events scanned · {li.acceptedEvents || 0} accepted · {li.rejectedEvents || 0} rejected · {watchlist.length} on watchlist
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6 shadow-sm">
          <h4 className="text-sm font-bold uppercase tracking-wider text-slate-700 mb-3">Corroboration breakdown</h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {[
              ['official_plus_media',  'Official + Media'],
              ['official_only',        'Official only'],
              ['media_corroborated',   'Media corroborated'],
              ['media_only',           'Media-only watchlist'],
              ['local_media_only',     'Local-media watchlist'],
              ['unconfirmed',          'Unconfirmed'],
            ].map(([key, label]) => (
              <div key={key} className={`rounded-md px-2.5 py-1.5 border ${CORROBORATION_TONE[key]}`}>
                <p className="font-bold uppercase tracking-wider opacity-80">{label}</p>
                <p className="mt-0.5 font-mono text-sm font-bold">{corrCounts[key] || 0}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Decision impact */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6 shadow-sm">
        <h4 className="text-sm font-bold uppercase tracking-wider text-slate-700 mb-3">Decision impact</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Liquidity</p>
            <p className={`mt-1 text-lg font-bold ${(li.liquidityDelta || 0) < 0 ? 'text-red-700' : (li.liquidityDelta || 0) > 0 ? 'text-emerald-700' : 'text-slate-700'}`}>
              {fmtSignedPct(li.liquidityDelta)}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Marketability</p>
            <p className={`mt-1 text-lg font-bold ${(li.marketabilityDelta || 0) < 0 ? 'text-red-700' : (li.marketabilityDelta || 0) > 0 ? 'text-emerald-700' : 'text-slate-700'}`}>
              {fmtSignedPct(li.marketabilityDelta)}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Confidence</p>
            <p className={`mt-1 text-lg font-bold ${(li.confidenceDelta || 0) < 0 ? 'text-red-700' : (li.confidenceDelta || 0) > 0 ? 'text-emerald-700' : 'text-slate-700'}`}>
              {fmtSigned(li.confidenceDelta, 3)}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Time-to-liquidate</p>
            <p className={`mt-1 text-lg font-bold ${(li.timeToLiquidateDeltaPct || 0) > 0 ? 'text-red-700' : (li.timeToLiquidateDeltaPct || 0) < 0 ? 'text-emerald-700' : 'text-slate-700'}`}>
              {fmtSignedPct(li.timeToLiquidateDeltaPct)}
            </p>
          </div>
        </div>
        <div className={`mt-4 rounded-lg border px-3 py-2 ${ROUTE_TONE[li.inspectionRoute || 'none']}`}>
          <p className="text-xs font-bold uppercase tracking-wider opacity-80">Inspection route</p>
          <p className="text-sm font-bold mt-0.5">{ROUTE_LABEL[li.inspectionRoute || 'none'] || li.inspectionRoute}</p>
        </div>
        {(li.preCapDeltas || li.capPolicy) && (
          <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">
            <p className="font-bold text-slate-700 mb-1">Cap policy: <span className="font-mono">{li.capPolicy?.band || (li.runMode === 'live' ? 'relaxed' : 'tight')}</span></p>
            {li.preCapDeltas && (
              <p className="font-mono text-slate-500">
                pre-cap: liq {fmtSignedPct(li.preCapDeltas.liquidityDelta)} · mkt {fmtSignedPct(li.preCapDeltas.marketabilityDelta)} · conf {fmtSigned(li.preCapDeltas.confidenceDelta, 3)} · TTL {fmtSignedPct(li.preCapDeltas.timeToLiquidateDeltaPct)}
              </p>
            )}
            {li.cacheDampenerApplied && (
              <p className="mt-1 font-mono text-amber-700">
                cache dampener applied — official ×0.75 · media-only ×0.40 · local-media ×0.20 (severe-risk only)
              </p>
            )}
          </div>
        )}
        <p className="mt-3 text-xs leading-relaxed text-slate-500">
          <strong>Cached events are dampened. Live official-confirmed events receive stronger weighting.</strong>{' '}
          Positive caps default to ±5% (liquidity / marketability) and −7% (TTL improvement). They expand to ±8% / −10% only when this run has at least one live official-tier event. Negative-risk caps are constant (−8% / +15%). Base market value is never altered by this layer.
        </p>
      </div>

      {/* Watchlist panel */}
      {watchlist.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-5 md:p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <span aria-hidden="true" className="material-symbols-outlined text-amber-600 text-[20px]">visibility</span>
            <h4 className="text-sm font-bold uppercase tracking-wider text-amber-800">Watchlist signals ({watchlist.length})</h4>
          </div>
          <p className="text-xs text-amber-900/80 mb-3">
            Single-source media signals. Tracked for context but do not trigger manual review unless the event is a severe risk type.
          </p>
          <ul className="space-y-2">
            {watchlist.map((w, idx) => (
              <li key={idx} className="rounded-lg border border-amber-200 bg-white p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-bold text-slate-900">{w.summary || w.eventType}</p>
                  <div className="flex flex-wrap gap-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider border ${TIER_TONE[w.sourceTier] || TIER_TONE.local_media}`}>
                      {TIER_LABEL[w.sourceTier] || w.sourceTier}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider border ${CORROBORATION_TONE[w.corroborationStatus]}`}>
                      {CORROBORATION_LABEL[w.corroborationStatus] || w.corroborationStatus}
                    </span>
                  </div>
                </div>
                <p className="mt-1 text-xs font-mono text-slate-500">
                  {w.sourceName} · {w.eventType} · confidence {Number(w.confidence || 0).toFixed(2)} · relevance {Number(w.localityRelevance || 0).toFixed(2)}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Sources checked */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6 shadow-sm">
        <h4 className="text-sm font-bold uppercase tracking-wider text-slate-700 mb-3">Sources checked</h4>
        {sources.length === 0 ? (
          <p className="text-sm font-semibold text-slate-500">No source status reported.</p>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {sources.map((s) => (
              <li key={s.sourceName} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-800 truncate">{s.sourceName}</p>
                  <p className="text-xs font-mono text-slate-500 mt-0.5">
                    {TIER_LABEL[s.sourceTier] || s.sourceTier || '—'} · docs {s.documentsFetched ?? 0}
                    {s.errorMessage ? ` · ${s.errorMessage}` : ''}
                  </p>
                </div>
                <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider border whitespace-nowrap ${SOURCE_STATUS_TONE[s.status] || SOURCE_STATUS_TONE.skipped}`}>
                  {s.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Live Scan Diagnostics (compact, default collapsed) */}
      {li.diagnostics && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6 shadow-sm">
          <button
            type="button"
            onClick={() => setDiagnosticsOpen((v) => !v)}
            className="w-full flex items-center justify-between gap-3 text-left transition-colors duration-150 hover:opacity-80"
            aria-expanded={diagnosticsOpen}
          >
            <span className="flex items-center gap-2">
              <span className="text-sm font-bold uppercase tracking-wider text-slate-700">Live Scan Diagnostics</span>
              <span className="text-xs font-mono text-slate-500">
                {li.diagnostics.liveDocumentsFetched || 0} fetched · {li.diagnostics.liveDocumentsAccepted || 0} accepted · {li.diagnostics.liveDocumentsRejected || 0} rejected
              </span>
            </span>
            <span aria-hidden="true" className="material-symbols-outlined text-[18px] text-slate-500">
              {diagnosticsOpen ? 'expand_less' : 'expand_more'}
            </span>
          </button>

          {diagnosticsOpen && (
            <div className="mt-4 space-y-4">
              {/* Headline counts */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Live docs fetched</p>
                  <p className="mt-1 text-lg font-bold text-slate-900">{li.diagnostics.liveDocumentsFetched || 0}</p>
                </div>
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">Accepted live events</p>
                  <p className="mt-1 text-lg font-bold text-emerald-900">{li.diagnostics.liveDocumentsAccepted || 0}</p>
                </div>
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-amber-700">Rejected live docs</p>
                  <p className="mt-1 text-lg font-bold text-amber-900">{li.diagnostics.liveDocumentsRejected || 0}</p>
                </div>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Live RSS scraping ran across whitelisted sources. Only validated, locality-relevant events are allowed to affect scoring — most fetched docs are correctly rejected.
              </p>

              {/* Top rejection reasons */}
              {li.diagnostics.rejectionReasonCounts && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Top rejection reasons</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                    {Object.entries(li.diagnostics.rejectionReasonCounts)
                      .filter(([, n]) => n > 0)
                      .sort((a, b) => b[1] - a[1])
                      .map(([key, n]) => (
                        <div key={key} className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5">
                          <span className="font-bold text-slate-700">{REJECTION_LABEL[key] || key}</span>
                          <span className="font-mono text-slate-500">{n}</span>
                        </div>
                      ))}
                    {Object.values(li.diagnostics.rejectionReasonCounts).every((n) => !n) && (
                      <div className="col-span-full text-slate-500">No rejected events in this run.</div>
                    )}
                  </div>
                </div>
              )}

              {/* Source-wise fetched vs accepted */}
              {Array.isArray(li.diagnostics.perSourceCounts) && li.diagnostics.perSourceCounts.length > 0 && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Source-wise fetched vs accepted</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-left text-slate-500">
                          <th className="font-mono font-semibold py-1 pr-3">source</th>
                          <th className="font-mono font-semibold py-1 pr-3">tier</th>
                          <th className="font-mono font-semibold py-1 pr-3">status</th>
                          <th className="font-mono font-semibold py-1 pr-3 text-right">fetched</th>
                          <th className="font-mono font-semibold py-1 pr-3 text-right">accepted</th>
                          <th className="font-mono font-semibold py-1 text-right">rejected</th>
                        </tr>
                      </thead>
                      <tbody>
                        {li.diagnostics.perSourceCounts.map((r, idx) => (
                          <tr key={idx} className="border-t border-slate-200">
                            <td className="py-1.5 pr-3 font-semibold text-slate-800 truncate max-w-[180px]" title={r.sourceName}>{r.sourceName}</td>
                            <td className="py-1.5 pr-3 font-mono text-slate-500">{r.sourceTier || '—'}</td>
                            <td className="py-1.5 pr-3">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase border ${SOURCE_STATUS_TONE[r.status] || SOURCE_STATUS_TONE.skipped}`}>{r.status}</span>
                            </td>
                            <td className="py-1.5 pr-3 font-mono text-right text-slate-700">{r.fetched ?? 0}</td>
                            <td className={`py-1.5 pr-3 font-mono text-right ${(r.accepted ?? 0) > 0 ? 'text-emerald-700 font-bold' : 'text-slate-500'}`}>{r.accepted ?? 0}</td>
                            <td className="py-1.5 font-mono text-right text-slate-500">{r.rejected ?? 0}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="mt-2 text-[11px] text-slate-400">
                    Raw scraped text is intentionally not exposed here — only counts.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Accepted events */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6 shadow-sm">
        <h4 className="text-sm font-bold uppercase tracking-wider text-slate-700 mb-3">
          Accepted events ({accepted.length})
        </h4>
        {accepted.length === 0 ? (
          <p className="text-sm font-semibold text-slate-500">
            No accepted locality events from whitelisted sources. Core valuation unaffected.
          </p>
        ) : (
          <ul className="space-y-3">
            {accepted.map((ev, idx) => {
              const tier = ev.sourceTier || 'official';
              const corr = ev.corroborationStatus || 'official_only';
              const watch = ev.isWatchlist;
              return (
                <li
                  key={ev.eventId || idx}
                  className={`rounded-xl border p-4 ${
                    watch ? 'border-amber-200 bg-amber-50/30' : 'border-slate-200 bg-slate-50'
                  }`}
                >
                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 break-words">{ev.title || ev.summary || ev.eventType}</p>
                      {ev.summary && ev.summary !== ev.title && (
                        <p className="text-xs text-slate-600 mt-1">{ev.summary}</p>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider border ${TIER_TONE[tier]}`}>
                        {TIER_LABEL[tier]}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider border ${CORROBORATION_TONE[corr]}`}>
                        {CORROBORATION_LABEL[corr]}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider border ${DIRECTION_TONE[ev.direction] || DIRECTION_TONE.neutral}`}>
                        {ev.direction}
                      </span>
                      <span className="px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider border bg-indigo-50 text-indigo-700 border-indigo-200">
                        {ev.eventType?.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 md:grid-cols-5 gap-2 text-xs font-mono text-slate-600">
                    <span>severity {Number(ev.severity || 0).toFixed(2)}</span>
                    <span>conf {Number(ev.confidence || 0).toFixed(2)}</span>
                    <span>relevance {Number(ev.localityRelevance || 0).toFixed(2)}</span>
                    <span>days ago {ev.publishedDaysAgo ?? '—'}</span>
                    <span>corrWt {Number(ev.corroborationWeight || 0).toFixed(2)}</span>
                  </div>
                  <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs font-mono">
                    <span className={(ev.liquidityDelta || 0) < 0 ? 'text-red-700' : (ev.liquidityDelta || 0) > 0 ? 'text-emerald-700' : 'text-slate-600'}>
                      liq {fmtSignedPct(ev.liquidityDelta)}
                    </span>
                    <span className={(ev.marketabilityDelta || 0) < 0 ? 'text-red-700' : (ev.marketabilityDelta || 0) > 0 ? 'text-emerald-700' : 'text-slate-600'}>
                      mkt {fmtSignedPct(ev.marketabilityDelta)}
                    </span>
                    <span className={(ev.confidenceDelta || 0) < 0 ? 'text-red-700' : (ev.confidenceDelta || 0) > 0 ? 'text-emerald-700' : 'text-slate-600'}>
                      conf {fmtSigned(ev.confidenceDelta, 3)}
                    </span>
                    <span className={(ev.timeToLiquidateDeltaPct || 0) > 0 ? 'text-red-700' : (ev.timeToLiquidateDeltaPct || 0) < 0 ? 'text-emerald-700' : 'text-slate-600'}>
                      TTL {fmtSignedPct(ev.timeToLiquidateDeltaPct)}
                    </span>
                  </div>
                  {ev.evidence && (
                    <p className="mt-3 text-xs italic text-slate-600 border-l-2 border-slate-300 pl-3">"{ev.evidence}"</p>
                  )}
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
                    <span className="font-mono text-slate-500">
                      {ev.project ? `${ev.project} · ${ev.projectStatus || 'unknown'}` : ev.projectStatus || ''}
                    </span>
                    {ev.sourceUrl && (
                      <a
                        href={ev.sourceUrl}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="font-bold text-indigo-700 hover:text-indigo-900 transition-colors duration-150"
                      >
                        {ev.sourceName} ↗
                      </a>
                    )}
                    {ev.audit?.ruleId && (
                      <span className="font-mono text-[10px] text-slate-400">{ev.audit.ruleId}</span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Audit trail */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6 shadow-sm">
        <button
          type="button"
          onClick={() => setAuditOpen((v) => !v)}
          className="w-full flex items-center justify-between gap-3 text-left transition-colors duration-150 hover:opacity-80"
          aria-expanded={auditOpen}
        >
          <span className="text-sm font-bold uppercase tracking-wider text-slate-700">Locality Audit Trail</span>
          <span className="flex items-center gap-2 text-xs font-mono text-slate-500">
            {(li.auditTrail || []).length} entr{(li.auditTrail || []).length === 1 ? 'y' : 'ies'}
            <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
              {auditOpen ? 'expand_less' : 'expand_more'}
            </span>
          </span>
        </button>
        {auditOpen && (
          <ul className="mt-3 space-y-2">
            {(li.auditTrail || []).map((rule, idx) => (
              <li key={`${rule.ruleId}-${idx}`} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center justify-between gap-3 mb-1">
                  <p className="text-sm font-bold text-slate-800">{rule.ruleId}</p>
                  <span className="text-xs font-mono text-slate-500">
                    {rule.source}{rule.sourceTier ? ` · ${rule.sourceTier}` : ''}
                  </span>
                </div>
                {rule.corroborationStatus && (
                  <p className="text-xs font-mono text-slate-500">
                    corroboration: {rule.corroborationStatus}
                  </p>
                )}
                <p className="text-xs font-mono text-slate-500">input: {rule.input}</p>
                {rule.formula && <p className="text-xs font-mono text-slate-500 mt-0.5">formula: {rule.formula}</p>}
                <p className="text-xs font-mono text-slate-500 mt-0.5">effect: {rule.effect}</p>
                <p className="text-sm text-slate-700 mt-1">{rule.explanation}</p>
              </li>
            ))}
            {(li.auditTrail || []).length === 0 && (
              <li className="text-sm text-slate-500">No audit entries yet.</li>
            )}
          </ul>
        )}
      </div>
    </section>
  );
}
