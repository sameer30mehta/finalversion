import { Building2, MapPin, Ruler, Calendar, Layers, ChevronRight } from 'lucide-react'

export default function CaseOverview({ data, isFraud }) {
  return (
    <div className={`bento-card ${isFraud ? 'bento-card--danger' : ''} flex flex-col justify-between h-full`}>
      {/* Case ID */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-[0.12em]">Case Overview</span>
          <span className="text-[10px] font-mono text-zinc-400">#PS-2024-00847</span>
        </div>

        {/* Property Name */}
        <h2 className="text-[17px] font-semibold text-zinc-900 mb-1 leading-snug">
          {data.address.split(',')[0]}
        </h2>
        <div className="flex items-center gap-1.5 text-[13px] text-zinc-500 mb-5">
          <MapPin size={13} strokeWidth={1.5} className="text-zinc-400" />
          <span>{data.locality}, {data.city}</span>
        </div>

        {/* Property Details Grid */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-3">
          <DetailRow icon={Building2} label="Type" value={data.propertyType} />
          <DetailRow icon={Layers} label="Config" value={data.configuration} />
          <DetailRow
            icon={Ruler}
            label="Carpet Area"
            value={`${data.carpetArea} ${data.areaUnit}`}
            highlight={isFraud}
          />
          <DetailRow icon={Calendar} label="Age" value={`${data.ageYears} years`} />
        </div>
      </div>

      {/* Legal Status Footer */}
      <div className="mt-5 pt-4 border-t border-zinc-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isFraud ? 'bg-red-500' : 'bg-emerald-500'}`} />
          <span className="text-[12px] font-medium text-zinc-600">
            {isFraud ? 'Anomaly Detected' : data.legalStatus} · {data.titleType}
          </span>
        </div>
        <span className="text-[12px] text-zinc-400">Floor {data.floor}/{data.totalFloors}</span>
      </div>
    </div>
  )
}

function DetailRow({ icon: Icon, label, value, highlight = false }) {
  return (
    <div className="flex items-center gap-2.5">
      <Icon size={14} strokeWidth={1.5} className="text-zinc-300 flex-shrink-0" />
      <div>
        <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">{label}</p>
        <p className={`text-[13px] font-semibold ${highlight ? 'text-red-600' : 'text-zinc-800'}`}>{value}</p>
      </div>
    </div>
  )
}
