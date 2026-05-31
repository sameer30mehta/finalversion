import React from 'react';

const STATUS_CLASS = {
  pass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  warning: 'bg-blue-50 text-blue-700 border-blue-200',
  penalty: 'bg-amber-50 text-amber-700 border-amber-200',
  review: 'bg-orange-50 text-orange-700 border-orange-200',
  block: 'bg-red-50 text-red-600 border-red-200'
};

const DECISION_CLASS = {
  REJECT_BLOCK: 'bg-red-50 text-red-700 border-red-200',
  ACCEPT_CLEAN: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  ACCEPT_WARNING: 'bg-blue-50 text-blue-700 border-blue-200',
  ACCEPT_CONFIDENCE_PENALTY: 'bg-amber-50 text-amber-700 border-amber-200',
  MANUAL_REVIEW: 'bg-orange-50 text-orange-700 border-orange-200'
};

const DECISION_LABEL = {
  REJECT_BLOCK: 'Reject Block',
  ACCEPT_CLEAN: 'Accept Clean',
  ACCEPT_WARNING: 'Accept Warning',
  ACCEPT_CONFIDENCE_PENALTY: 'Accept With Confidence Penalty',
  MANUAL_REVIEW: 'Manual Review'
};

const NORM_SOURCE_LABEL = {
  sqlite_market_norms: 'SQLite market_norms',
  generated_fallback: 'generated fallback',
  default_fallback: 'default fallback'
};

function displayValue(value) {
  if (value === null || value === undefined || value === '') return 'Not resolved';
  return value;
}

function titleCase(value) {
  return String(value || '')
    .replace(/_/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function ScoreCard({ label, value, suffix = '' }) {
  return (
    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
      <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2">{label}</p>
      <p className="text-2xl font-mono text-slate-800 font-bold">{value}{suffix}</p>
    </div>
  );
}

function ReferenceMetric({ label, value }) {
  return (
    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
      <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">{label}</p>
      <p className="text-sm font-semibold text-slate-800">{displayValue(value)}</p>
    </div>
  );
}

function StatusBadge({ status }) {
  return (
    <span className={`px-2 py-1 rounded-md text-xs font-bold uppercase tracking-widest border ${STATUS_CLASS[status] || STATUS_CLASS.warning}`}>
      {titleCase(status)}
    </span>
  );
}

function ReferenceCell({ reference, detail }) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <span className="font-semibold text-slate-700">{displayValue(reference)}</span>
        {detail && (
          <details>
            <summary className="list-none cursor-pointer w-5 h-5 rounded-full border border-slate-200 bg-white text-slate-400 hover:text-indigo-600 hover:border-indigo-200 text-xs font-bold flex items-center justify-center">
              ?
            </summary>
            <div className="mt-2 rounded-lg border border-slate-200 bg-white p-3 text-xs font-medium leading-snug text-slate-600 shadow-sm">
              {detail}
            </div>
          </details>
        )}
      </div>
    </div>
  );
}

function fallbackEvaluationRows(stage2Output) {
  return (stage2Output.checksRun || []).map((check) => ({
    id: check.id,
    check: check.label,
    observedValue: check.status === 'pass' ? 'No issue observed' : 'Issue observed',
    reference: 'This check should pass',
    sourceBucket: 'Source: System',
    result: check.status,
    detail: `The system checked this item as part of the pre-valuation review. ${check.explanation}`
  }));
}

function getHighSignalFlags(flags) {
  const signalIds = new Set([
    'SIZE_OUTLIER_RARE_SUBTYPE',
    'PREMIUM_WEAK_ACCESS_LOW_LIQUIDITY',
    'LOW_DATA_MULTIPLE_ANOMALIES',
    'VALID_GEOCODE_CONTEXT_CONTRADICTION',
    'PREMIUM_PROFILE_WEAK_ACCESS',
    'STRONG_PROFILE_WEAK_LIQUIDITY'
  ]);

  const priorityFlags = flags.filter((flag) => (
    !flag.protective
    && flag.severity !== 'warning'
    && (flag.checkGroup === 'crossSignal' || signalIds.has(flag.id) || flag.severity === 'review' || flag.severity === 'block')
  ));

  if (priorityFlags.length > 0) return priorityFlags.slice(0, 3);
  return flags.filter((flag) => !flag.protective && flag.severity !== 'warning').slice(0, 2);
}

