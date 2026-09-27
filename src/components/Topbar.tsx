import Icon from './Icon'

interface TopbarProps {
  activePage: 'library' | 'settings'
}

export default function Topbar({ activePage }: TopbarProps) {
  const pageTitle = activePage === 'library' ? 'Good afternoon, Alex' : 'Device settings'
  const pageSubtitle =
    activePage === 'library' ? 'Ready for your next practice?' : 'Customize your connected Keylight device'

  return (
    <header className="flex h-[76px] items-center justify-between border-b border-[#e7e9ee] bg-white px-5 sm:px-8 lg:px-10">
      <div className="flex items-center gap-3 lg:hidden">
        <div className="flex h-9 w-9 items-center justify-center rounded-[11px] bg-[#6458e8] text-white">
          <div className="flex items-end gap-[2px]">
            {[10, 16, 12, 20].map((height, i) => (
              <span key={i} className="w-[3px] rounded-full bg-white" style={{ height }} />
            ))}
          </div>
        </div>
        <span className="font-bold">Keylight</span>
      </div>

      <div className="hidden lg:block">
        <h1 className="text-[19px] font-bold tracking-[-0.02em]">{pageTitle}</h1>
        <p className="mt-0.5 text-xs text-[#8a91a0]">{pageSubtitle}</p>
      </div>

      <div className="flex items-center gap-2.5 rounded-full border border-[#e5e7ec] bg-white px-3.5 py-2 text-xs font-semibold shadow-[0_2px_8px_rgba(25,31,49,0.04)]">
        <span className="h-2 w-2 rounded-full bg-[#4fbd8b]" />
        <span className="hidden sm:inline">Keylight One</span>
        <span className="text-[#4fbd8b]">Connected</span>
        <Icon name="bluetooth" size={14} />
      </div>
    </header>
  )
}
