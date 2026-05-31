import React, { useEffect, useMemo, useRef, useState } from 'react';
import { scanImageFile } from '../../lib/api';
import {
  MODEL_LABELS,
  OPTIONAL_CATEGORIES,
  REQUIRED_CATEGORIES,
  buildVisualEvidence,
} from '../../lib/visualEvidenceEngine';

const ACCEPTED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_PACKET_IMAGES = 8;

const ROLE_OPTIONS = [
  { value: 'unknown',      label: 'Unknown' },
  { value: 'borrower',     label: 'Borrower' },
  { value: 'bank_officer', label: 'Bank Officer' },
  { value: 'valuer',       label: 'Valuer' },
];
const GPS_OPTIONS = [
  { value: 'unknown', label: 'Unknown' },
  { value: 'pass',    label: 'GPS Match' },
  { value: 'fail',    label: 'GPS Mismatch' },
];
const VERIFICATION_OPTIONS = [
  { value: 'unknown',            label: 'Unknown' },
  { value: 'verified_capture',   label: 'Verified Capture' },
  { value: 'unverified_upload',  label: 'Unverified Upload' },
];

const STATUS_TONE = {
  not_uploaded: 'bg-slate-50 text-slate-600 border-slate-200',
  incomplete:   'bg-amber-50 text-amber-700 border-amber-200',
  complete:     'bg-emerald-50 text-emerald-700 border-emerald-200',
};
const STRENGTH_TONE = {
  none:     'bg-slate-50 text-slate-600 border-slate-200',
  weak:     'bg-amber-50 text-amber-700 border-amber-200',
  moderate: 'bg-blue-50 text-blue-700 border-blue-200',
  strong:   'bg-emerald-50 text-emerald-700 border-emerald-200',
};
const TRUST_TONE = {
  low:    'bg-amber-50 text-amber-700 border-amber-200',
  medium: 'bg-blue-50 text-blue-700 border-blue-200',
  high:   'bg-emerald-50 text-emerald-700 border-emerald-200',
};
const ROUTE_LABEL = {
  none: 'No inspection required',
  field_officer_review: 'Field Officer Review',
  technical_valuer_inspection: 'Technical Valuer Inspection',
  structural_engineer_inspection: 'Structural Engineer Inspection',
};
const ROUTE_TONE = {
  none: 'bg-slate-50 text-slate-600 border-slate-200',
  field_officer_review: 'bg-blue-50 text-blue-700 border-blue-200',
  technical_valuer_inspection: 'bg-amber-50 text-amber-700 border-amber-200',
  structural_engineer_inspection: 'bg-red-50 text-red-700 border-red-200',
};

function formatPercent(value, digits = 1) {
  if (!Number.isFinite(value)) return '0.0%';
  return `${(value * 100).toFixed(digits)}%`;
}
function formatSignedPercent(value, digits = 1) {
  if (!Number.isFinite(value) || value === 0) return '0.0%';
  return `${value > 0 ? '+' : ''}${(value * 100).toFixed(digits)}%`;
}
function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return '';
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

