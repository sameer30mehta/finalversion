import { X } from 'lucide-react'

export default function Modal({ children, onClose, title, maxWidth = 'max-w-3xl' }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className={`modal-content ${maxWidth} w-full mx-4`}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
            <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X size={18} strokeWidth={1.5} className="text-slate-500" />
            </button>
          </div>
        )}
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}
