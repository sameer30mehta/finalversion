import { ShieldCheck, FileText, XCircle, HelpCircle } from 'lucide-react'

export default function BottomBar({ data, isFraud }) {
  return (
    <div className="h-[64px] bg-white/90 backdrop-blur-xl border-t border-zinc-200/80 px-8 flex items-center justify-between sticky bottom-0 z-40">
      {/* Left: LTV */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-medium text-zinc-500">Recommended LTV</span>
          <div className="tooltip-trigger">
            <HelpCircle size={13} className="text-zinc-300" />
            <div className="tooltip-content" style={{ bottom: 'calc(100% + 10px)' }}>
              <p className="text-[11px] text-zinc-300 leading-relaxed">{data.ltvExplanation}</p>
            </div>
          </div>
        </div>
        <span className={`text-2xl font-mono font-bold ${isFraud ? 'text-red-600' : 'text-blue-600'}`}>
          {data.recommendedLTV}%
        </span>
        {isFraud && (
          <span className="text-[10px] font-semibold text-red-600 bg-red-50 px-2.5 py-1 rounded-full border border-red-100 animate-pulse">
            ⚠ Risk-adjusted
          </span>
        )}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        <button className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium text-red-600 hover:bg-red-50 rounded-xl transition-colors border border-red-100">
          <XCircle size={15} strokeWidth={1.5} />
          Reject
        </button>
        <button className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium text-zinc-600 hover:bg-zinc-50 rounded-xl transition-colors border border-zinc-200">
          <FileText size={15} strokeWidth={1.5} />
          Request Info
        </button>
        <button
          className={`flex items-center gap-1.5 px-5 py-2 text-[13px] font-semibold text-white rounded-xl transition-all ${
            isFraud
              ? 'bg-zinc-300 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 shadow-sm hover:shadow-md'
          }`}
          disabled={isFraud}
        >
          <ShieldCheck size={15} strokeWidth={1.5} />
          Approve Loan
        </button>
      </div>
    </div>
  )
}
