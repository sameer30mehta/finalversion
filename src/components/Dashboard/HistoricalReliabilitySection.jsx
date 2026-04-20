import React from 'react';

const SIGNAL_CLASS = {
  Positive: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Mixed: 'bg-amber-50 text-amber-700 border-amber-200',
  Caution: 'bg-red-50 text-red-700 border-red-200'
};

const DIRECTION_CLASS = {
  Positive: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Mixed: 'bg-slate-50 text-slate-600 border-slate-200',
  Negative: 'bg-red-50 text-red-700 border-red-200'
};

function formatDelta(value, suffix = '') {
  if (!Number.isFinite(value) || value === 0) return 'No change';
  return `${value > 0 ? '+' : ''}${value.toFixed(2)}${suffix}`;
}

function formatValue(value) {
  if (value === null || value === undefined || value === '') return 'Not available';
  return value;
}

function SummaryMetric({ label, value, tone = 'default' }) {
  const valueClass = tone === 'positive'
    ? 'text-emerald-700'
    : tone === 'caution'
      ? 'text-red-700'
      : 'text-slate-800';

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 shadow-inner">
      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-xl font-mono font-bold ${valueClass}`}>{value}</p>
    </div>
  );
}

function DetailItem({ label, value }) {
  return (
    <div>
      <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold mb-1">{label}</p>
      <p className="text-[12px] font-semibold text-slate-700">{formatValue(value)}</p>
    </div>
  );
}

function HistoricalCaseRow({ historicalCase }) {
  const impact = historicalCase.currentCaseImpact || {};

  return (
    <details className="group border border-slate-200 rounded-xl bg-white overflow-hidden">
      <summary className="list-none cursor-pointer hover:bg-slate-50 transition-colors">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_0.7fr_1.3fr_1.3fr_1fr_32px] gap-4 px-4 py-4 items-center">
          <div>
            <p className="text-[13px] font-bold text-slate-800">{historicalCase.caseId}</p>
            <p className="text-[11px] text-slate-500 font-medium">{historicalCase.location}</p>
          </div>
          <div>
            <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100 text-[11px] font-bold">
              {historicalCase.similarityPct}% similar
            </span>
          </div>
          <p className="text-[12px] text-slate-600 font-medium leading-snug">{historicalCase.matchBasis}</p>
          <p className="text-[12px] text-slate-600 font-medium leading-snug">{historicalCase.outcomeSummary}</p>
          <p className={`text-[12px] font-bold ${impact.confidenceContribution >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
            Confidence {formatDelta(impact.confidenceContribution)}
          </p>
          <span className="material-symbols-outlined text-slate-400 group-open:rotate-180 transition-transform">expand_more</span>
        </div>
      </summary>

      <div className="border-t border-slate-200 bg-slate-50/70 p-5">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h4 className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-4">Historical Property Summary</h4>
            <div className="grid grid-cols-2 gap-4">
              <DetailItem label="Micro-market" value={historicalCase.microMarket} />
              <DetailItem label="Type" value={historicalCase.propertyType} />
              <DetailItem label="Subtype" value={historicalCase.subtype} />
              <DetailItem label="Config" value={historicalCase.config} />
              <DetailItem label="Size band" value={historicalCase.sizeBand} />
              <DetailItem label="Age bucket" value={historicalCase.ageBucket} />
              <DetailItem label="Legal profile" value={historicalCase.legalProfile} />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h4 className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-4">Historical Outcome</h4>
            <div className="grid grid-cols-2 gap-4">
              <DetailItem label="Approval" value={historicalCase.outcome?.approvalStatus} />
              <DetailItem label="Default" value={historicalCase.outcome?.defaultStatus} />
              <DetailItem label="Liquidation" value={historicalCase.outcome?.liquidationDays ? `${historicalCase.outcome.liquidationDays} days` : 'Not liquidated'} />
              <DetailItem label="Valuation gap" value={`${historicalCase.outcome?.valuationDeviationPct ?? 0}%`} />
              <DetailItem label="Recovery quality" value={historicalCase.outcome?.recoveryQuality} />
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold mb-2">Why it matched</p>
              <div className="flex flex-wrap gap-2">
                {(historicalCase.matchReason || []).map((reason) => (
                  <span key={reason} className="px-2 py-1 rounded-md bg-slate-50 border border-slate-200 text-[10px] text-slate-600 font-bold">
                    {reason}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h4 className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-4">Impact on Current Case</h4>
            <div className="space-y-3">
              <DetailItem label="Similarity weight" value={impact.similarityWeight?.toFixed(2)} />
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold mb-1">Reliability direction</p>
                <span className={`inline-flex px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${DIRECTION_CLASS[impact.reliabilityDirection] || DIRECTION_CLASS.Mixed}`}>
                  {impact.reliabilityDirection || 'Mixed'}
                </span>
              </div>
              <DetailItem label="Confidence contribution" value={formatDelta(impact.confidenceContribution)} />
              <DetailItem label="Liquidity effect" value={formatDelta(impact.liquidityEffect)} />
              <DetailItem label="Distress effect" value={formatDelta(impact.distressEffect)} />
            </div>
          </div>
        </div>
      </div>
    </details>
  );
}

export default function HistoricalReliabilitySection({ historicalCaseSummary }) {
  if (!historicalCaseSummary) return null;

  const signalClass = SIGNAL_CLASS[historicalCaseSummary.overallSignal] || SIGNAL_CLASS.Mixed;
  const hasCases = historicalCaseSummary.similarCases?.length > 0;

  return (
    <section className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="material-symbols-outlined text-indigo-500">history</span>
            <h3 className="text-lg font-headline font-bold text-slate-800">Historical Similar Cases</h3>
            <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-600 text-[10px] rounded font-mono border border-indigo-100">HISTORY_LAYER</span>
          </div>
          <p className="text-sm text-slate-500 font-medium">
            Internal bank history for past collateral cases similar to this one. This is separate from market comparables.
          </p>
        </div>
        <span className={`px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-widest border ${signalClass}`}>
          Historical Signal: {historicalCaseSummary.overallSignal}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-5">
        <SummaryMetric label="Similar cases found" value={historicalCaseSummary.casesFound} />
        <SummaryMetric
          label="Confidence adjustment"
          value={formatDelta(historicalCaseSummary.confidenceAdjustment)}
          tone={historicalCaseSummary.confidenceAdjustment >= 0 ? 'positive' : 'caution'}
        />
        <SummaryMetric label="Liquidity adjustment" value={formatDelta(historicalCaseSummary.liquidityAdjustment)} />
        <SummaryMetric label="Distress adjustment" value={formatDelta(historicalCaseSummary.distressAdjustment)} />
      </div>

      {Number.isFinite(historicalCaseSummary.baseConfidence) && (
        <div className="mb-5 grid grid-cols-1 md:grid-cols-3 gap-3 rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
          <DetailItem label="Base confidence before history" value={historicalCaseSummary.baseConfidence.toFixed(2)} />
          <DetailItem label="Historical adjustment" value={formatDelta(historicalCaseSummary.confidenceAdjustment)} />
          <DetailItem label="Final confidence after history" value={historicalCaseSummary.finalConfidence?.toFixed(2)} />
        </div>
      )}

      {historicalCaseSummary.sparse && (
        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[12px] font-semibold text-amber-800">
          {historicalCaseSummary.note}
        </div>
      )}

      {!hasCases ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-sm font-semibold text-slate-500">
          Limited historical matches found. Historical data had low similarity, so confidence impact is small.
        </div>
      ) : (
        <div className="space-y-3">
          <div className="hidden lg:grid grid-cols-[1fr_0.7fr_1.3fr_1.3fr_1fr_32px] gap-4 px-4 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
            <span>Similar case</span>
            <span>Similarity</span>
            <span>Why it matched</span>
            <span>Historical outcome</span>
            <span>Impact on this case</span>
            <span></span>
          </div>
          {historicalCaseSummary.similarCases.map((historicalCase) => (
            <HistoricalCaseRow key={historicalCase.caseId} historicalCase={historicalCase} />
          ))}
        </div>
      )}
    </section>
  );
}