function EvaluationTable({ rows }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-slate-50">
      <table className="min-w-[920px] w-full text-left">
        <thead className="bg-white border-b border-slate-200">
          <tr className="text-xs font-bold uppercase tracking-wider text-slate-400">
            <th className="px-4 py-3 w-[22%]">What we checked</th>
            <th className="px-4 py-3 w-[27%] border-l border-slate-100">Your property</th>
            <th className="px-4 py-3 w-[31%] border-l border-slate-100">What is common here</th>
            <th className="px-4 py-3 w-[20%] border-l border-slate-100">Decision</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-slate-100 last:border-b-0 text-[12px] align-top">
              <td className="px-4 py-3 font-bold text-slate-700">{row.check}</td>
              <td className="px-4 py-3 border-l border-slate-100 text-slate-600 font-medium">{displayValue(row.observedValue)}</td>
              <td className="px-4 py-3 border-l border-slate-100 text-slate-600">
                <ReferenceCell reference={row.reference} detail={row.detail} />
              </td>
              <td className="px-4 py-3 border-l border-slate-100">
                <div className="flex flex-col items-start gap-2">
                  <StatusBadge status={row.result} />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    {displayValue(row.sourceBucket)}
                  </span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Stage2VerificationSection({ stage2Output }) {
  if (!stage2Output) return null;

  const flags = stage2Output.flags || [];
  const scores = stage2Output.scores || {};
  const localReferenceContext = stage2Output.localReferenceContext || {};
  const normSourceLabel = NORM_SOURCE_LABEL[stage2Output.normSource] || NORM_SOURCE_LABEL.default_fallback;
  const evaluationRows = stage2Output.evaluationRows?.length
    ? stage2Output.evaluationRows
    : fallbackEvaluationRows(stage2Output);
  const highSignalFlags = getHighSignalFlags(flags);

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-5">
        <div>
          <h3 className="text-headline-sm font-headline font-bold text-slate-800 flex items-center gap-2">
            <span className="material-symbols-outlined text-indigo-500">fact_check</span>
            Stage 2: Verification & Red-Flag Screening
          </h3>
          <p className="text-sm text-slate-500 font-medium mt-1">Pre-valuation trust screening with local expectations and decision impact.</p>
        </div>
        <div className="flex flex-wrap md:justify-end gap-2">
          <span className="px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest border w-max bg-slate-50 text-slate-600 border-slate-200">
            Norm source: {normSourceLabel}
          </span>
          <span className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest border w-max ${DECISION_CLASS[stage2Output.decision] || DECISION_CLASS.ACCEPT_WARNING}`}>
            {DECISION_LABEL[stage2Output.decision] || stage2Output.decision}
          </span>
        </div>
      </div>

      <div className={`rounded-xl border p-4 mb-5 ${DECISION_CLASS[stage2Output.decision] || DECISION_CLASS.ACCEPT_WARNING}`}>
        <div className="flex items-start gap-3">
          <span className="material-symbols-outlined text-[24px]">
            {stage2Output.decision === 'REJECT_BLOCK' ? 'block' : stage2Output.decision === 'MANUAL_REVIEW' ? 'policy' : 'verified'}
          </span>
          <div>
            <p className="text-sm font-bold uppercase tracking-wider">Final Decision</p>
            <p className="text-sm font-medium mt-1">{stage2Output.decisionExplanation}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <ScoreCard label="Data Sufficiency Score" value={(scores.dataSufficiencyScore ?? 0).toFixed(2)} />
        <ScoreCard label="Anomaly Score" value={scores.anomalyScore ?? 0} suffix="/100" />
        <ScoreCard label="Suspicion Score" value={scores.suspicionScore ?? 0} suffix="/100" />
      </div>

      <div className="mb-5">
        <h4 className="text-sm font-bold text-slate-900 mb-3 border-b border-slate-100 pb-2">Local Reference Context</h4>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <ReferenceMetric label="Common size band" value={localReferenceContext.sizeBand} />
          <ReferenceMetric label="Price band" value={localReferenceContext.priceBand || localReferenceContext.localPriceBand} />
          <ReferenceMetric label="Subtype prevalence" value={typeof localReferenceContext.subtypePrevalence === 'number' ? `${(localReferenceContext.subtypePrevalence * 100).toFixed(1)}%` : localReferenceContext.subtypePrevalenceLabel} />
          <ReferenceMetric label="Comparable count" value={localReferenceContext.comparableCount} />
          <ReferenceMetric label="Liquidity index" value={typeof localReferenceContext.liquidityIndex === 'number' ? localReferenceContext.liquidityIndex.toFixed(2) : localReferenceContext.liquidityIndex} />
        </div>
      </div>

      <div className="mb-5">
        <h4 className="text-sm font-bold text-slate-800 mb-3 border-b border-slate-100 pb-2 flex items-center gap-2">
          Professional Verification Table
          <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-600 text-xs rounded font-mono border border-indigo-100">STAGE_2_GATE</span>
        </h4>
        <EvaluationTable rows={evaluationRows} />
      </div>

      <div>
        <h4 className="text-sm font-bold text-slate-900 mb-3 border-b border-slate-100 pb-2">Priority Flags</h4>
        {highSignalFlags.length === 0 ? (
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-[12px] text-slate-600 font-medium">
            No high-signal review or penalty flags. Detailed pass/warning checks remain in the evaluation table.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            {highSignalFlags.map((flag) => (
              <div key={flag.id} className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <p className="text-[12px] font-bold text-slate-800 leading-tight">{flag.title}</p>
                  <StatusBadge status={flag.severity} />
                </div>
                <p className="text-[12px] text-slate-600 leading-snug">{flag.explanation}</p>
                <div className="flex flex-wrap gap-2 mt-3">
                  <span className="px-1.5 py-0.5 text-xs uppercase font-bold tracking-widest rounded bg-white text-slate-500 border border-slate-200">
                    {titleCase(flag.sourceBucket)}
                  </span>
                  <span className="px-1.5 py-0.5 text-xs uppercase font-bold tracking-widest rounded bg-white text-slate-500 border border-slate-200">
                    {displayValue(flag.evidence)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
