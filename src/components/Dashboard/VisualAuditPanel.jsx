import { useState, useEffect } from 'react'
import { Shield, Star, Eye, Sparkles, Camera, X, ZoomIn } from 'lucide-react'

const agentIcons = { condition: Shield, quality: Star, features: Eye }
const imageLabels = ['Exterior', 'Living Room', 'Kitchen']
const imageGradients = [
  'from-blue-300 to-indigo-400',
  'from-amber-300 to-orange-400',
  'from-emerald-300 to-teal-400',
]

const imagePatterns = [
  <g key="ext"><rect x="20" y="30" width="60" height="50" rx="2" fill="rgba(255,255,255,0.3)"/><rect x="30" y="40" width="15" height="12" rx="1" fill="rgba(255,255,255,0.4)"/><rect x="55" y="40" width="15" height="12" rx="1" fill="rgba(255,255,255,0.4)"/><rect x="30" y="58" width="15" height="12" rx="1" fill="rgba(255,255,255,0.4)"/><rect x="55" y="58" width="15" height="12" rx="1" fill="rgba(255,255,255,0.4)"/><rect x="42" y="65" width="16" height="15" rx="1" fill="rgba(255,255,255,0.5)"/></g>,
  <g key="liv"><rect x="15" y="55" width="70" height="20" rx="3" fill="rgba(255,255,255,0.3)"/><rect x="15" y="40" width="25" height="15" rx="2" fill="rgba(255,255,255,0.2)"/><rect x="60" y="25" width="20" height="30" rx="2" fill="rgba(255,255,255,0.2)"/><rect x="10" y="75" width="80" height="5" rx="1" fill="rgba(255,255,255,0.15)"/></g>,
  <g key="kit"><rect x="10" y="20" width="80" height="25" rx="2" fill="rgba(255,255,255,0.25)"/><rect x="10" y="48" width="80" height="8" rx="1" fill="rgba(255,255,255,0.35)"/><rect x="10" y="59" width="25" height="25" rx="2" fill="rgba(255,255,255,0.2)"/><rect x="38" y="59" width="25" height="25" rx="2" fill="rgba(255,255,255,0.2)"/><rect x="66" y="59" width="24" height="25" rx="2" fill="rgba(255,255,255,0.2)"/></g>,
]

function AgentCard({ agentKey, agent, isLoading }) {
  const Icon = agentIcons[agentKey]
  const colors = {
    condition: { bg: 'bg-blue-50', icon: 'text-blue-600', ring: 'ring-blue-100' },
    quality: { bg: 'bg-violet-50', icon: 'text-violet-600', ring: 'ring-violet-100' },
    features: { bg: 'bg-emerald-50', icon: 'text-emerald-600', ring: 'ring-emerald-100' },
  }
  const c = colors[agentKey]

  return (
    <div className={`rounded-2xl p-4 border transition-all duration-500 ${
      isLoading ? 'bg-zinc-50 border-zinc-200' :
      agent.scoreColor === 'red' ? 'bg-red-50/60 border-red-200/80' :
      'bg-white border-zinc-200/80'
    }`}>
      <div className="flex items-center gap-2.5 mb-3">
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isLoading ? 'bg-zinc-100' : c.bg}`}>
          <Icon size={15} strokeWidth={1.5} className={isLoading ? 'text-zinc-300 animate-pulse' : c.icon} />
        </div>
        <div className="flex-1 min-w-0">
          <h5 className="text-[13px] font-semibold text-zinc-800 leading-tight">{agent.title}</h5>
          {!isLoading && (
            <span className={`text-[10px] font-medium ${
              agent.scoreColor === 'red' ? 'text-red-500' :
              agent.scoreColor === 'green' ? 'text-emerald-600' : 'text-blue-600'
            }`}>{agent.status}</span>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <div className="h-3 rounded-full animate-shimmer w-full" />
          <div className="h-3 rounded-full animate-shimmer w-4/5" />
          <div className="h-3 rounded-full animate-shimmer w-3/5" />
        </div>
      ) : (
        <>
          <p className="text-[12px] text-zinc-500 leading-relaxed mb-3">{agent.findings}</p>
          {agent.score && (
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold ${
              agent.scoreColor === 'red' ? 'bg-red-100 text-red-700' :
              agent.scoreColor === 'green' ? 'bg-emerald-100 text-emerald-700' :
              'bg-blue-100 text-blue-700'
            }`}>
              Score: {agent.score}
            </span>
          )}
        </>
      )}
    </div>
  )
}

