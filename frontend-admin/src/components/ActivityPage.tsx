import { useEffect, useState } from 'react'
import { Icon } from './Icon'
import { fetchEvents, fetchEventStats, fetchEventsByDay, fetchEventCount, exportToCSV } from '../api/client'
import type { EventRecord } from '../types'
import { useStore } from '../store'

function EventStatsCards({ stats }: { stats: any }) {
  if (!stats) return null
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
      <div className="glass rounded-2xl p-4 border border-glass/50">
        <p className="text-gray-400 text-xs">Total</p>
        <p className="text-2xl font-bold text-white">{stats.total}</p>
      </div>
      <div className="glass rounded-2xl p-4 border border-glass/50">
        <p className="text-gray-400 text-xs">Ingresos</p>
        <p className="text-2xl font-bold text-green-400">{stats.entries}</p>
      </div>
      <div className="glass rounded-2xl p-4 border border-glass/50">
        <p className="text-gray-400 text-xs">Salidas</p>
        <p className="text-2xl font-bold text-blue-400">{stats.exits}</p>
      </div>
      <div className="glass rounded-2xl p-4 border border-glass/50">
        <p className="text-gray-400 text-xs">Desconocidos</p>
        <p className="text-2xl font-bold text-yellow-400">{stats.unknown}</p>
      </div>
      <div className="glass rounded-2xl p-4 border border-glass/50">
        <p className="text-gray-400 text-xs">Hoy</p>
        <p className="text-2xl font-bold text-cyan-400">{stats.today}</p>
      </div>
    </div>
  )
}

function EventsChart({ data }: { data: any[] }) {
  const maxVal = Math.max(...data.map(d => Math.max(d.entries, d.exits)), 1)
  
  return (
    <div className="glass rounded-2xl p-6 border border-glass/50 mb-6">
      <h3 className="text-white font-semibold mb-4">Eventos por día (últimos 7 días)</h3>
      <div className="h-48 flex items-end gap-2">
        {data.map((d, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-2">
            <div className="w-full flex gap-1 items-end h-36">
              <div 
                className="flex-1 bg-green-500/80 rounded-t hover:bg-green-500 transition-colors"
                style={{ height: `${(d.entries / maxVal) * 100}%` }}
                title={`${d.entries} ingresos`}
              />
              <div 
                className="flex-1 bg-blue-500/80 rounded-t hover:bg-blue-500 transition-colors"
                style={{ height: `${(d.exits / maxVal) * 100}%` }}
                title={`${d.exits} salidas`}
              />
            </div>
            <span className="text-xs text-gray-400">{d.day}</span>
          </div>
        ))}
      </div>
      <div className="flex justify-center gap-6 mt-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-green-500" />
          <span className="text-xs text-gray-400">Ingresos</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-blue-500" />
          <span className="text-xs text-gray-400">Salidas</span>
        </div>
      </div>
    </div>
  )
}

