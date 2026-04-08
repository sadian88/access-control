import { Icon } from './Icon'
import type { IconName } from './Icon'

export function Header({
  notifications,
  onToggleNotifications,
  showNotifications,
}: {
  notifications: any[]
  onToggleNotifications?: () => void
  showNotifications?: boolean
}) {
  const unseen = notifications.filter((n: any) => !n.seen).length
  const totalEvents = notifications.length

  return (
    <header className="min-h-16 flex flex-wrap items-center gap-3 border-b border-white/[0.06] bg-transparent px-6 py-3 print:hidden">
      <div className="hidden min-w-[200px] flex-1 md:block">
        <div className="relative flex max-w-md items-center">
          <span className="pointer-events-none absolute left-3 text-lb-muted">
            <Icon icon="Search" size={14} />
          </span>
          <input
            type="search"
            placeholder="Buscar en el panel…"
            className="input-lb-transparent w-full pl-9"
            aria-label="Buscar"
          />
        </div>
      </div>

      <div className="ml-auto flex flex-wrap items-center gap-2 sm:gap-3">
        <div className="hidden items-center gap-1.5 rounded border border-white/10 bg-black/20 px-3 py-1.5 sm:flex">
          <Icon icon="Bolt" size={14} className="text-lb-accent" />
          <span className="text-sm font-bold text-white">{totalEvents}</span>
          <span className="text-xs text-lb-muted">eventos</span>
        </div>

        <button
          type="button"
          onClick={onToggleNotifications}
          className={`relative flex h-9 w-9 items-center justify-center rounded border transition-colors ${
            showNotifications
              ? 'border-lb-accent/50 bg-lb-accent/15 text-lb-accent'
              : 'border-white/10 bg-black/20 text-lb-muted hover:border-white/20 hover:text-lb-text'
          }`}
          aria-pressed={showNotifications}
          aria-label="Notificaciones"
        >
          <Icon icon="Bell" size={16} />
          {unseen > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-0.5 text-[9px] font-bold text-white">
              {unseen > 9 ? '9+' : unseen}
            </span>
          )}
        </button>

        <div className="flex items-center gap-2.5 border-l border-white/10 pl-3 sm:pl-4" title="Admin — PRISM">
          <div className="hidden min-w-0 flex-col text-right sm:flex">
            <span className="truncate text-sm font-medium text-lb-text">Admin</span>
            <span className="truncate text-xs text-lb-title">PRISM</span>
          </div>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/15 bg-lb-inverse text-xs font-semibold text-lb-muted sm:h-10 sm:w-10 sm:text-sm">
            AD
          </div>
        </div>
      </div>
    </header>
  )
}

export { Icon }

export type { IconName }
