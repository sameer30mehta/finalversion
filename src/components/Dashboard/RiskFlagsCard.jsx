import { AlertTriangle, CheckCircle2, XOctagon, ShieldAlert } from 'lucide-react'

export default function RiskFlagsCard({ flags }) {
  const getIcon = (type) => {
    switch (type) {
      case 'danger': return XOctagon
      case 'success': return CheckCircle2
      default: return AlertTriangle
    }
  }

  return (
    <div className="bento-card h-full">
      <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-[0.12em]">Risk Assessment</span>

      <div className="mt-4 space-y-0">
        {flags.map((f, i) => {
          const Icon = getIcon(f.type)

          return (
            <div key={i} className={`flex items-start gap-3 py-3 ${
              i !== flags.length - 1 ? 'border-b border-zinc-100' : ''
            }`}>
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                f.type === 'danger' ? 'bg-red-50' :
                f.type === 'success' ? 'bg-emerald-50' : 'bg-amber-50'
              }`}>
                <Icon size={14} strokeWidth={1.5} className={
                  f.type === 'danger' ? 'text-red-500' :
                  f.type === 'success' ? 'text-emerald-600' : 'text-amber-600'
                } />
              </div>

              <p className={`text-[13px] leading-relaxed flex-1 ${
                f.type === 'danger' ? 'text-red-700 font-medium' : 'text-zinc-600'
              }`}>
                {f.text}
              </p>

              <span className={`text-[10px] font-semibold uppercase tracking-wider flex-shrink-0 mt-0.5 ${
                f.type === 'danger' ? 'text-red-500' :
                f.type === 'success' ? 'text-emerald-600' :
                'text-amber-600'
              }`}>
                {f.severity}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
