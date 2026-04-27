import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { RefreshCw, Download, Eye } from 'lucide-react'
import { toast } from 'sonner'
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
  type PaginationState,
} from '@tanstack/react-table'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { TopNav } from '@/components/layout/top-nav'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { DataTablePagination } from '@/components/data-table'
import { usePrismStore } from '@/features/prism/store'
import {
  fetchEvents,
  fetchEventStats,
  fetchEventCount,
  exportToCSV,
} from '@/features/prism/api'
import type { EventRecord } from '@/features/prism/types'

const topNav = [
  { title: 'Dashboard', href: '/', isActive: false, disabled: false },
  { title: 'Ocupantes', href: '/occupants', isActive: false, disabled: false },
  { title: 'Actividad', href: '/activity', isActive: true, disabled: false },
]

function EventStatsCards({ stats }: { stats: any }) {
  if (!stats) return null
  return (
    <div className='grid grid-cols-2 md:grid-cols-5 gap-4 mb-6'>
      <Card>
        <CardContent className='pt-6'>
          <p className='text-muted-foreground text-xs'>Total</p>
          <p className='text-2xl font-bold'>{stats.total}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className='pt-6'>
          <p className='text-muted-foreground text-xs'>Ingresos</p>
          <p className='text-2xl font-bold text-green-500'>{stats.entries}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className='pt-6'>
          <p className='text-muted-foreground text-xs'>Salidas</p>
          <p className='text-2xl font-bold text-blue-500'>{stats.exits}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className='pt-6'>
          <p className='text-muted-foreground text-xs'>Desconocidos</p>
          <p className='text-2xl font-bold text-amber-500'>{stats.unknown}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className='pt-6'>
          <p className='text-muted-foreground text-xs'>Hoy</p>
          <p className='text-2xl font-bold text-emerald-500'>{stats.today}</p>
        </CardContent>
      </Card>
    </div>
  )
}