export function ActivityPage() {
  const { activityDateFilter, setActivityDateFilter } = useStore()
  const [events, setEvents] = useState<EventRecord[]>([])
  const [stats, setStats] = useState<any>(null)
  const [chartData, setChartData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState({ event_type: '', start_date: '', end_date: '' })
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const limit = 5

  useEffect(() => {
    if (activityDateFilter) {
      setFilter(prev => ({
        ...prev,
        start_date: activityDateFilter.start_date,
        end_date: activityDateFilter.end_date,
      }))
      setActivityDateFilter(null)
    }
  }, [activityDateFilter])

  useEffect(() => {
    loadData()
  }, [filter, page])

  async function loadData() {
    setLoading(true)
    try {
      const [eventsRes, statsRes, chartRes, countRes] = await Promise.all([
        fetchEvents({
          limit,
          offset: (page - 1) * limit,
          event_type: filter.event_type || undefined,
          start_date: filter.start_date || undefined,
          end_date: filter.end_date || undefined,
        }),
        fetchEventStats(7),
        fetchEventsByDay(7),
        fetchEventCount({
          event_type: filter.event_type || undefined,
          start_date: filter.start_date || undefined,
          end_date: filter.end_date || undefined,
        }),
      ])
      setEvents(eventsRes)
      setStats(statsRes)
      setChartData(chartRes)
      setTotalCount(countRes.count)
    } catch (err) {
      console.error('Error loading data:', err)
    }
    setLoading(false)
  }

  async function handleExport() {
    try {
      const allEvents = await fetchEvents({
        limit: 10000,
        event_type: filter.event_type || undefined,
        start_date: filter.start_date || undefined,
        end_date: filter.end_date || undefined,
      })
      const exportData = allEvents.map(e => ({
        Tipo: e.event_type === 'entry' ? 'Ingreso' : e.event_type === 'exit' ? 'Salida' : 'Desconocido',
        Persona: e.person_name || 'Desconocido',
        Fecha: new Date(e.timestamp).toLocaleString('es-CO'),
        Duración: e.stay_duration || '-',
      }))
      exportToCSV(exportData, 'eventos')
    } catch (err) {
      console.error('Error exporting:', err)
    }
  }

  const totalPages = Math.ceil(totalCount / limit)

  const typeLabels: Record<string, { label: string; color: string; bg: string }> = {
    entry: { label: 'Ingreso', color: 'text-green-400', bg: 'bg-green-500/20' },
    exit: { label: 'Salida', color: 'text-blue-400', bg: 'bg-blue-500/20' },
    unknown: { label: 'Desconocido', color: 'text-yellow-400', bg: 'bg-yellow-500/20' },
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <EventStatsCards stats={stats} />
      <EventsChart data={chartData} />

      {/* Filters */}
      <div className="glass rounded-2xl p-4 border border-glass/50 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-4 items-center">
          <select
            value={filter.event_type}
            onChange={e => { setFilter({...filter, event_type: e.target.value}); setPage(1) }}
            className="bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
          >
            <option value="">Todos los tipos</option>
            <option value="entry">Ingresos</option>
            <option value="exit">Salidas</option>
            <option value="unknown">Desconocidos</option>
          </select>
          <input
            type="date"
            value={filter.start_date}
            onChange={e => { setFilter({...filter, start_date: e.target.value}); setPage(1) }}
            className="bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
          />
          <input
            type="date"
            value={filter.end_date}
            onChange={e => { setFilter({...filter, end_date: e.target.value}); setPage(1) }}
            className="bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
          />
          <button
            onClick={() => { setFilter({ event_type: '', start_date: '', end_date: '' }); setPage(1) }}
            className="text-gray-400 hover:text-white text-sm"
          >
            Limpiar filtros
          </button>
        </div>
        <button
          onClick={() => loadData()}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-800 disabled:opacity-50 text-sm font-medium"
        >
          <Icon icon="SyncAlt" size={16} className={loading ? 'animate-spin' : ''} />
          Actualizar
        </button>
        <button
          onClick={handleExport}
          disabled={events.length === 0}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-sm font-medium"
        >
          <Icon icon="Download" size={16} />
          Exportar CSV
        </button>
      </div>

      {/* Table */}
      <div className="glass rounded-2xl border border-glass/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-800/50 text-gray-400 text-xs uppercase">
              <tr>
                <th className="text-left p-4">Tipo</th>
                <th className="text-left p-4">Persona</th>
                <th className="text-left p-4">Foto</th>
                <th className="text-left p-4">Duración</th>
                <th className="text-left p-4">Fecha/Hora</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-glass/30">
              {loading ? (
                <tr><td colSpan={5} className="p-8 text-center text-gray-500">Cargando...</td></tr>
              ) : events.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-gray-500">No hay eventos</td></tr>
              ) : (
                events.map((e: any) => {
                  const meta = typeLabels[e.event_type] || { label: e.event_type, color: 'text-gray-400', bg: 'bg-gray-500/20' }
                  const date = new Date(e.timestamp)
                  return (
                    <tr key={e.id} className="hover:bg-cyan-500/5 transition-colors">
                      <td className="p-4">
                        <span className={`px-3 py-1.5 rounded-lg text-xs font-medium ${meta.bg} ${meta.color} border border-${e.event_type === 'entry' ? 'green' : e.event_type === 'exit' ? 'blue' : 'yellow'}-400/30`}>
                          {meta.label}
                        </span>
                      </td>
                      <td className="p-4 text-gray-300">
                        {e.person_name || <span className="text-gray-500 italic">Desconocido</span>}
                      </td>
                      <td className="p-4">
                        {e.photo_path ? (
                          <img src={e.photo_path} alt="event" className="w-12 h-12 rounded-lg object-cover" />
                        ) : (
                          <span className="text-gray-500">—</span>
                        )}
                      </td>
                      <td className="p-4 text-gray-400">
                        {e.stay_duration || '—'}
                      </td>
                      <td className="p-4">
                        <div className="text-white">{date.toLocaleDateString('es-CO')}</div>
                        <div className="text-gray-500 text-xs">{date.toLocaleTimeString('es-CO')}</div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-glass/50 flex justify-between items-center">
          <span className="text-gray-500 text-sm">
            Página {page} de {totalPages} ({totalCount} registros)
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-lg glass border border-glass/50 text-sm disabled:opacity-30"
            >
              <Icon icon="ChevronLeft" size={16} />
            </button>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={page >= totalPages}
              className="px-3 py-1.5 rounded-lg glass border border-glass/50 text-sm disabled:opacity-30"
            >
              <Icon icon="ChevronRight" size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}