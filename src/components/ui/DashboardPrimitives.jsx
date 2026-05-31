import React from 'react';

const toneClasses = {
  slate: 'bg-slate-50 text-slate-600 border-slate-200',
  indigo: 'bg-indigo-50 text-indigo-700 border-indigo-100',
  blue: 'bg-blue-50 text-blue-700 border-blue-200',
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  amber: 'bg-amber-50 text-amber-700 border-amber-200',
  orange: 'bg-orange-50 text-orange-700 border-orange-200',
  red: 'bg-red-50 text-red-700 border-red-200',
};

export function cleanText(value) {
  if (value === null || value === undefined || value === '') return 'Not available';
  return String(value)
    .replace(/â‚¹/g, 'INR ')
    .replace(/â€“/g, '-')
    .replace(/â€”/g, '-')
    .replace(/Ã—/g, 'x')
    .replace(/â†‘/g, 'Up')
    .replace(/â†“/g, 'Down')
    .replace(/â€º/g, '>');
}

export function formatNumber(value, digits = 2) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 'Not available';
  return numeric.toFixed(digits);
}

export function formatPercent(value, digits = 0) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 'Not available';
  const percent = numeric <= 1 ? numeric * 100 : numeric;
  return `${percent.toFixed(digits)}%`;
}

export function Badge({ children, tone = 'slate', className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-bold uppercase tracking-wider ${toneClasses[tone] || toneClasses.slate} ${className}`}>
      {children}
    </span>
  );
}

export function SectionCard({ children, className = '' }) {
  return (
    <section className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6 ${className}`}>
      {children}
    </section>
  );
}

export function SectionHeader({ icon, title, eyebrow, description, actions }) {
  return (
    <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <div className="mb-1 flex flex-wrap items-center gap-2">
          {icon && <span className="material-symbols-outlined text-[20px] text-indigo-500">{icon}</span>}
          <h3 className="text-lg font-bold text-slate-900">{title}</h3>
          {eyebrow && <Badge tone="indigo">{eyebrow}</Badge>}
        </div>
        {description && <p className="max-w-3xl text-sm font-medium leading-relaxed text-slate-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2 lg:justify-end">{actions}</div>}
    </div>
  );
}

export function MetricCard({ label, value, sublabel, tone = 'slate', icon }) {
  const toneClass = {
    slate: 'text-slate-900 bg-slate-50 border-slate-200',
    indigo: 'text-indigo-900 bg-indigo-50 border-indigo-100',
    emerald: 'text-emerald-900 bg-emerald-50 border-emerald-100',
    amber: 'text-amber-900 bg-amber-50 border-amber-100',
    red: 'text-red-900 bg-red-50 border-red-100',
  }[tone] || 'text-slate-900 bg-slate-50 border-slate-200';

  return (
    <div className={`rounded-xl border p-4 ${toneClass}`}>
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p>
        {icon && <span className="material-symbols-outlined text-[18px] opacity-70">{icon}</span>}
      </div>
      <p className="break-words text-xl font-bold leading-tight text-current">{cleanText(value)}</p>
      {sublabel && <p className="mt-1 text-[12px] font-semibold leading-snug text-slate-500">{cleanText(sublabel)}</p>}
    </div>
  );
}

export function InfoItem({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <p className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="break-words text-sm font-semibold leading-snug text-slate-800">{cleanText(value)}</p>
    </div>
  );
}

export function EmptyState({ title = 'No data available', description }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm">
      <p className="font-bold text-slate-800">{title}</p>
      {description && <p className="mt-1 font-medium leading-relaxed text-slate-500">{description}</p>}
    </div>
  );
}