function ImageModal({ imageIndex, annotations, onClose }) {
  const annotationData = imageIndex === 0 ? annotations?.exterior :
    imageIndex === 1 ? annotations?.living : annotations?.kitchen

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content max-w-4xl w-full mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200/80">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-blue-50 rounded-lg flex items-center justify-center">
              <Sparkles size={14} className="text-blue-600" />
            </div>
            <div>
              <h3 className="text-[15px] font-semibold text-zinc-900">AI Detection — {imageLabels[imageIndex]}</h3>
              <p className="text-[11px] text-zinc-400">{annotationData?.length || 0} objects identified</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-100 rounded-xl transition-colors">
            <X size={16} className="text-zinc-400" />
          </button>
        </div>

        <div className="p-6">
          <div className="relative rounded-2xl overflow-hidden border border-zinc-200">
            <svg viewBox="0 0 600 400" className={`w-full h-auto bg-gradient-to-br ${imageGradients[imageIndex]}`}>
              <defs>
                <pattern id="modal-grid" width="30" height="30" patternUnits="userSpaceOnUse">
                  <path d="M 30 0 L 0 0 0 30" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5"/>
                </pattern>
              </defs>
              <rect width="600" height="400" fill="url(#modal-grid)" />
              <g transform="scale(6)">{imagePatterns[imageIndex]}</g>
              <g transform="translate(270,170)"><circle r="30" fill="rgba(255,255,255,0.15)"/></g>

              {annotationData?.map((ann, idx) => (
                <g key={idx} className="animate-fade-in" style={{ animationDelay: `${idx * 0.2}s` }}>
                  <rect
                    x={ann.left * 6} y={ann.top * 4}
                    width={ann.width * 6} height={ann.height * 4}
                    fill="none" stroke="#2563EB" strokeWidth="2.5" rx="6"
                    strokeDasharray="8 4"
                  />
                  <rect x={ann.left * 6} y={ann.top * 4 - 24} width={ann.label.length * 7.5 + 20} height="22" rx="6" fill="#2563EB" />
                  <text x={ann.left * 6 + 10} y={ann.top * 4 - 9} fontSize="11" fill="white" fontWeight="500" fontFamily="Inter, sans-serif">
                    {ann.label}
                  </text>
                </g>
              ))}

              <rect x="0" width="600" height="2" fill="rgba(37,99,235,0.3)">
                <animate attributeName="y" from="0" to="400" dur="2.5s" repeatCount="indefinite" />
              </rect>
            </svg>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {annotationData?.map((ann, idx) => (
              <div key={idx} className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-lg border border-blue-100">
                <div className="w-2.5 h-2.5 border-2 border-blue-500 rounded-sm" />
                <span className="text-[11px] font-medium text-blue-700">{ann.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function VisualAuditPanel({ agents, annotations, fieldDataIncluded }) {
  const [status, setStatus] = useState('idle')
  const [selectedImage, setSelectedImage] = useState(null)

  useEffect(() => {
    if (fieldDataIncluded) {
      setStatus('analyzing')
      const timer = setTimeout(() => setStatus('complete'), 2500)
      return () => clearTimeout(timer)
    } else {
      setStatus('idle')
    }
  }, [fieldDataIncluded])

  if (!fieldDataIncluded) {
    return (
      <div className="bento-card flex flex-col items-center justify-center py-16 text-center">
        <div className="w-14 h-14 bg-zinc-100 rounded-2xl flex items-center justify-center mb-4">
          <Camera size={24} className="text-zinc-300" />
        </div>
        <h3 className="text-[15px] font-semibold text-zinc-700 mb-1">AI Visual Audit</h3>
        <p className="text-[13px] text-zinc-400 max-w-sm">
          Enable "Include Field Data" in the PropScore card above to activate the multi-agent visual analysis engine.
        </p>
      </div>
    )
  }

  return (
    <div className="bento-card">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-violet-600 rounded-xl flex items-center justify-center">
            <Sparkles size={15} className="text-white" />
          </div>
          <div>
            <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-[0.12em]">
              AI-Powered Visual Audit
            </span>
            <p className="text-[11px] text-zinc-400">
              {status === 'analyzing' ? 'Agents processing images...' : '3 agents · Analysis complete'}
            </p>
          </div>
        </div>
        {status === 'complete' && (
          <span className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" /> Complete
          </span>
        )}
      </div>

      {/* Image Gallery */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {imageLabels.map((label, idx) => (
          <button
            key={idx}
            onClick={() => setSelectedImage(idx)}
            className="relative h-28 rounded-2xl overflow-hidden border border-zinc-200/80 hover:border-blue-300 transition-all group cursor-pointer"
          >
            <svg viewBox="0 0 100 80" className={`w-full h-full bg-gradient-to-br ${imageGradients[idx]}`} preserveAspectRatio="xMidYMid slice">
              <defs>
                <pattern id={`g-${idx}`} width="10" height="10" patternUnits="userSpaceOnUse">
                  <path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="0.3"/>
                </pattern>
              </defs>
              <rect width="100" height="80" fill={`url(#g-${idx})`} />
              {imagePatterns[idx]}
            </svg>
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="bg-white/90 backdrop-blur-sm rounded-full p-2 shadow-sm">
                <ZoomIn size={14} className="text-zinc-700" />
              </div>
            </div>
            <span className="absolute bottom-2.5 left-3 text-[11px] font-semibold text-white drop-shadow-sm">{label}</span>
            {status === 'complete' && (
              <div className="absolute top-2 right-2 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center shadow-sm">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"><path d="M5 12l5 5L20 7"/></svg>
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Agent Cards */}
      <div className="grid grid-cols-3 gap-3">
        {Object.entries(agents).map(([key, agent]) => (
          <AgentCard key={key} agentKey={key} agent={agent} isLoading={status === 'analyzing'} />
        ))}
      </div>

      {selectedImage !== null && (
        <ImageModal
          imageIndex={selectedImage}
          annotations={annotations}
          onClose={() => setSelectedImage(null)}
        />
      )}
    </div>
  )
}
