import { useEffect, useState, useRef } from 'react'
import { TrendingUp, TrendingDown, Info } from 'lucide-react'

export default function PropScoreGauge({ score, category, confidence, confidenceBreakdown, isFraud, fieldDataIncluded, onToggleFieldData }) {
  const [displayScore, setDisplayScore] = useState(0)
  const animRef = useRef(null)

  useEffect(() => {
    const start = displayScore
    const end = score
    const dur = 1200
    const startTime = Date.now()
    const animate = () => {
      const p = Math.min((Date.now() - startTime) / dur, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      setDisplayScore(Math.round(start + (end - start) * eased))
      if (p < 1) animRef.current = requestAnimationFrame(animate)
    }
    animRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animRef.current)
  }, [score])

  const radius = 80
  const circ = Math.PI * radius
  const offset = circ - (displayScore / 100) * circ

  const color = displayScore >= 70
    ? { stroke: '#2563EB', glow: 'rgba(37,99,235,0.12)', text: 'text-blue-600' }
    : displayScore >= 50
      ? { stroke: '#D97706', glow: 'rgba(217,119,6,0.12)', text: 'text-amber-600' }
      : { stroke: '#DC2626', glow: 'rgba(220,38,38,0.12)', text: 'text-red-600' }

  const confLevel = Math.round(confidence * 5)

  return (
    <div className={`bento-card ${isFraud ? 'bento-card--danger' : 'bento-card--accent'} flex flex-col items-center justify-center h-full relative`}>
      <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-[0.12em] mb-2">
        PropScore™
      </span>

      {/* Gauge */}
      <div className="relative w-44 h-24 mb-1">
        <svg viewBox="0 0 200 110" className="w-full h-full">
          <path d="M 20 100 A 80 80 0 0 1 180 100" className="gauge-track" />
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            className="gauge-value"
            stroke={color.stroke}
            strokeDasharray={circ}
            strokeDashoffset={offset}
            filter={`drop-shadow(0 0 6px ${color.glow})`}
          />
          {/* Tick marks */}
          {[0, 25, 50, 75, 100].map(t => {
            const a = Math.PI - (t / 100) * Math.PI
            const x1 = 100 + 90 * Math.cos(a), y1 = 100 - 90 * Math.sin(a)
            const x2 = 100 + 94 * Math.cos(a), y2 = 100 - 94 * Math.sin(a)
            return <line key={t} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#D4D4D8" strokeWidth={1.5} />
          })}
        </svg>
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-center">
          <span className={`text-4xl font-bold font-mono ${color.text}`}>{displayScore}</span>
        </div>
      </div>

      <p className={`text-[13px] font-medium ${isFraud ? 'text-red-600' : 'text-zinc-600'} mb-3`}>
        {category}
      </p>

      {/* Trend */}
      <div className={`flex items-center gap-1 text-[11px] font-medium mb-4 ${isFraud ? 'text-red-500' : 'text-emerald-600'}`}>
        {isFraud ? <TrendingDown size={13} /> : <TrendingUp size={13} />}
        {isFraud ? '-33 from baseline' : '+2 from last'}
      </div>

      {/* Confidence Dots with Tooltip */}
      <div className="tooltip-trigger">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">Confidence</span>
          <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className={`conf-dot ${i <= confLevel ? 'filled' : ''}`} />
            ))}
          </div>
          <span className="text-[13px] font-mono font-semibold text-zinc-700">{confidence.toFixed(2)}</span>
        </div>
        <div className="tooltip-content">
          <p className="font-semibold text-[11px] mb-1.5 text-zinc-300">Confidence Breakdown</p>
          <div className="space-y-1 font-mono text-[11px]">
            <div className="flex justify-between"><span className="text-zinc-400">Base (Address)</span><span>0.40</span></div>
            <div className="flex justify-between"><span className="text-zinc-400">+ Property Details</span><span>0.15</span></div>
            <div className="flex justify-between"><span className="text-zinc-400">+ Legal Verification</span><span>0.10</span></div>
            {fieldDataIncluded && (
              <div className="flex justify-between"><span className="text-zinc-400">+ Visual Analysis</span><span>0.13</span></div>
            )}
            <div className="flex justify-between border-t border-zinc-600 pt-1 mt-1">
              <span className="font-semibold">Total</span>
              <span className="font-semibold text-blue-400">{confidence.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Field Data Toggle */}
      <div className="mt-4 pt-3 border-t border-zinc-200/60 w-full flex items-center justify-between">
        <span className="text-[11px] font-medium text-zinc-500">Include Field Data</span>
        <button
          className={`toggle ${fieldDataIncluded ? 'on' : ''}`}
          onClick={onToggleFieldData}
          aria-label="Toggle field data"
        />
      </div>
    </div>
  )
}
