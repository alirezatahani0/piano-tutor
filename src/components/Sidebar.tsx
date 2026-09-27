import Icon from './Icon'

interface SidebarProps {
  activePage: 'library' | 'settings'
  setActivePage: (page: 'library' | 'settings') => void
  collapsed: boolean
  setCollapsed: (collapsed: boolean) => void
}

export default function Sidebar({ activePage, setActivePage, collapsed, setCollapsed }: SidebarProps) {
  return (
    <aside
      className={`fixed inset-y-0 left-0 z-20 hidden flex-col border-r border-[#e7e9ee] bg-white py-7 transition-[width,padding] duration-300 lg:flex ${
        collapsed ? 'w-[82px] px-3' : 'w-[220px] px-5'
      }`}
    >
      <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3 px-2'}`}>
        <div className="flex h-9 w-9 items-center justify-center rounded-[11px] bg-[#6458e8] text-white">
          <div className="flex items-end gap-[2px]">
            {[10, 16, 12, 20].map((height, i) => (
              <span key={i} className="w-[3px] rounded-full bg-white" style={{ height }} />
            ))}
          </div>
        </div>
        {!collapsed && <span className="text-[18px] font-bold tracking-[-0.03em]">Keylight</span>}
      </div>

      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-[86px] flex h-7 w-7 items-center justify-center rounded-full border border-[#e1e4e9] bg-white text-[#747c8d] shadow-sm transition hover:text-[#6458e8]"
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <span className={`transition-transform duration-300 ${collapsed ? '' : 'rotate-180'}`}>
          <Icon name="chevron" size={15} />
        </span>
      </button>

      <nav className="mt-12 space-y-2" aria-label="Primary navigation">
        {[
          { id: 'library', icon: 'library' as const, label: 'Song library' },
          { id: 'settings', icon: 'settings' as const, label: 'Device settings' },
        ].map(item => (
          <button
            key={item.id}
            onClick={() => setActivePage(item.id as 'library' | 'settings')}
            title={item.label}
            className={`flex w-full items-center rounded-xl py-3 text-sm font-semibold transition ${
              activePage === item.id
                ? 'bg-[#efedff] text-[#5f54dc]'
                : 'text-[#6f7788] hover:bg-[#f6f7f9]'
            } ${collapsed ? 'justify-center px-2' : 'gap-3 px-4'}`}
          >
            <Icon name={item.icon} size={19} />
            {!collapsed && item.label}
          </button>
        ))}
      </nav>

      <div className="mt-auto">
        {!collapsed && (
          <div className="mb-5 rounded-2xl bg-[#f6f5ff] p-4">
            <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-white text-[#6458e8] shadow-sm">
              <Icon name="sparkle" size={17} />
            </div>
            <p className="text-sm font-semibold">Practice smarter</p>
            <p className="mt-1 text-xs leading-5 text-[#777f90]">Build a daily streak with guided sessions.</p>
          </div>
        )}
        <button
          title="Help & support"
          className={`flex items-center py-2 text-sm font-medium text-[#747c8d] ${
            collapsed ? 'w-full justify-center px-2' : 'gap-3 px-3'
          }`}
        >
          <Icon name="help" size={19} />
          {!collapsed && 'Help & support'}
        </button>
        <div
          className={`mt-4 flex items-center border-t border-[#eceef2] pt-5 ${
            collapsed ? 'justify-center' : 'gap-3 px-2'
          }`}
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#fee0d8] text-sm font-bold text-[#a94c3d]">
            AM
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">Alex Morgan</p>
              <p className="text-[11px] text-[#9299a7]">Free plan</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}