function CategoryTile({ category, required, entry, onSelect, onClear }) {
  const inputRef = useRef(null);
  const present = Boolean(entry);
  return (
    <div
      className={`relative rounded-xl border bg-white p-3 transition-shadow duration-150 ${
        present
          ? 'border-emerald-200 shadow-sm'
          : required
          ? 'border-dashed border-slate-300 hover:border-slate-400'
          : 'border-dashed border-slate-200 hover:border-slate-300'
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{category.label}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">{required ? 'Required' : 'Optional'}</p>
        </div>
        {present && (
          <button
            type="button"
            onClick={onClear}
            aria-label={`Remove ${category.label}`}
            className="text-slate-400 hover:text-red-600 transition-colors duration-150"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[18px]">close</span>
          </button>
        )}
      </div>
      {present ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          aria-label={`Replace ${category.label} image`}
          className="block w-full text-left"
        >
          <img
            src={entry.previewUrl}
            alt={category.label}
            className="w-full h-28 object-cover rounded-lg border border-slate-200"
          />
          <p className="mt-2 text-[11px] text-slate-500 truncate" title={entry.fileName}>
            {entry.fileName} · {formatBytes(entry.fileSize)}
          </p>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full h-28 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors duration-150 flex flex-col items-center justify-center gap-1"
        >
          <span aria-hidden="true" className="material-symbols-outlined text-slate-400 text-[24px]">add_a_photo</span>
          <span className="text-[11px] font-semibold text-slate-500">Upload image</span>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(',')}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onSelect(file);
          e.target.value = '';
        }}
      />
    </div>
  );
}

// State (packet / metadata / scanStatus / modelResults / modelUsed) is owned by
// the Dashboard so the same uploads + scan persist whether the user is in the
// pre-evaluation step or the post-evaluation tab. This component is controlled.
export default function VisualEvidenceSection({
  packet,
  setPacket,
  packetMetadata,
  setPacketMetadata,
  scanStatus,
  setScanStatus,
  modelResults,
  setModelResults,
  modelUsed,
  setModelUsed,
  onChange,
}) {
  // Local UI-only state (validation message, audit accordion).
  const [error, setError] = useState(null);
  const [auditOpen, setAuditOpen] = useState(false);

  const visualEvidence = useMemo(() => {
    const metaForEngine = {
      uploadedByRole: packetMetadata.uploadedByRole,
      gpsMatchStatus: packetMetadata.gpsMatchStatus,
      captureVerificationStatus: packetMetadata.captureVerificationStatus,
      freshnessDays: packetMetadata.freshnessDays === '' ? null : Number(packetMetadata.freshnessDays),
    };
    return buildVisualEvidence({
      packet,
      metadata: metaForEngine,
      modelResults,
      modelStatus: scanStatus,
      modelUsed,
    });
  }, [packet, packetMetadata, modelResults, scanStatus, modelUsed]);

  useEffect(() => {
    if (typeof onChange === 'function') onChange(visualEvidence);
  }, [visualEvidence, onChange]);

  function setCategoryFile(categoryId, file) {
    setError(null);
    if (!file) return;
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError(`Unsupported file type: ${file.type || 'unknown'}. Use JPG, PNG or WebP.`);
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setError(`File too large: ${(file.size / 1024 / 1024).toFixed(1)} MB. Limit is 5 MB.`);
      return;
    }
    const newCount = Object.keys(packet).length + (packet[categoryId] ? 0 : 1);
    if (newCount > MAX_PACKET_IMAGES) {
      setError(`Maximum ${MAX_PACKET_IMAGES} images per packet.`);
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    setPacket((prev) => {
      const old = prev[categoryId];
      if (old?.previewUrl) URL.revokeObjectURL(old.previewUrl);
      return {
        ...prev,
        [categoryId]: {
          imageId: `img-${categoryId}-${Date.now()}`,
          file,
          previewUrl,
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          metadata: {},
        },
      };
    });
    setScanStatus('not_run');
    setModelResults([]);
  }

  function clearCategory(categoryId) {
    setPacket((prev) => {
      const old = prev[categoryId];
      if (old?.previewUrl) URL.revokeObjectURL(old.previewUrl);
      const next = { ...prev };
      delete next[categoryId];
      return next;
    });
    setScanStatus('not_run');
    setModelResults([]);
    setError(null);
  }

  async function runVisionScan() {
    const allRequiredPresent = REQUIRED_CATEGORIES.every((c) => packet[c.id]);
    if (!allRequiredPresent || scanStatus === 'running') return;
    setScanStatus('running');
    setError(null);
    const results = [];
    let anySuccess = false;
    let firstModelName = null;
    for (const cat of [...REQUIRED_CATEGORIES, ...OPTIONAL_CATEGORIES]) {
      const entry = packet[cat.id];
      if (!entry?.file) continue;
      try {
        const r = await scanImageFile(entry.file, {
          candidateLabels: MODEL_LABELS,
          threshold: 0.08,
        });
        anySuccess = true;
        if (!firstModelName && r?.model) firstModelName = r.model;
        results.push({
          category: cat.id,
          imageId: entry.imageId,
          results: r?.results || [],
          model: r?.model,
        });
      } catch (e) {
        results.push({
          category: cat.id,
          imageId: entry.imageId,
          results: [],
          error: String(e?.message || e),
        });
      }
    }
    setModelResults(results);
    setModelUsed(firstModelName || 'Xenova/owlvit-base-patch32');
    if (!anySuccess) {
      setScanStatus('unavailable');
    } else {
      setScanStatus('completed');
    }
  }

  const effects = visualEvidence.deterministicEffects;
  const trust = visualEvidence.metadataTrust;
  const allCategories = [...REQUIRED_CATEGORIES, ...OPTIONAL_CATEGORIES];
  const usedSlots = Object.keys(packet).length;
  const allRequiredPresent = REQUIRED_CATEGORIES.every((c) => packet[c.id]);
  const scanDisabled = !allRequiredPresent || scanStatus === 'running';

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span aria-hidden="true" className="material-symbols-outlined text-indigo-500 text-[22px]">photo_library</span>
              <h3 className="text-lg font-bold text-slate-900">Visual Collateral Evidence</h3>
              <span className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-500">OPTIONAL</span>
            </div>
            <p className="max-w-3xl text-sm font-medium leading-relaxed text-slate-500">
              Optional standardized image packet used for evidence quality, condition signals, and inspection routing.
              Images do not directly determine valuation. Capture and spoofing prevention are the responsibility of the upstream bank/valuer capture workflow.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 md:justify-end">
            <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider border ${STATUS_TONE[visualEvidence.packetStatus]}`}>
              Packet: {visualEvidence.packetStatus.replace('_', ' ')}
            </span>
            <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider border ${STRENGTH_TONE[effects.evidenceStrength]}`}>
              Evidence: {effects.evidenceStrength}
            </span>
          </div>
        </div>
      </div>

      {/* Required categories */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6 shadow-sm">
        <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
          <h4 className="text-sm font-bold uppercase tracking-wider text-slate-700">Required Image Categories</h4>
          <p className="text-xs font-mono text-slate-500">{usedSlots} / {MAX_PACKET_IMAGES} uploaded</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
          {REQUIRED_CATEGORIES.map((cat) => (
            <CategoryTile
              key={cat.id}
              category={cat}
              required
              entry={packet[cat.id]}
              onSelect={(file) => setCategoryFile(cat.id, file)}
              onClear={() => clearCategory(cat.id)}
            />
          ))}
        </div>

        <details className="mt-5 group">
          <summary className="cursor-pointer text-xs font-bold uppercase tracking-wider text-slate-600 hover:text-slate-900 transition-colors duration-150 select-none">
            Optional categories ({OPTIONAL_CATEGORIES.length})
          </summary>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
            {OPTIONAL_CATEGORIES.map((cat) => (
              <CategoryTile
                key={cat.id}
                category={cat}
                required={false}
                entry={packet[cat.id]}
                onSelect={(file) => setCategoryFile(cat.id, file)}
                onClear={() => clearCategory(cat.id)}
              />
            ))}
          </div>
        </details>

        {error && (
          <p className="mt-4 text-sm font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
        )}
      </div>

      {/* Metadata controls */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6 shadow-sm">
        <div className="flex items-baseline justify-between mb-4">
          <h4 className="text-sm font-bold uppercase tracking-wider text-slate-700">Packet Metadata</h4>
          <span className="text-[11px] text-slate-400">PropScore consumes metadata; it does not produce it.</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider space-y-1">
            <span>Uploaded by role</span>
            <select
              value={packetMetadata.uploadedByRole}
              onChange={(e) => setPacketMetadata({ ...packetMetadata, uploadedByRole: e.target.value })}
              className="w-full mt-1 px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow duration-150"
            >
              {ROLE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </label>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider space-y-1">
            <span>GPS match status</span>
            <select
              value={packetMetadata.gpsMatchStatus}
              onChange={(e) => setPacketMetadata({ ...packetMetadata, gpsMatchStatus: e.target.value })}
              className="w-full mt-1 px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow duration-150"
            >
              {GPS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </label>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider space-y-1">
            <span>Capture verification</span>
            <select
              value={packetMetadata.captureVerificationStatus}
              onChange={(e) => setPacketMetadata({ ...packetMetadata, captureVerificationStatus: e.target.value })}
              className="w-full mt-1 px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow duration-150"
            >
              {VERIFICATION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </label>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider space-y-1">
            <span>Freshness (days)</span>
            <input
              type="number"
              min="0"
              max="3650"
              placeholder="e.g. 7"
              value={packetMetadata.freshnessDays}
              onChange={(e) => setPacketMetadata({ ...packetMetadata, freshnessDays: e.target.value })}
              className="w-full mt-1 px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow duration-150"
            />
          </label>
        </div>

        {/* Scan controls + trust summary */}
        <div className="mt-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider border ${TRUST_TONE[trust.sourceTrustLevel]}`}>
              Metadata trust: {trust.sourceTrustLevel}
            </span>
            <span className="text-xs font-mono text-slate-500">Score {trust.metadataTrustScore.toFixed(2)}</span>
            <span className="text-xs font-semibold text-slate-500">· Freshness: {trust.freshnessStatus}</span>
            <span className="text-xs font-semibold text-slate-500">· GPS: {trust.gpsMatchStatus}</span>
          </div>
          <button
            type="button"
            onClick={runVisionScan}
            disabled={scanDisabled}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-2 text-sm font-bold text-white shadow-sm transition-colors duration-150 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-45"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
              {scanStatus === 'running' ? 'hourglass_top' : 'visibility'}
            </span>
            {scanStatus === 'running'
              ? 'Running vision scan...'
              : scanStatus === 'completed'
                ? 'Re-run vision scan'
                : 'Run vision scan'}
          </button>
        </div>
        {!allRequiredPresent && (
          <p className="mt-3 text-xs font-semibold text-slate-500">
            Upload all 5 required categories to enable the optional vision scan.
          </p>
        )}
      </div>

      {/* Findings + Decision Impact */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-bold uppercase tracking-wider text-slate-700">Visual Findings</h4>
            <span className={`px-2 py-1 rounded-md text-xs font-bold uppercase tracking-wider border ${STATUS_TONE[visualEvidence.packetStatus]}`}>
              {visualEvidence.processingStatus.replace('_', ' ')}
            </span>
          </div>
          {(scanStatus === 'failed' || scanStatus === 'unavailable') ? (
            <p className="text-sm font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              Visual model unavailable. Image-based condition scoring skipped. Core valuation unaffected.
            </p>
          ) : visualEvidence.visualSignals.length === 0 ? (
            <p className="text-sm font-semibold text-slate-500">
              {scanStatus === 'completed'
                ? 'No detection signals above threshold. Visual packet treated as clean.'
                : 'No detections yet. Upload required images and run the vision scan.'}
            </p>
          ) : (
            <ul className="space-y-2">
              {visualEvidence.visualSignals.slice(0, 8).map((s, idx) => (
                <li
                  key={`${s.id}-${idx}`}
                  className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 ${
                    s.accepted ? 'border-red-200 bg-red-50' : 'border-slate-200 bg-slate-50'
                  }`}
                >
                  <div className="min-w-0">
                    <p className={`text-sm font-bold ${s.accepted ? 'text-red-800' : 'text-slate-700'} truncate`}>{s.label}</p>
                    <p className="text-[11px] font-mono text-slate-500 mt-0.5">
                      {s.imageCategory.replace(/_/g, ' ')} · conf {(s.confidence * 100).toFixed(0)}% · threshold {(s.threshold * 100).toFixed(0)}%
                    </p>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border whitespace-nowrap ${
                    s.accepted ? 'bg-red-100 text-red-800 border-red-200' : 'bg-slate-100 text-slate-500 border-slate-200'
                  }`}>
                    {s.accepted ? 'accepted' : 'ignored'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6 shadow-sm">
          <h4 className="text-sm font-bold uppercase tracking-wider text-slate-700 mb-3">Decision Impact</h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Confidence delta</p>
              <p className={`mt-1 text-lg font-bold ${effects.confidenceDelta < 0 ? 'text-red-700' : effects.confidenceDelta > 0 ? 'text-emerald-700' : 'text-slate-700'}`}>
                {effects.confidenceDelta > 0 ? '+' : ''}{effects.confidenceDelta.toFixed(3)}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Valuation modifier</p>
              <p className={`mt-1 text-lg font-bold ${effects.valuationModifierPct < 0 ? 'text-red-700' : effects.valuationModifierPct > 0 ? 'text-emerald-700' : 'text-slate-700'}`}>
                {formatSignedPercent(effects.valuationModifierPct)}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Liquidity modifier</p>
              <p className={`mt-1 text-lg font-bold ${effects.liquidityModifierPct < 0 ? 'text-red-700' : effects.liquidityModifierPct > 0 ? 'text-emerald-700' : 'text-slate-700'}`}>
                {formatSignedPercent(effects.liquidityModifierPct)}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Manual inspection</p>
              <p className="mt-1 text-sm font-bold text-slate-800">{effects.manualInspectionRequired ? 'Required' : 'Not required'}</p>
            </div>
          </div>
          <div className={`mt-4 rounded-lg border px-3 py-2 ${ROUTE_TONE[effects.inspectionRoute]}`}>
            <p className="text-[11px] font-bold uppercase tracking-wider opacity-80">Inspection route</p>
            <p className="text-sm font-bold mt-0.5">{ROUTE_LABEL[effects.inspectionRoute] || effects.inspectionRoute}</p>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-slate-500">
            Image-derived effects are capped at confidence ±0.05/+0.06 and valuation ±0.05/+0.03. Final market-value range is not altered by image evidence.
          </p>
        </div>
      </div>

      {/* Headline + positives/concerns/follow-up */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6 shadow-sm">
        <p className="text-sm font-semibold text-slate-800">{visualEvidence.userFacingSummary.headline}</p>
        {(visualEvidence.userFacingSummary.positives.length
          || visualEvidence.userFacingSummary.concerns.length
          || visualEvidence.userFacingSummary.requiredFollowUp.length) > 0 && (
          <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            {visualEvidence.userFacingSummary.positives.length > 0 && (
              <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-3">
                <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 mb-1">Positives</p>
                <ul className="space-y-1 text-emerald-900">
                  {visualEvidence.userFacingSummary.positives.map((p, i) => <li key={i}>· {p}</li>)}
                </ul>
              </div>
            )}
            {visualEvidence.userFacingSummary.concerns.length > 0 && (
              <div className="rounded-lg border border-red-100 bg-red-50 p-3">
                <p className="text-[11px] font-bold uppercase tracking-wider text-red-700 mb-1">Concerns</p>
                <ul className="space-y-1 text-red-900">
                  {visualEvidence.userFacingSummary.concerns.map((p, i) => <li key={i}>· {p}</li>)}
                </ul>
              </div>
            )}
            {visualEvidence.userFacingSummary.requiredFollowUp.length > 0 && (
              <div className="rounded-lg border border-amber-100 bg-amber-50 p-3">
                <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700 mb-1">Required follow-up</p>
                <ul className="space-y-1 text-amber-900">
                  {visualEvidence.userFacingSummary.requiredFollowUp.map((p, i) => <li key={i}>· {p}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Audit trail (collapsible) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6 shadow-sm">
        <button
          type="button"
          onClick={() => setAuditOpen((v) => !v)}
          className="w-full flex items-center justify-between gap-3 text-left transition-colors duration-150 hover:opacity-80"
          aria-expanded={auditOpen}
        >
          <span className="text-sm font-bold uppercase tracking-wider text-slate-700">Visual Evidence Audit Trail</span>
          <span className="flex items-center gap-2 text-xs font-mono text-slate-500">
            {visualEvidence.auditTrail.length} entr{visualEvidence.auditTrail.length === 1 ? 'y' : 'ies'}
            <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
              {auditOpen ? 'expand_less' : 'expand_more'}
            </span>
          </span>
        </button>
        {auditOpen && (
          <ul className="mt-3 space-y-2">
            {visualEvidence.auditTrail.map((rule, idx) => (
              <li key={`${rule.ruleId}-${idx}`} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center justify-between gap-3 mb-1">
                  <p className="text-sm font-bold text-slate-800">{rule.ruleName}</p>
                  <span className="text-[10px] font-mono text-slate-500 uppercase">{rule.ruleId}</span>
                </div>
                <p className="text-xs font-mono text-slate-500">input: {rule.input}</p>
                <p className="text-xs font-mono text-slate-500 mt-0.5">effect: {rule.effect}</p>
                <p className="text-sm text-slate-700 mt-1">{rule.explanation}</p>
              </li>
            ))}
            {visualEvidence.auditTrail.length === 0 && (
              <li className="text-sm text-slate-500">No audit entries yet.</li>
            )}
          </ul>
        )}
      </div>
    </section>
  );
}
