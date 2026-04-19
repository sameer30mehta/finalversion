import { Train, LayoutGrid, Building2, TrendingUp, Sun, AlertTriangle, ArrowUpRight, ArrowDownRight } from 'lucide-react'

const iconMap = {
  train: Train, layout: LayoutGrid, building: Building2,
  trending: TrendingUp, sun: Sun, alert: AlertTriangle,
}

export default function DriversCard({ drivers }) {
  return (
    <div className="bento-card h-full">
      <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-[0.12em]">Valuation Drivers</span>

      <div className="mt-4 space-y-0">
        {drivers.map((d, i) => {
          const Icon = iconMap[d.icon] || TrendingUp
          const isPos = d.type === 'positive'
          const isDanger = d.type === 'danger'
          const isWarn = d.type === 'warning'

          return (
            <div key={i} className={`flex items-center gap-3 py-3 ${
              i !== drivers.length - 1 ? 'border-b border-zinc-100' : ''
            }`}>
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                isPos ? 'bg-emerald-50' : isDanger ? 'bg-red-50' : 'bg-amber-50'
              }`}>
                <Icon size={14} strokeWidth={1.5} className={
                  isPos ? 'text-emerald-600' : isDanger ? 'text-red-500' : 'text-amber-600'
                } />
              </div>

              <span className="text-[13px] text-zinc-700 flex-1 leading-tight">{d.label}</span>

              <div className={`flex items-center gap-0.5 font-mono text-[12px] font-semibold ${
                isPos ? 'text-emerald-600' : isDanger ? 'text-red-600' : 'text-amber-600'
              }`}>
                {isPos
                  ? <ArrowUpRight size={12} strokeWidth={2} />
                  : <ArrowDownRight size={12} strokeWidth={2} />
                }
                {d.impact}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
