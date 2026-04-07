import { Icon } from './Icon'
import { useStore } from '../store'

interface EventsTableProps {
  events: any[]
  currentPage: number
  totalPages: number
  itemsPerPage: number
  setItemsPerPage: (items: number) => void
  setCurrentPage: (page: number) => void
}

export function EventsTable({ events, currentPage, totalPages, itemsPerPage, setItemsPerPage, setCurrentPage }: EventsTableProps) {
  const typeLabels: Record<string, { label: string; color: string; icon: string }> = {
    entry: { label: 'Ingreso', color: 'text-green-400', icon: 'CheckCircle' },
    exit: { label: 'Salida', color: 'text-blue-400', icon: 'LogOut' },
    unknown: { label: 'Desconocido', color: 'text-yellow-400', icon: 'AlertTriangle' },
  }

  const getTypeBadge = (eventType: string, personId: string | null) => {
    const meta = typeLabels[eventType] || { label: eventType, color: 'text-gray-400', icon: 'Info' }
    const isValidated = personId !== null

    return (
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${
        eventType === 'entry'
          ? 'bg-green-500/10 border-green-400/30'
          : eventType === 'exit'
          ? 'bg-blue-500/10 border-blue-400/30'
          : 'bg-yellow-500/10 border-yellow-400/30'
      }`}>
        <Icon icon={meta.icon} size={16} className={meta.color} />
        <span className={`text-sm font-medium ${meta.color} capitalize`}>{meta.label}</span>
        {isValidated && <span className="ml-auto text-green-400/80" title="Validado"><Icon icon="Check" size={14} /></span>}
      </div>
    )
  }

  return (
    <section className="glass backdrop-blur-xl border border-glass/50 rounded-3xl shadow-glass flex flex-col overflow-hidden">
      <div className="px-6 py-4 border-b border-glass/50 bg-gradient-to-r from-transparent via-blue-500/5 to-transparent flex items-center justify-between">
        <div>
          <h2 className="text-white font-semibold text-base flex items-center gap-2">
            <Icon icon="History" size={20} className="text-blue-400" />
            Historial Reciente
          </h2>
          <span className="text-gray-500 text-xs">{events.length} registros mostrados</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-gray-400 text-xs">Mostrar:</span>
          <select
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value))
              setCurrentPage(1)
            }}
            className="bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-glass scrollbar-track-transparent flex-1">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-500 text-xs uppercase tracking-wider border-b border-glass/50 bg-gradient-to-r from-transparent via-gray-800/30 to-transparent">
              <th className="text-left py-4 px-6 font-semibold">Tipo</th>
              <th className="text-left py-4 px-6 font-semibold">Persona</th>
              <th className="text-left py-4 px-6 font-semibold">Ubicación</th>
              <th className="text-left py-4 px-6 font-semibold">Duración</th>
              <th className="text-left py-4 px-6 font-semibold">Hora</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-glass/30">
            {events.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-gray-600">
                  <div className="flex flex-col items-center gap-3">
                    <Icon icon="FileText" size={48} className="opacity-20" />
                    <span className="text-sm">Sin eventos registrados</span>
                  </div>
                </td>
              </tr>
            ) : (
              events.map((e: any) => {
                const time = new Date(e.timestamp).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
                const date = new Date(e.timestamp).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })
                const dayName = new Date(e.timestamp).toLocaleDateString('es-CO', { weekday: 'short' })

                return (
                  <tr key={e.id} className="glass hover:bg-cyan-500/5 border-b border-glass/30 transition-colors group">
                    <td className="py-4 px-6">{getTypeBadge(e.event_type, e.person_id)}</td>
                    <td className="py-4 px-6 text-gray-300 group-hover:text-white transition-colors">
                      {e.person_name ?? <span className="text-gray-600 italic">Desconocido</span>}
                    </td>
                    <td className="py-4 px-6 text-gray-500">
                      {e.person_id ? (
                        <span className="text-green-400/80 flex items-center gap-1">
                          <Icon icon="Check" size={14} /> Validado
                        </span>
                      ) : (
                        <span className="text-yellow-400/80 flex items-center gap-1">
                          <Icon icon="AlertTriangle" size={14} /> Desconocido
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-gray-500">
                      {e.stay_duration ?? '—'}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex flex-col">
                        <span className="text-gray-400 font-medium">{time}</span>
                        <span className="text-gray-600 text-xs flex items-center gap-1.5">
                          <span className="opacity-70">{dayName}</span>
                          <span>{date}</span>
                        </span>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-6 py-4 border-t border-glass/50 bg-gradient-to-r from-transparent via-gray-800/30 to-transparent flex items-center justify-between">
          <span className="text-gray-500 text-sm">
            Página {currentPage} de {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 rounded-lg glass border border-glass/50 text-sm disabled:opacity-30 hover:bg-cyan-500/10 transition-colors"
            >
              <Icon icon="ChevronLeft" size={16} />
            </button>
            <span className="text-gray-500 text-sm font-medium">{currentPage}</span>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 rounded-lg glass border border-glass/50 text-sm disabled:opacity-30 hover:bg-cyan-500/10 transition-colors"
            >
              <Icon icon="ChevronRight" size={16} />
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
