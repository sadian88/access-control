import { Icon } from './Icon'

type Page = 'dashboard' | 'occupants' | 'activity' | 'history' | 'visitors' | 'settings'

interface SidebarProps {
  currentPage: Page
  onNavigate: (page: Page) => void
}

export function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  const menuItems: { name: string; page: Page; icon: string }[] = [
    { name: 'Dashboard', page: 'dashboard', icon: 'ThLarge' },
    { name: 'Ocupantes', page: 'occupants', icon: 'Users' },
    { name: 'Actividad', page: 'activity', icon: 'ChartBar' },
    { name: 'Historial', page: 'history', icon: 'History' },
    { name: 'Visitantes', page: 'visitors', icon: 'User' },
    { name: 'Configuración', page: 'settings', icon: 'Cog' },
  ]

  return (
    <aside className="w-[200px] shrink-0 flex flex-col z-20 text-lb-text border-r border-white/[0.06]">
      <header className="pt-5 pb-8 px-2 text-center text-lg font-bold uppercase tracking-[0.18em] text-white">
        PRISM
      </header>

      <nav className="flex-1 px-2 pb-4 overflow-y-auto overflow-x-hidden">
        <h5 className="mt-2 mb-2 ml-4 text-[13px] font-bold text-lb-title">APLICACIÓN</h5>
        <ul className="space-y-0.5">
          {menuItems.map((item) => {
            const active = currentPage === item.page
            return (
              <li key={item.page}>
                <button
                  type="button"
                  onClick={() => onNavigate(item.page)}
                  className={`w-full flex items-center gap-2.5 pl-2.5 pr-4 py-3 rounded-md text-left text-sm transition-colors ${
                    active
                      ? 'text-lb-accent bg-black/[0.12]'
                      : 'text-lb-muted hover:bg-black/[0.07] hover:text-lb-text'
                  }`}
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
                    <Icon icon={item.icon as any} size={16} className={active ? 'text-lb-accent' : 'text-lb-muted'} />
                  </span>
                  <span className="font-normal tracking-wide">{item.name}</span>
                </button>
              </li>
            )
          })}
        </ul>

        <h5 className="mt-6 mb-2 ml-4 text-[13px] font-bold text-lb-title">ESTADO</h5>
        <ul className="ml-4 space-y-3 text-[0.9rem] text-lb-muted">
          <li className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
            <span className="font-light">Sistema activo</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-lb-primary" />
            <span className="font-light">Control de accesos</span>
          </li>
        </ul>
      </nav>
    </aside>
  )
}

export type { Page }