function EventDetailModal({ event, onClose }: { event: EventRecord; onClose: () => void }) {
  const date = new Date(event.timestamp)
  const typeLabels: Record<string, string> = {
    entry: 'Ingreso',
    exit: 'Salida',
    unknown: 'Desconocido',
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader>
          <DialogTitle>Detalle del Evento</DialogTitle>
        </DialogHeader>
        <div className='space-y-4'>
          {event.photo_path && (
            <img src={`/media/${event.photo_path}`} alt='Evento' className='w-full h-48 rounded-lg object-cover border' />
          )}
          <div className='grid grid-cols-2 gap-4 text-sm'>
            <div>
              <p className='text-muted-foreground'>Tipo</p>
              <Badge variant={event.event_type === 'entry' ? 'default' : event.event_type === 'exit' ? 'secondary' : 'outline'}>
                {typeLabels[event.event_type] || event.event_type}
              </Badge>
            </div>
            <div>
              <p className='text-muted-foreground'>Persona</p>
              <p className='font-medium'>{event.person_name || 'Desconocido'}</p>
            </div>
            <div>
              <p className='text-muted-foreground'>Fecha</p>
              <p className='font-medium'>{date.toLocaleDateString('es-CO')}</p>
            </div>
            <div>
              <p className='text-muted-foreground'>Hora</p>
              <p className='font-medium'>{date.toLocaleTimeString('es-CO')}</p>
            </div>
            {event.event_type === 'exit' && (
              <div>
                <p className='text-muted-foreground'>Duración</p>
                <p className='font-medium'>{event.stay_duration || '—'}</p>
              </div>
            )}
            <div>
              <p className='text-muted-foreground'>Zona</p>
              <p className='font-medium'>{event.entry_zone || '—'}</p>
            </div>
            <div>
              <p className='text-muted-foreground'>Tiene equipos</p>
              <p className='font-medium'>{event.has_equipment ? 'Sí' : 'No'}</p>
            </div>
            <div>
              <p className='text-muted-foreground'>Tarjeta Visitante</p>
              <p className='font-medium'>{event.visitor_card_number || '—'}</p>
            </div>
            <div>
              <p className='text-muted-foreground'>Pertenece a</p>
              <p className='font-medium'>{event.belongs_to || '—'}</p>
            </div>
          </div>
          {event.notes && (
            <div className='text-sm'>
              <p className='text-muted-foreground'>Notas</p>
              <p className='font-medium whitespace-pre-wrap'>{event.notes}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function PrismActivityPage() {
  const { activityDateFilter, setActivityDateFilter } = usePrismStore()
  const [events, setEvents] = useState<EventRecord[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState({ event_type: '', start_date: '', end_date: '' })
  const [totalCount, setTotalCount] = useState(0)
  const [detailEvent, setDetailEvent] = useState<EventRecord | null>(null)

  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 5,
  })

  useEffect(() => {
    if (activityDateFilter) {
      setFilter((prev) => ({
        ...prev,
        start_date: activityDateFilter.start_date,
        end_date: activityDateFilter.end_date,
      }))
      setActivityDateFilter(null)
    }
  }, [activityDateFilter])

  useEffect(() => {
    loadData()
  }, [filter, pagination.pageIndex, pagination.pageSize])

  async function loadData() {
    setLoading(true)
    try {
      const [eventsRes, statsRes, countRes] = await Promise.all([
        fetchEvents({
          limit: pagination.pageSize,
          offset: pagination.pageIndex * pagination.pageSize,
          event_type: filter.event_type || undefined,
          start_date: filter.start_date || undefined,
          end_date: filter.end_date || undefined,
        }),
        fetchEventStats(7),
        fetchEventCount({
          event_type: filter.event_type || undefined,
          start_date: filter.start_date || undefined,
          end_date: filter.end_date || undefined,
        }),
      ])
      setEvents(eventsRes)
      setStats(statsRes)
      setTotalCount(countRes.count)
    } catch (err: any) {
      toast.error(err.message || 'Error cargando datos')
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
      const exportData = allEvents.map((e) => ({
        Tipo:
          e.event_type === 'entry' ? 'Ingreso' : e.event_type === 'exit' ? 'Salida' : 'Desconocido',
        Persona: e.person_name || 'Desconocido',
        Fecha: new Date(e.timestamp).toLocaleString('es-CO'),
        Duración: e.stay_duration || '-',
        Zona: e.entry_zone || '-',
        Equipos: e.has_equipment ? 'Sí' : 'No',
        Tarjeta: e.visitor_card_number || '-',
        Pertenece: e.belongs_to || '-',
        Notas: e.notes || '-',
      }))
      exportToCSV(exportData, 'eventos')
    } catch (err: any) {
      toast.error(err.message || 'Error exportando')
    }
  }

  const columns = useMemo<ColumnDef<EventRecord>[]>(
    () => [
      {
        accessorKey: 'event_type',
        header: 'Tipo',
        cell: ({ row }) => {
          const meta: Record<string, { label: string; variant: any; color: string }> = {
            entry: { label: 'Ingreso', variant: 'default', color: 'text-green-500' },
            exit: { label: 'Salida', variant: 'secondary', color: 'text-blue-500' },
            unknown: { label: 'Desconocido', variant: 'outline', color: 'text-amber-500' },
          }
          const m = meta[row.original.event_type] || {
            label: row.original.event_type,
            variant: 'outline',
            color: 'text-muted-foreground',
          }
          return (
            <Badge variant={m.variant} className={m.color}>
              {m.label}
            </Badge>
          )
        },
      },
      {
        accessorKey: 'person_name',
        header: 'Persona',
        cell: ({ row }) =>
          row.original.person_name || (
            <span className='text-muted-foreground italic'>Desconocido</span>
          ),
      },
      {
        accessorKey: 'photo_path',
        header: 'Foto',
        cell: ({ row }) =>
          row.original.photo_path ? (
            <img src={`/media/${row.original.photo_path}`} alt='event' className='w-12 h-12 rounded-lg object-cover' />
          ) : (
            <span className='text-muted-foreground'>—</span>
          ),
      },
      {
        accessorKey: 'stay_duration',
        header: 'Duración',
        cell: ({ row }) => row.original.stay_duration || '—',
      },
      {
        accessorKey: 'timestamp',
        header: 'Fecha/Hora',
        cell: ({ row }) => {
          const date = new Date(row.original.timestamp)
          return (
            <div>
              <div className='text-foreground'>{date.toLocaleDateString('es-CO')}</div>
              <div className='text-muted-foreground text-xs'>{date.toLocaleTimeString('es-CO')}</div>
            </div>
          )
        },
      },
      {
        id: 'actions',
        header: 'Detalle',
        cell: ({ row }) => (
          <Button variant='ghost' size='icon' onClick={() => setDetailEvent(row.original)}>
            <Eye className='h-4 w-4' />
          </Button>
        ),
      },
    ],
    []
  )

  const table = useReactTable({
    data: events,
    columns,
    pageCount: Math.ceil(totalCount / pagination.pageSize),
    state: { pagination },
    onPaginationChange: setPagination,
    manualPagination: true,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <>
      <Header>
        <TopNav links={topNav} className='me-auto' />
        <Search />
        <ThemeSwitch />
        <ProfileDropdown />
      </Header>

      <Main>
        <div className='mb-6 flex items-center justify-between'>
          <h1 className='text-2xl font-bold tracking-tight'>Actividad</h1>
        </div>

        <EventStatsCards stats={stats} />

        {/* Filters */}
        <div className='flex flex-wrap gap-4 items-center justify-between mb-6'>
          <div className='flex flex-wrap gap-3 items-center'>
            <Select
              value={filter.event_type || '__all__'}
              onValueChange={(v) => {
                setFilter({ ...filter, event_type: v === '__all__' ? '' : v })
                setPagination((p) => ({ ...p, pageIndex: 0 }))
              }}
            >
              <SelectTrigger className='w-[160px]'>
                <SelectValue placeholder='Todos los tipos' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='__all__'>Todos los tipos</SelectItem>
                <SelectItem value='entry'>Ingresos</SelectItem>
                <SelectItem value='exit'>Salidas</SelectItem>
                <SelectItem value='unknown'>Desconocidos</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type='date'
              value={filter.start_date}
              onChange={(e) => {
                setFilter({ ...filter, start_date: e.target.value })
                setPagination((p) => ({ ...p, pageIndex: 0 }))
              }}
              className='w-[150px]'
            />
            <Input
              type='date'
              value={filter.end_date}
              onChange={(e) => {
                setFilter({ ...filter, end_date: e.target.value })
                setPagination((p) => ({ ...p, pageIndex: 0 }))
              }}
              className='w-[150px]'
            />
            <Button
              variant='ghost'
              onClick={() => {
                setFilter({ event_type: '', start_date: '', end_date: '' })
                setPagination({ pageIndex: 0, pageSize: 5 })
              }}
            >
              Limpiar
            </Button>
          </div>
          <div className='flex gap-2'>
            <Button variant='outline' onClick={() => loadData()} disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Actualizar
            </Button>
            <Button onClick={handleExport} disabled={events.length === 0}>
              <Download className='mr-2 h-4 w-4' /> Exportar CSV
            </Button>
          </div>
        </div>

        {/* Table */}
        <Card>
          <CardContent className='p-0'>
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={columns.length} className='text-center py-8 text-muted-foreground'>
                      Cargando...
                    </TableCell>
                  </TableRow>
                ) : table.getRowModel().rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={columns.length} className='text-center py-8 text-muted-foreground'>
                      No hay eventos
                    </TableCell>
                  </TableRow>
                ) : (
                  table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id}>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <DataTablePagination
          table={table}
          pageSizeOptions={[5, 10, 20]}
          pageSizeLabel='Filas por página'
        />
      </Main>

      {detailEvent && <EventDetailModal event={detailEvent} onClose={() => setDetailEvent(null)} />}
    </>
  )
}
