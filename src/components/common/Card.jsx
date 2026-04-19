export function Card({ children, className = '', hover = false, onClick }) {
  return (
    <div
      className={`bg-white rounded-xl border border-slate-200 shadow-sm p-5 transition-all duration-200 ${
        hover ? 'hover:shadow-md cursor-pointer' : ''
      } ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  )
}

export function CardHeader({ children, className = '' }) {
  return (
    <div className={`flex items-center justify-between mb-4 ${className}`}>
      {children}
    </div>
  )
}

export function CardTitle({ children, icon: Icon, className = '' }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {Icon && <Icon size={18} strokeWidth={1.5} className="text-slate-500" />}
      <h3 className="text-base font-semibold text-slate-800">{children}</h3>
    </div>
  )
}

export function Badge({ children, variant = 'default', className = '' }) {
  const variants = {
    default: 'bg-slate-100 text-slate-700',
    primary: 'bg-blue-50 text-blue-700',
    success: 'bg-emerald-50 text-emerald-700',
    warning: 'bg-amber-50 text-amber-700',
    danger: 'bg-red-50 text-red-700',
  }

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${variants[variant]} ${className}`}>
      {children}
    </span>
  )
}

export function Chip({ children, active = false, onClick, className = '' }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 border ${
        active
          ? 'bg-blue-50 text-blue-700 border-blue-200'
          : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
      } ${className}`}
    >
      {children}
    </button>
  )
}
