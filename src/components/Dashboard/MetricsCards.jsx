import { useState } from 'react'
import { IndianRupee, TrendingDown, Timer, ChevronDown, ChevronUp } from 'lucide-react'
import { formatINR } from '../../data/mockData'

export default function KeyMetrics({ data, isFraud }) {
  const [expanded, setExpanded] = useState(false)

  const accentColor = isFraud ? 'text-red-600' : 'text-zinc-900'
  const monoClass = 'font-mono font-semibold'

  return (
    <div className={`bento-card ${isFraud ? 'bento-card--danger' : ''} flex flex-col justify-between h-full`}>
      <div>
        <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-[0.12em]">Key Metrics</span>

        {/* Primary: Market Value — always visible */}
        <div className="mt-4 mb-1">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
              <IndianRupee size={14} className="text-blue-600" strokeWidth={1.5} />
            </div>
            <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Market Value</span>
          </div>
          <p className={`text-xl ${monoClass} ${accentColor} leading-tight`}>
            {formatINR(data.marketValueLow)} – {formatINR(data.marketValueHigh)}
          </p>
          <p className="text-[11px] text-zinc-400 mt-1">{data.marketValueBasis}</p>
        </div>

        {/* Expandable section */}
        <div className={`overflow-hidden transition-all duration-300 ease-out ${
          expanded ? 'max-h-[300px] opacity-100 mt-4' : 'max-h-0 opacity-0'
        }`}>
          {/* Distress Value */}
          <div className="mb-4 pb-4 border-b border-zinc-100">
            <div className="flex items-center gap-2 mb-1.5">
              <div className={`w-7 h-7 rounded-lg ${isFraud ? 'bg-red-50' : 'bg-amber-50'} flex items-center justify-center`}>
                <TrendingDown size={14} className={isFraud ? 'text-red-500' : 'text-amber-600'} strokeWidth={1.5} />
              </div>
              <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Distress Value</span>
            </div>
            <p className={`text-lg ${monoClass} ${accentColor}`}>
              {formatINR(data.distressValueLow)} – {formatINR(data.distressValueHigh)}
            </p>
            <p className="text-[11px] text-zinc-400 mt-1">{data.distressBasis}</p>
          </div>

          {/* Time to Liquidate */}
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center">
                <Timer size={14} className="text-emerald-600" strokeWidth={1.5} />
              </div>
              <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Time to Liquidate</span>
            </div>
            <p className={`text-lg ${monoClass} ${accentColor}`}>
              {data.liquidationDaysLow} – {data.liquidationDaysHigh} days
            </p>
            {/* Visual progress bar */}
            <div className="mt-2">
              <div className="progress-bar">
                <div
                  className="progress-bar-fill"
                  style={{
                    width: `${(data.liquidationDaysHigh / 180) * 100}%`,
                    background: isFraud
                      ? 'linear-gradient(90deg, #DC2626, #EF4444)'
                      : 'linear-gradient(90deg, #2563EB, #60A5FA)',
                  }}
                />
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[10px] text-zinc-400">0 days</span>
                <span className="text-[10px] text-zinc-400">180 days</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Expand/Collapse */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-center gap-1.5 text-[12px] font-medium text-blue-600 hover:text-blue-700 transition-colors w-full group"
      >
        {expanded ? (
          <><ChevronUp size={14} className="transition-transform group-hover:-translate-y-0.5" /> Show Less</>
        ) : (
          <><ChevronDown size={14} className="transition-transform group-hover:translate-y-0.5" /> View Full Details</>
        )}
      </button>
    </div>
  )
}
