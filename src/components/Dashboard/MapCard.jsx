import { useState } from 'react'
import { Train, Droplets, CircleDot } from 'lucide-react'

export default function MapCard({ data }) {
  const [layers, setLayers] = useState({ circleRate: true, metro: true, floodZone: false })
  const toggle = (k) => setLayers(p => ({ ...p, [k]: !p[k] }))

  return (
    <div className="bento-card p-0 overflow-hidden">
      <div className="relative h-[280px] bg-gradient-to-br from-blue-50 via-zinc-50 to-emerald-50">
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 280" preserveAspectRatio="xMidYMid slice">
          {/* Grid */}
          {Array.from({ length: 20 }).map((_, i) => (
            <line key={`v${i}`} x1={i*40} y1={0} x2={i*40} y2={280} stroke="#E4E4E7" strokeWidth={0.5} />
          ))}
          {Array.from({ length: 7 }).map((_, i) => (
            <line key={`h${i}`} x1={0} y1={i*40} x2={800} y2={i*40} stroke="#E4E4E7" strokeWidth={0.5} />
          ))}

          {/* Roads */}
          <path d="M0 140 L800 140" stroke="#D4D4D8" strokeWidth={3.5} />
          <path d="M400 0 L400 280" stroke="#D4D4D8" strokeWidth={3.5} />
          <path d="M200 280 L600 0" stroke="#D4D4D8" strokeWidth={1.5} opacity={0.4} />

          {/* Circle Rate Zone */}
          {layers.circleRate && (
            <g className="animate-fade-in">
              <rect x={250} y={70} width={300} height={140} rx={10} fill="#2563EB" fillOpacity={0.04} stroke="#2563EB" strokeWidth={1.5} strokeDasharray="6 3" />
              <text x={264} y={92} fontSize={10} fill="#2563EB" fontWeight={600} fontFamily="Inter, sans-serif">Circle Rate: ₹18,500/sqft</text>
            </g>
          )}

          {/* Metro */}
          {layers.metro && (
            <g className="animate-fade-in">
              <path d="M50 200 L750 80" stroke="#7C3AED" strokeWidth={2.5} strokeDasharray="8 4" />
              <circle cx={420} cy={130} r={7} fill="#7C3AED" />
              <circle cx={420} cy={130} r={12} fill="none" stroke="#7C3AED" strokeWidth={1} opacity={0.4} />
              <text x={436} y={126} fontSize={10} fill="#7C3AED" fontWeight={600} fontFamily="Inter, sans-serif">Western Express Metro</text>
              <text x={436} y={139} fontSize={9} fill="#7C3AED" opacity={0.6} fontFamily="Inter, sans-serif">500m from property</text>
            </g>
          )}

          {/* Flood zone */}
          {layers.floodZone && (
            <g className="animate-fade-in">
              <ellipse cx={620} cy={200} rx={110} ry={55} fill="#DC2626" fillOpacity={0.06} stroke="#DC2626" strokeWidth={1} strokeDasharray="4 2" />
              <text x={578} y={204} fontSize={10} fill="#DC2626" fontWeight={500} fontFamily="Inter, sans-serif">Flood Risk Zone</text>
            </g>
          )}

          {/* Property pin */}
          <circle cx={400} cy={140} r={18} fill="#2563EB" fillOpacity={0.08}>
            <animate attributeName="r" from="10" to="22" dur="1.5s" repeatCount="indefinite" />
            <animate attributeName="opacity" from="0.2" to="0" dur="1.5s" repeatCount="indefinite" />
          </circle>
          <circle cx={400} cy={140} r={6} fill="#2563EB" stroke="white" strokeWidth={2.5} />
        </svg>

        {/* Layer Chips */}
        <div className="absolute top-3 right-3 flex gap-1.5">
          {[
            { key: 'circleRate', icon: CircleDot, label: 'Circle Rate' },
            { key: 'metro', icon: Train, label: 'Metro' },
            { key: 'floodZone', icon: Droplets, label: 'Flood Zone' },
          ].map(l => (
            <button key={l.key} onClick={() => toggle(l.key)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition-all ${
                layers[l.key]
                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                  : 'bg-white/80 text-zinc-400 border-zinc-200 backdrop-blur-sm'
              }`}>
              <l.icon size={12} /> {l.label}
            </button>
          ))}
        </div>

        {/* Coordinates */}
        <div className="absolute bottom-3 right-3 bg-white/80 backdrop-blur-sm px-2.5 py-1 rounded-lg border border-zinc-200/80">
          <span className="text-[10px] font-mono text-zinc-500">{data.lat.toFixed(4)}°N, {data.lng.toFixed(4)}°E</span>
        </div>
      </div>
    </div>
  )
}
