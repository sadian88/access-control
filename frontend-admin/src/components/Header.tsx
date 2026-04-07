import { Icon } from './Icon'
import type { IconName } from './Icon'

export function Header({ wsConnected, notifications, onToggleNotifications, showNotifications }: { wsConnected: boolean; notifications: any[]; onToggleNotifications?: () => void; showNotifications?: boolean }) {
  const unseen = notifications.filter((n: any) => !n.seen).length
  const totalEvents = notifications.length

  return (
    <header className="glass border-b border-glass/50 px-4 py-2 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="flex flex-col">
          <h2 className="text-white font-semibold text-sm">Edge Guard</h2>
          <p className="text-gray-500 text-[10px]">Control de Accesos</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Status */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg glass border border-glass/30">
          <div className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-green-400' : 'bg-red-500 animate-pulse'}`} />
          <span className={`text-xs font-medium ${wsConnected ? 'text-green-300' : 'text-red-300'}`}>
            {wsConnected ? 'Online' : 'Offline'}
          </span>
        </div>

        {/* Events count */}
        <div className="hidden sm:flex items-center gap-1 px-3 py-1.5 rounded-lg glass border border-glass/30">
          <Icon icon="Activity" size={14} className="text-cyan-400" />
          <span className="text-white text-sm font-bold">{totalEvents}</span>
        </div>

        {/* Toggle Notifications */}
        <button 
          onClick={onToggleNotifications}
          className={`relative flex items-center justify-center w-8 h-8 rounded-lg border transition-colors ${showNotifications ? 'bg-yellow-500/20 border-yellow-500/40' : 'glass border-glass/30 hover:bg-glass/50'}`}
        >
          <Icon icon="Bell" size={16} className={showNotifications ? 'text-yellow-400' : 'text-gray-400'} />
          {unseen > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-500 text-black text-[9px] font-bold rounded-full flex items-center justify-center">
              {unseen}
            </span>
          )}
        </button>
      </div>
    </header>
  )
}

export { Icon }

export type { IconName }
