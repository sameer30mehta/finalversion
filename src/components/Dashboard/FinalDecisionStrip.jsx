import React from 'react';
import { Badge, cleanText, formatPercent } from '../ui/DashboardPrimitives';

function decisionTone(decision = '') {
  if (decision.includes('REJECT')) return 'red';
  if (decision.includes('MANUAL')) return 'orange';
  if (decision.includes('PENALTY')) return 'amber';
  if (decision.includes('WARNING')) return 'blue';
  return 'emerald';
}

function actionLabel(data) {
  const decision = data?.verificationDecision?.decision || data?.stage2Output?.decision || '';
  if (decision.includes('REJECT')) return 'Do not proceed';
  if (decision.includes('MANUAL')) return 'Manual Review Required';
  if (decision.includes('PENALTY') || decision.includes('WARNING')) return 'Proceed with Conditions';
  return 'Proceed to Underwriting';
}

function mainReason(data) {
  const stageFlag = (data?.stage2Output?.flags || []).find((flag) => !flag?.protective);
  const portfolioFlag = data?.portfolioRiskSummary?.riskFlags?.[0];
  return cleanText(stageFlag?.title || stageFlag?.explanation || stageFlag?.text || portfolioFlag || data?.verificationDecision?.explanation || 'Structured assessment complete.');
}

function evidence(data, underwriterSummary) {
  const aiEvidence = underwriterSummary?.summary?.recommendedEvidence?.[0];
  if (aiEvidence) return cleanText(aiEvidence);
  const reason = mainReason(data).toLowerCase();
  if (reason.includes('size') || reason.includes('area')) return 'Area verification and title document.';
  if (reason.includes('portfolio')) return 'Senior credit review documentation.';
  return 'Mandatory legal and field verification evidence.';
}

export default function FinalDecisionStrip({ data, underwriterSummary }) {
  if (!data) return null;
  const decision = data.verificationDecision?.decision || data.stage2Output?.decision || '';
  const tone = decisionTone(decision);
  const recommendedLtv = data.portfolioRiskSummary?.portfolioSummary?.recommendedLtv
    ? formatPercent(data.portfolioRiskSummary.portfolioSummary.recommendedLtv)
    : `${data.ltv ?? 'Not available'}${Number.isFinite(data.ltv) ? '%' : ''}`;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white/95 px-4 py-3 shadow-[0_-10px_30px_rgba(15,23,42,0.08)] backdrop-blur md:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <Badge tone={tone}>{actionLabel(data)}</Badge>
            <Badge tone="slate">Recommended LTV: {recommendedLtv}</Badge>
          </div>
          <p className="text-sm font-semibold leading-relaxed text-slate-700">
            {actionLabel(data)} - {mainReason(data)} Required evidence: {evidence(data, underwriterSummary)}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[12px] font-bold uppercase tracking-wider text-slate-500">
          Decision memo
        </div>
      </div>
    </div>
  );
}
