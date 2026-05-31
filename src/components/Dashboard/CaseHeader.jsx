import React from 'react';
import { Badge, cleanText, formatNumber, formatPercent } from '../ui/DashboardPrimitives';

function getDecisionTone(decision = '') {
  if (decision.includes('REJECT')) return 'red';
  if (decision.includes('MANUAL')) return 'orange';
  if (decision.includes('PENALTY')) return 'amber';
  if (decision.includes('WARNING')) return 'blue';
  return 'emerald';
}

function getPrimaryAction(data) {
  const decision = data?.verificationDecision?.decision || data?.stage2Output?.decision || '';
  if (decision.includes('REJECT')) return 'Do not proceed';
  if (decision.includes('MANUAL')) return 'Manual review required';
  if (decision.includes('PENALTY') || decision.includes('WARNING')) return 'Proceed with conditions';
  return 'Proceed to underwriting';
}

function getMicroMarket(data) {
  return data?.stage1?.bucketAssignment?.microMarketBucket?.label
    || data?.microMarket?.name
    || data?.microMarket?.label
    || 'Micro-market not available';
}

function getPortfolioRisk(data) {
  return data?.portfolioRiskSummary?.portfolioSummary?.riskLevel || 'Not available';
}

function getHistoricalSignal(data) {
  return data?.historicalCaseSummary?.overallSignal || 'Not available';
}

export default function CaseHeader({ data, aiStatus }) {
  if (!data) return null;

  const caseDetails = data.caseDetails || {};
  const decision = data.verificationDecision?.decision || data.stage2Output?.decision || 'REVIEW';
  const decisionLabel = data.verificationDecision?.label || cleanText(decision).replace(/_/g, ' ');
  const decisionTone = getDecisionTone(decision);
  const recommendedLtv = data.portfolioRiskSummary?.portfolioSummary?.recommendedLtv
    ? formatPercent(data.portfolioRiskSummary.portfolioSummary.recommendedLtv)
    : `${data.ltv ?? 'Not available'}${Number.isFinite(data.ltv) ? '%' : ''}`;

  const headerMetrics = [
    { label: 'Market value', value: data.marketValue, icon: 'payments' },
    { label: 'Recommended LTV', value: recommendedLtv, icon: 'account_balance' },
    { label: 'Confidence', value: formatNumber(data.confidence, 2), icon: 'verified' },
    { label: 'Portfolio risk', value: getPortfolioRisk(data), icon: 'account_tree' },
  ];

  return (
    <div className="overflow-hidden rounded-xl border border-slate-900 bg-slate-900 shadow-xl shadow-slate-900/10">
      <div className="p-5 text-white md:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="rounded-md border border-white/15 bg-white/10 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-slate-200">
                Collateral case
              </span>
              <span className="rounded-md border border-amber-300/30 bg-amber-300/15 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-amber-100">
                {decisionLabel}
              </span>
              {aiStatus && (
                <span className="rounded-md border border-cyan-300/25 bg-cyan-300/10 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-cyan-100">
                  AI {aiStatus}
                </span>
              )}
            </div>
            <h2 className="max-w-5xl break-words text-2xl font-extrabold tracking-tight text-white md:text-3xl">
              {cleanText(caseDetails.address || data.stage1?.normalizedPropertyProfile?.address)}
            </h2>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-slate-300">
              <span>Micro-market <span className="text-white">{cleanText(getMicroMarket(data))}</span></span>
              <span>Asset <span className="text-white">{cleanText(caseDetails.type)} / {cleanText(caseDetails.config || caseDetails.subtype)}</span></span>
              <span>Area <span className="text-white">{cleanText(caseDetails.area)} sqft</span></span>
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-white/[0.06] p-4 xl:min-w-[320px]">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Recommended action</p>
            <p className="mt-2 text-xl font-bold text-white">{getPrimaryAction(data)}</p>
            <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-300">
              Numeric outputs are deterministic. AI only explains evidence and review wording.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 border-t border-white/10 bg-white md:grid-cols-2 xl:grid-cols-4">
        {headerMetrics.map((metric) => (
          <div key={metric.label} className="border-b border-slate-200 p-4 md:border-r xl:border-b-0">
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{metric.label}</p>
              <span className="material-symbols-outlined text-[18px] text-slate-400">{metric.icon}</span>
            </div>
            <p className="break-words text-lg font-extrabold leading-tight text-slate-950">{cleanText(metric.value)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
