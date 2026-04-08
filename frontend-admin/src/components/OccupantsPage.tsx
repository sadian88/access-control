import { useEffect, useState } from 'react'
import { Icon } from './Icon'
import { 
  fetchAllPeople, 
  fetchPersonStats, 
  createPerson, 
  updatePerson, 
  deletePerson 
} from '../api/client'
import { personTypeLabel, type Person, type PersonStats } from '../types'
import { useStore } from '../store'

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return 'hace un momento'
  if (diff < 3600) return `hace ${Math.floor(diff / 60)}m`
  return `hace ${Math.floor(diff / 3600)}h ${Math.floor((diff % 3600) / 60)}m`
}

function PersonModal({ 
  person, 
  onSave, 
  onClose 
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
  const [photoPreview, setPhotoPreview] = useState<string | null>(person?.photo_path ? `/media/${person.photo_path}` : null)

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string)
        setForm({...form, photo_data: reader.result as string})
      }
      reader.readAsDataURL(file)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass backdrop-blur-2xl border border-glass/50 rounded-3xl w-full max-w-md shadow-[0_0_60px_rgba(0,178,255,0.15)]">
        <div className="px-6 py-4 border-b border-glass/50 bg-gradient-to-r from-transparent via-cyan-500/5 to-transparent flex items-center justify-between">
          <h2 className="text-white font-semibold text-lg">
            {person ? 'Editar Persona' : 'Nueva Persona'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-2xl">×</button>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex justify-center">
            <label className="cursor-pointer">
              <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
              <div className="w-24 h-24 rounded-full bg-gray-800 border-2 border-dashed border-gray-600 flex items-center justify-center overflow-hidden hover:border-cyan-400 transition-colors">
                {photoPreview ? (
                  <img src={photoPreview} alt="Foto" className="w-full h-full object-cover" />
                ) : (
                  <Icon icon="Camera" size={24} className="text-gray-500" />
                )}
              </div>
              <p className="text-xs text-gray-500 text-center mt-1">Foto</p>
            </label>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Nombre completo *</label>
            <input
              type="text"
              value={form.full_name}
              onChange={e => setForm({...form, full_name: e.target.value})}
              className="w-full bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-2.5 text-white"
              placeholder="Nombre completo"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Cédula</label>
              <input
                type="text"
                value={form.cedula}
                onChange={e => setForm({...form, cedula: e.target.value})}
                className="w-full bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-2.5 text-white"
                placeholder="Número de identificación"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Teléfono</label>
              <input
                type="text"
                value={form.phone}
                onChange={e => setForm({...form, phone: e.target.value})}
                className="w-full bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-2.5 text-white"
                placeholder="Teléfono"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={e => setForm({...form, email: e.target.value})}
              className="w-full bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-2.5 text-white"
              placeholder="correo@ejemplo.com"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Apartamento</label>
              <input
                type="text"
                value={form.apartment}
                onChange={e => setForm({...form, apartment: e.target.value})}
                className="w-full bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-2.5 text-white"
                placeholder="Apto"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Tipo</label>
              <select
                value={form.person_type}
                onChange={e => setForm({...form, person_type: e.target.value as 'client' | 'visitor' | 'employee'})}
                className="w-full bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-2.5 text-white"
              >
                <option value="client">Cliente</option>
                <option value="visitor">Visitante</option>
                <option value="employee">Empleado</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-gray-700 text-gray-400 hover:text-white">
              Cancelar
            </button>
            <button 
              onClick={() => onSave(form)}
              disabled={!form.full_name.trim()}
              className="flex-1 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-black font-semibold"
            >
              {person ? 'Guardar' : 'Crear'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function OccupantsPage() {
  const { triggerOccupantsRefresh } = useStore()
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
    const handleRefresh = () => setRefreshKey(k => k + 1)
    triggerOccupantsRefresh() // Load initial
    // Subscribe to store refreshes by checking a ref or triggering load
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
    } catch (err) {
      console.error('Error loading data:', err)
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
    } catch (err) {
      console.error('Error saving:', err)
    }
  }

  async function handleDelete(id: string) {
    if (confirm('¿Eliminar esta persona?')) {
      try {
        await deletePerson(id)
        loadData()
      } catch (err) {
        console.error('Error deleting:', err)
      }
    }
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <div className="glass rounded-2xl p-4 border border-glass/50">
          <p className="text-gray-400 text-xs">Total</p>
          <p className="text-2xl font-bold text-white">{stats?.total || 0}</p>
        </div>
        <div className="glass rounded-2xl p-4 border border-glass/50">
          <p className="text-gray-400 text-xs">Empleados</p>
          <p className="text-2xl font-bold text-green-400">{stats?.employees || 0}</p>
        </div>
        <div className="glass rounded-2xl p-4 border border-glass/50">
          <p className="text-gray-400 text-xs">Clientes</p>
          <p className="text-2xl font-bold text-blue-400">{stats?.clients || 0}</p>
        </div>
        <div className="glass rounded-2xl p-4 border border-glass/50">
          <p className="text-gray-400 text-xs">Visitantes</p>
          <p className="text-2xl font-bold text-yellow-400">{stats?.visitors || 0}</p>
        </div>
        <div className="glass rounded-2xl p-4 border border-glass/50">
          <p className="text-gray-400 text-xs">Adentro</p>
          <p className="text-2xl font-bold text-cyan-400">{stats?.inside || 0}</p>
        </div>
        <div className="glass rounded-2xl p-4 border border-glass/50">
          <p className="text-gray-400 text-xs">Afuera</p>
          <p className="text-2xl font-bold text-gray-400">{stats?.outside || 0}</p>
        </div>
      </div>

      {/* Filters & Actions */}
      <div className="glass rounded-2xl p-4 border border-glass/50 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-3">
          <select
            value={filter.state}
            onChange={e => setFilter({...filter, state: e.target.value})}
            className="bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
          >
            <option value="">Todos los estados</option>
            <option value="IN">Adentro</option>
            <option value="OUT">Afuera</option>
          </select>
          <select
            value={filter.person_type}
            onChange={e => setFilter({...filter, person_type: e.target.value})}
            className="bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
          >
            <option value="">Todos los tipos</option>
            <option value="client">Cliente</option>
            <option value="visitor">Visitante</option>
            <option value="employee">Empleado</option>
          </select>
          <input
            type="text"
            placeholder="Buscar..."
            value={filter.search}
            onChange={e => setFilter({...filter, search: e.target.value})}
            className="bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setEditingPerson(null); setShowModal(true) }}
            className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-sm flex items-center gap-2"
          >
            <Icon icon="Plus" size={16} /> Nueva Persona
          </button>
          <button
            onClick={() => loadData()}
            className="px-3 py-2 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-800 font-medium text-sm flex items-center gap-2"
          >
            <Icon icon="SyncAlt" size={16} />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="glass rounded-2xl border border-glass/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-800/50 text-gray-400 text-xs uppercase">
              <tr>
                <th className="text-left p-4 w-16">Foto</th>
                <th className="text-left p-4">Nombre</th>
                <th className="text-left p-4">Cédula</th>
                <th className="text-left p-4">Contacto</th>
                <th className="text-left p-4">Apartamento</th>
                <th className="text-left p-4">Tipo</th>
                <th className="text-left p-4">Estado</th>
                <th className="text-left p-4">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-glass/30">
              {loading ? (
                <tr><td colSpan={8} className="p-8 text-center text-gray-500">Cargando...</td></tr>
              ) : people.length === 0 ? (
                <tr><td colSpan={8} className="p-8 text-center text-gray-500">No hay personas</td></tr>
              ) : (
                people.map((p: any) => (
                  <tr key={p.id} className="hover:bg-cyan-500/5 transition-colors">
                    <td className="p-4">
                      <div className="w-10 h-10 rounded-full bg-gray-800 border border-gray-700 overflow-hidden">
                        {p.photo_path ? (
                          <img src={`/media/${p.photo_path}`} alt={p.full_name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Icon icon="User" size={16} className="text-gray-600" />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-white font-medium">{p.full_name}</td>
                    <td className="p-4 text-gray-400">{p.cedula || '—'}</td>
                    <td className="p-4 text-gray-400">
                      <div>{p.email || '—'}</div>
                      <div className="text-xs text-gray-500">{p.phone || ''}</div>
                    </td>
                    <td className="p-4 text-gray-400">{p.apartment || '—'}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-xs ${
                        p.person_type === 'employee'
                          ? 'bg-green-500/20 text-green-400 border border-green-400/30'
                          : p.person_type === 'client'
                            ? 'bg-blue-500/20 text-blue-400 border border-blue-400/30'
                            : 'bg-yellow-500/20 text-yellow-400 border border-yellow-400/30'
                      }`}>
                        {personTypeLabel(p.person_type)}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-xs ${
                        p.state === 'IN'
                          ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-400/30'
                          : 'bg-gray-500/20 text-gray-400 border border-gray-400/30'
                      }`}>
                        {p.state === 'IN' ? 'Adentro' : 'Afuera'}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <button onClick={() => { setEditingPerson(p); setShowModal(true) }} className="p-2 rounded hover:bg-cyan-500/20 text-gray-400 hover:text-cyan-400">
                          <Icon icon="Edit" size={16} />
                        </button>
                        <button onClick={() => handleDelete(p.id)} className="p-2 rounded hover:bg-red-500/20 text-gray-400 hover:text-red-400">
                          <Icon icon="Trash" size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <PersonModal
          person={editingPerson}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditingPerson(null) }}
        />
      )}
    </div>
  )
}