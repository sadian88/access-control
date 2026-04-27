import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Plus, RefreshCw, Pencil, Trash2, Camera } from 'lucide-react'
import { toast } from 'sonner'
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
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
  fetchAllPeople,
  fetchPersonStats,
  createPerson,
  updatePerson,
  deletePerson,
} from '@/features/prism/api'
import { personTypeLabel, type Person, type PersonStats } from '@/features/prism/types'

const topNav = [
  { title: 'Dashboard', href: '/', isActive: false, disabled: false },
  { title: 'Ocupantes', href: '/occupants', isActive: true, disabled: false },
  { title: 'Actividad', href: '/activity', isActive: false, disabled: false },
]

function PersonModal({
  person,
  onSave,
  onClose,
}: {
  person?: Person | null
  onSave: (data: any) => void
  onClose: () => void
}) {
  const [form, setForm] = useState({
    full_name: person?.full_name || '',
    cedula: person?.cedula || '',
    email: person?.email || '',
    phone: person?.phone || '',
    apartment: person?.apartment || '',
    person_type: person?.person_type || 'client',
    photo_data: '',
  })
  const [photoPreview, setPhotoPreview] = useState<string | null>(
    person?.photo_path ? `/media/${person.photo_path}` : null
  )

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string)
        setForm({ ...form, photo_data: reader.result as string })
      }
      reader.readAsDataURL(file)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>{person ? 'Editar Persona' : 'Nueva Persona'}</DialogTitle>
        </DialogHeader>
        <div className='space-y-4'>
          <div className='flex justify-center'>
            <label className='cursor-pointer'>
              <input type='file' accept='image/*' onChange={handlePhotoChange} className='hidden' />
              <div className='w-24 h-24 rounded-full bg-muted border-2 border-dashed flex items-center justify-center overflow-hidden hover:border-primary transition-colors'>
                {photoPreview ? (
                  <img src={photoPreview} alt='Foto' className='w-full h-full object-cover' />
                ) : (
                  <Camera className='h-6 w-6 text-muted-foreground' />
                )}
              </div>
              <p className='text-xs text-muted-foreground text-center mt-1'>Foto</p>
            </label>
          </div>
          <div>
            <Label>Nombre completo *</Label>
            <Input
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              placeholder='Nombre completo'
            />
          </div>
          <div className='grid grid-cols-2 gap-3'>
            <div>
              <Label>Cédula</Label>
              <Input
                value={form.cedula}
                onChange={(e) => setForm({ ...form, cedula: e.target.value })}
                placeholder='Cédula'
              />
            </div>
            <div>
              <Label>Teléfono</Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder='Teléfono'
              />
            </div>
          </div>
          <div>
            <Label>Email</Label>
            <Input
              type='email'
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder='correo@ejemplo.com'
            />
          </div>
          <div className='grid grid-cols-2 gap-3'>
            <div>
              <Label>Apartamento</Label>
              <Input
                value={form.apartment}
                onChange={(e) => setForm({ ...form, apartment: e.target.value })}
                placeholder='Apto'
              />
            </div>
            <div>
              <Label>Tipo</Label>
              <Select
                value={form.person_type}
                onValueChange={(v) =>
                  setForm({ ...form, person_type: v as 'client' | 'visitor' | 'employee' })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='client'>Cliente</SelectItem>
                  <SelectItem value='visitor'>Visitante</SelectItem>
                  <SelectItem value='employee'>Empleado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className='flex gap-3 pt-2'>
            <Button variant='outline' className='flex-1' onClick={onClose}>
              Cancelar
            </Button>
            <Button className='flex-1' disabled={!form.full_name.trim()} onClick={() => onSave(form)}>
              {person ? 'Guardar' : 'Crear'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function PrismOccupantsPage() {
  const { triggerOccupantsRefresh } = usePrismStore()
  const [people, setPeople] = useState<Person[]>([])
  const [stats, setStats] = useState<PersonStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState({ state: '', person_type: '', search: '' })
  const [showModal, setShowModal] = useState(false)
  const [editingPerson, setEditingPerson] = useState<Person | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    loadData()
  }, [filter, refreshKey])

  useEffect(() => {
    const handleRefresh = () => setRefreshKey((k) => k + 1)
    triggerOccupantsRefresh()
    window.addEventListener('occupants-refresh', handleRefresh)
    return () => window.removeEventListener('occupants-refresh', handleRefresh)
  }, [triggerOccupantsRefresh])

  async function loadData() {
    setLoading(true)
    try {
      const [peopleRes, statsRes] = await Promise.all([
        fetchAllPeople({
          state: filter.state || undefined,
          person_type: filter.person_type || undefined,
          search: filter.search || undefined,
        }),
        fetchPersonStats(),
      ])
      setPeople(peopleRes)
      setStats(statsRes)
    } catch (err: any) {
      toast.error(err.message || 'Error cargando datos')
    }
    setLoading(false)
  }

  async function handleSave(data: any) {
    try {
      if (editingPerson) {
        await updatePerson(editingPerson.id, data)
      } else {
        await createPerson(data)
      }
      setShowModal(false)
      setEditingPerson(null)
      loadData()
    } catch (err: any) {
      toast.error(err.message || 'Error guardando')
    }
  }

  async function handleDelete(id: string) {
    if (confirm('¿Eliminar esta persona?')) {
      try {
        await deletePerson(id)
        loadData()
      } catch (err: any) {
        toast.error(err.message || 'Error eliminando')
      }
    }
  }

  const columns = useMemo<ColumnDef<Person>[]>(
    () => [
      {
        accessorKey: 'photo_path',
        header: 'Foto',
        cell: ({ row }) => (
          <Avatar className='w-10 h-10'>
            {row.original.photo_path ? (
              <AvatarImage src={`/media/${row.original.photo_path}`} alt={row.original.full_name} />
            ) : null}
            <AvatarFallback>{row.original.full_name.charAt(0)}</AvatarFallback>
          </Avatar>
        ),
      },
      { accessorKey: 'full_name', header: 'Nombre' },
      {
        accessorKey: 'cedula',
        header: 'Cédula',
        cell: ({ row }) => row.original.cedula || '—',
      },
      {
        accessorKey: 'contacto',
        header: 'Contacto',
        cell: ({ row }) => (
          <div className='text-muted-foreground'>
            <div>{row.original.email || '—'}</div>
            <div className='text-xs'>{row.original.phone || ''}</div>
          </div>
        ),
      },
      {
        accessorKey: 'apartment',
        header: 'Apartamento',
        cell: ({ row }) => row.original.apartment || '—',
      },
      {
        accessorKey: 'person_type',
        header: 'Tipo',
        cell: ({ row }) => (
          <Badge
            variant={
              row.original.person_type === 'employee'
                ? 'default'
                : row.original.person_type === 'client'
                  ? 'secondary'
                  : 'outline'
            }
          >
            {personTypeLabel(row.original.person_type)}
          </Badge>
        ),
      },
      {
        accessorKey: 'state',
        header: 'Estado',
        cell: ({ row }) => (
          <Badge
            variant={row.original.state === 'IN' ? 'default' : 'secondary'}
            className={row.original.state === 'IN' ? 'bg-emerald-500' : ''}
          >
            {row.original.state === 'IN' ? 'Adentro' : 'Afuera'}
          </Badge>
        ),
      },
      {
        id: 'actions',
        header: 'Acciones',
        cell: ({ row }) => (
          <div className='flex gap-2'>
            <Button
              variant='ghost'
              size='icon'
              onClick={() => {
                setEditingPerson(row.original)
                setShowModal(true)
              }}
            >
              <Pencil className='h-4 w-4' />
            </Button>
            <Button variant='ghost' size='icon' onClick={() => handleDelete(row.original.id)}>
              <Trash2 className='h-4 w-4 text-red-500' />
            </Button>
          </div>
        ),
      },
    ],
    []
  )

  const table = useReactTable({
    data: people,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 5, pageIndex: 0 } },
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
          <h1 className='text-2xl font-bold tracking-tight'>Ocupantes</h1>
        </div>

        <div className='space-y-6'>
          {/* Stats */}
          <div className='grid grid-cols-2 md:grid-cols-6 gap-4'>
            <Card>
              <CardContent className='pt-6'>
                <p className='text-muted-foreground text-xs'>Total</p>
                <p className='text-2xl font-bold'>{stats?.total || 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className='pt-6'>
                <p className='text-muted-foreground text-xs'>Empleados</p>
                <p className='text-2xl font-bold text-green-500'>{stats?.employees || 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className='pt-6'>
                <p className='text-muted-foreground text-xs'>Clientes</p>
                <p className='text-2xl font-bold text-indigo-500'>{stats?.clients || 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className='pt-6'>
                <p className='text-muted-foreground text-xs'>Visitantes</p>
                <p className='text-2xl font-bold text-amber-500'>{stats?.visitors || 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className='pt-6'>
                <p className='text-muted-foreground text-xs'>Adentro</p>
                <p className='text-2xl font-bold text-emerald-500'>{stats?.inside || 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className='pt-6'>
                <p className='text-muted-foreground text-xs'>Afuera</p>
                <p className='text-2xl font-bold text-muted-foreground'>{stats?.outside || 0}</p>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <div className='flex flex-wrap gap-4 items-center justify-between'>
            <div className='flex flex-wrap gap-3'>
              <Select
                value={filter.state || '__all__'}
                onValueChange={(v) => setFilter({ ...filter, state: v === '__all__' ? '' : v })}
              >
                <SelectTrigger className='w-[160px]'>
                  <SelectValue placeholder='Todos los estados' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='__all__'>Todos los estados</SelectItem>
                  <SelectItem value='IN'>Adentro</SelectItem>
                  <SelectItem value='OUT'>Afuera</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={filter.person_type || '__all__'}
                onValueChange={(v) =>
                  setFilter({ ...filter, person_type: v === '__all__' ? '' : v })
                }
              >
                <SelectTrigger className='w-[160px]'>
                  <SelectValue placeholder='Todos los tipos' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='__all__'>Todos los tipos</SelectItem>
                  <SelectItem value='client'>Cliente</SelectItem>
                  <SelectItem value='visitor'>Visitante</SelectItem>
                  <SelectItem value='employee'>Empleado</SelectItem>
                </SelectContent>
              </Select>
              <Input
                placeholder='Buscar...'
                value={filter.search}
                onChange={(e) => setFilter({ ...filter, search: e.target.value })}
                className='w-[200px]'
              />
            </div>
            <div className='flex gap-2'>
              <Button onClick={() => { setEditingPerson(null); setShowModal(true) }}>
                <Plus className='mr-2 h-4 w-4' /> Nueva Persona
              </Button>
              <Button variant='outline' size='icon' onClick={() => loadData()}>
                <RefreshCw className={loading ? 'animate-spin' : ''} />
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
                        No hay personas
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
        </div>
      </Main>

      {showModal && (
        <PersonModal
          person={editingPerson}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditingPerson(null) }}
        />
      )}
    </>
  )
}
