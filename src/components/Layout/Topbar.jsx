import { LayoutGrid, Bell, User } from 'lucide-react'

export default function Topbar() {
  return (
    <div className="h-[76px] bg-[#FDFDFE] border-b border-[#F3F4F6] flex items-center justify-between px-8 w-full sticky top-0 z-40">
      {/* Left Links */}
      <div className="flex h-full gap-2">
        <NavLink label="Dashboard" active />
        <NavLink label="Portfolio" />
        <NavLink label="Market Trends" />
        <NavLink label="Risk Reports" />
        <NavLink label="Settings" />
      </div>

      {/* Right Icons */}
      <div className="flex items-center gap-5">
        <button className="text-[#6B7280] hover:text-[#111827] transition-colors p-2 hover:bg-gray-50 rounded-full">
          <LayoutGrid size={20} strokeWidth={2} />
        </button>
        <button className="text-[#6B7280] hover:text-[#111827] transition-colors relative p-2 hover:bg-gray-50 rounded-full">
          <Bell size={20} strokeWidth={2} />
          <div className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-[#EF4444] rounded-full border-2 border-white"></div>
        </button>
        <div className="w-8 h-8 bg-[#E5E7EB] rounded-full flex items-center justify-center cursor-pointer hover:bg-[#D1D5DB] transition-colors overflow-hidden ml-1">
          <User size={16} className="text-[#6B7280] mt-1.5" strokeWidth={2.5} />
        </div>
      </div>
    </div>
  )
}

function NavLink({ label, active }) {
  if (active) {
    return (
      <div className="h-full flex items-center justify-center px-4 relative pt-1 cursor-pointer">
        <span className="text-[15px] font-bold text-[#111827]">{label}</span>
        <div className="absolute bottom-0 left-0 w-full h-[3px] bg-[#4A3EE0] rounded-t-[4px]"></div>
      </div>
    )
  }

  return (
    <div className="h-full flex items-center justify-center px-4 pt-1 cursor-pointer group">
      <span className="text-[15px] font-medium text-[#6B7280] group-hover:text-[#111827] transition-colors">{label}</span>
    </div>
  )
}
