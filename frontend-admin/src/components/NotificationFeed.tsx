import { Icon } from './Icon'
import type { WsEvent } from '../types'

function NotificationItem({ event, onClick }: { event: WsEvent; onClick: () => void }) {
  const time = new Date(event.timestamp).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
  
  if (event.type === 'entry') {
    return (
      <button onClick={onClick} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-green-500/10 transition-colors text-left">
        <div className="w-6 h-6 rounded-md bg-green-500/20 flex items-center justify-center shrink-0">
          <Icon icon="ArrowRight" size={12} className="text-green-400" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-white text-xs truncate">{event.person.full_name}</span>
        </div>
        <span className="text-gray-500 text-[10px]">{time}</span>
      </button>
    )
  }

  if (event.type === 'exit') {
    return (
      <button onClick={onClick} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-blue-500/10 transition-colors text-left">
        <div className="w-6 h-6 rounded-md bg-blue-500/20 flex items-center justify-center shrink-0">
          <Icon icon="ArrowLeft" size={12} className="text-blue-400" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-white text-xs truncate">{event.person.full_name}</span>
        </div>
        <span className="text-gray-500 text-[10px]">{time}</span>
      </button>
    )
  }

  return (
    <button onClick={onClick} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-left">
      <div className="w-6 h-6 rounded-md bg-yellow-500/20 flex items-center justify-center shrink-0 animate-pulse">
        <Icon icon="AlertTriangle" size={12} className="text-yellow-400" />
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-yellow-200 text-xs truncate">Desconocido</span>
      </div>
      <span className="text-gray-500 text-[10px]">{time}</span>
    </button>
  )
}

const LIVE_FEED_MAX = 10

interface NotificationFeedProps {
  notifications: any[]
  unknownAlert: any
  onNavigateToActivity: (eventId?: string, startDate?: string) => void
}

export function NotificationFeed({ notifications, unknownAlert, onNavigateToActivity }: NotificationFeedProps) {
  const latest = notifications.slice(0, LIVE_FEED_MAX)
  const total = notifications.length

  return (
    <section className="glass flex h-full max-h-[min(100%,420px)] flex-col overflow-hidden border border-white/10">
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
          <Icon icon="Bolt" size={14} className="animate-pulse text-lb-accent" />
          En vivo
        </h2>
        <span className="text-[10px] text-lb-muted" title="Últimos eventos en el panel">
          {total === 0 ? '0' : total > LIVE_FEED_MAX ? `${LIVE_FEED_MAX} de ${total}` : `${total}`}
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {total === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center py-4">
            <Icon icon="Eye" size={24} className="text-gray-600 mb-2" />
            <p className="text-gray-500 text-xs">Sin eventos</p>
          </div>
        ) : (
          <div className="flex flex-col gap-0.5">
            {latest.map((n: any, i: number) => {
              const eventTime = new Date(n.wsEvent.timestamp)
              const dateStr = eventTime.toISOString().split('T')[0]
              return (
                <NotificationItem
                  key={n.id || i}
                  event={n.wsEvent}
                  onClick={() => onNavigateToActivity(n.id || n.wsEvent.temp_id, dateStr)}
                />
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}
