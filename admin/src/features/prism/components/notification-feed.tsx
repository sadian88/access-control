import { ScrollArea } from '@/components/ui/scroll-area'
import { AlertTriangle, ArrowLeft, ArrowRight, Eye } from 'lucide-react'
import type { WsEvent } from '../types'

function NotificationItem({ event, onClick }: { event: WsEvent; onClick: () => void }) {
  const time = new Date(event.timestamp).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })

  if (event.type === 'entry') {
    return (
      <button onClick={onClick} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-green-500/10 transition-colors text-left">
        <div className="w-6 h-6 rounded-md bg-green-500/20 flex items-center justify-center shrink-0">
          <ArrowRight size={12} className="text-green-500" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-foreground text-xs truncate">{event.person.full_name}</span>
        </div>
        <span className="text-muted-foreground text-[10px]">{time}</span>
      </button>
    )
  }

  if (event.type === 'exit') {
    return (
      <button onClick={onClick} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-blue-500/10 transition-colors text-left">
        <div className="w-6 h-6 rounded-md bg-blue-500/20 flex items-center justify-center shrink-0">
          <ArrowLeft size={12} className="text-blue-500" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-foreground text-xs truncate">{event.person.full_name}</span>
        </div>
        <span className="text-muted-foreground text-[10px]">{time}</span>
      </button>
    )
  }

  return (
    <button onClick={onClick} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-left">
      <div className="w-6 h-6 rounded-md bg-yellow-500/20 flex items-center justify-center shrink-0 animate-pulse">
        <AlertTriangle size={12} className="text-yellow-500" />
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-yellow-600 dark:text-yellow-400 text-xs truncate">Desconocido</span>
      </div>
      <span className="text-muted-foreground text-[10px]">{time}</span>
    </button>
  )
}

const LIVE_FEED_MAX = 10

interface NotificationFeedProps {
  notifications: any[]
  onNavigateToActivity: (eventId?: string, startDate?: string) => void
}

export function PrismNotificationFeed({ notifications, onNavigateToActivity }: NotificationFeedProps) {
  const latest = notifications.slice(0, LIVE_FEED_MAX)
  const total = notifications.length

  return (
    <div className="flex h-full max-h-[420px] flex-col overflow-hidden border rounded-lg bg-card">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          En vivo
        </h2>
        <span className="text-[10px] text-muted-foreground">
          {total === 0 ? '0' : total > LIVE_FEED_MAX ? `${LIVE_FEED_MAX} de ${total}` : `${total}`}
        </span>
      </div>

      <ScrollArea className="min-h-0 flex-1 p-2">
        {total === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center py-4">
            <Eye size={24} className="text-muted-foreground mb-2" />
            <p className="text-muted-foreground text-xs">Sin eventos</p>
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
      </ScrollArea>
    </div>
  )
}
