import { Icon } from './Icon'
import { useStore } from '../store'

type Page = 'dashboard' | 'occupants' | 'activity' | 'history' | 'visitors' | 'settings'

interface SidebarProps {
  currentPage: Page
  onNavigate: (page: Page) => void
}

export function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  const menuItems: { name: string; page: Page; icon: string }[] = [
    { name: 'Dashboard', page: 'dashboard', icon: 'LayoutDashboard' },
    { name: 'Ocupantes', page: 'occupants', icon: 'Users' },
    { name: 'Actividad', page: 'activity', icon: 'Activity' },
    { name: 'Historial', page: 'history', icon: 'History' },
    { name: 'Visitantes', page: 'visitors', icon: 'UserCheck' },
    { name: 'Configuración', page: 'settings', icon: 'Settings' },
  ]

  return (
    <aside className="glass backdrop-blur-xl border-r border-glass/50 flex flex-col transition-all duration-300 z-20 w-64">
      <div className="p-6 flex items-center gap-3 border-b border-glass/50">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-400/30 flex items-center justify-center flex-shrink-0">
          <Icon icon="Shield" size={24} className="text-cyan-400" />
        </div>
        <div className="flex flex-col">
          <h1 className="text-white font-semibold text-lg tracking-wide">Edge Guard</h1>
          <span className="text-cyan-200/70 text-xs tracking-widest uppercase">Control de Accesos</span>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {menuItems.map((item) => (
          <button
            key={item.page}
            onClick={() => onNavigate(item.page)}
            className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl transition-all duration-200 ${
              currentPage === item.page
                ? 'bg-cyan-500/10 border border-cyan-500/20 text-cyan-400'
                : 'text-gray-400 hover:text-white hover:bg-glass/50'
            }`}
          >
            <Icon icon={item.icon as any} size={20} className={currentPage === item.page ? 'text-cyan-400' : 'text-gray-400'} />
            <span className="font-medium tracking-wide">{item.name}</span>
            {currentPage === item.page && <div className="ml-auto w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />}
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-glass/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center border border-gray-600 relative overflow-hidden">
            <span className="text-gray-300 font-semibold">AD</span>
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-900" />
          </div>
          <div className="flex flex-col">
            <span className="text-white text-sm font-medium">Admin</span>
            <span className="text-gray-500 text-xs">Sistema Online</span>
          </div>
        </div>
      </div>
    </aside>
  )
}

export type { Page }