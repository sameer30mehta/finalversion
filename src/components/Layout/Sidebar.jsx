import { LayoutGrid, FileSearch, TrendingUp, ShieldAlert, Settings } from 'lucide-react'

export default function Sidebar() {
  return (
    <div className="w-[260px] h-screen bg-[#FDFDFE] border-r border-[#F3F4F6] flex flex-col fixed left-0 top-0 z-50">
      {/* Logo */}
      <div className="h-[76px] px-7 flex items-center gap-3 border-b border-[#F3F4F6]">
        <div className="flex items-center justify-center text-[#4A3EE0]">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L3 7V17L12 22L21 17V7L12 2Z" fill="currentColor"/>
            <path d="M12 22V12" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M12 12L21 7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M12 12L3 7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <span className="text-[20px] font-bold text-[#111827] tracking-tight">PropScore</span>
      </div>

      <div className="px-5 pt-8 pb-4 flex-shrink-0">
        <button className="w-full bg-[#4A3EE0] hover:bg-[#3C30C7] text-white py-3 rounded-xl flex items-center justify-center font-semibold text-[14px] shadow-sm tracking-wide">
          New Analysis
        </button>
      </div>

      {/* Nav Menu */}
      <div className="px-4 flex flex-col gap-1 flex-1 overflow-y-auto">
        <NavItem icon={LayoutGrid} label="Command Center" active />
        <NavItem icon={FileSearch} label="Property Analysis" />
        <NavItem icon={TrendingUp} label="Market Trends" />
        <NavItem icon={ShieldAlert} label="Risk Reports" />
        <NavItem icon={Settings} label="Settings" />
      </div>

      {/* Bottom Settings */}
      <div className="p-4 mt-auto border-t border-[#F3F4F6] flex-shrink-0">
        <NavItem icon={Settings} label="Settings" />
      </div>
    </div>
  )
}

function NavItem({ icon: Icon, label, active }) {
  if (active) {
    return (
      <div className="flex items-center gap-3 px-3 py-3 bg-[#F0F0FC] text-[#4A3EE0] rounded-xl relative font-semibold w-full cursor-pointer">
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-[#4A3EE0] rounded-r-md"></div>
        <Icon size={18} strokeWidth={2.5} />
        <span className="text-[14px]">{label}</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 px-3 py-3 text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#111827] rounded-xl font-medium w-full cursor-pointer transition-colors">
      <Icon size={18} strokeWidth={2} />
      <span className="text-[14px]">{label}</span>
    </div>
  )
}
