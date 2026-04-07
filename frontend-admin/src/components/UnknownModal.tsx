import { useState } from 'react'
import { registerVisitor } from '../api/client'
import { useStore } from '../store'

interface UnknownModalProps {
  alert: any
  dismiss: () => void
}

export function UnknownModal({ alert, dismiss }: UnknownModalProps) {
  const loadOccupants = useStore(s => s.loadOccupants)

  const [form, setForm] = useState({ full_name: '', cedula: '', email: '', phone: '', apartment: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.full_name.trim()) { setError('El nombre es obligatorio.'); return }
    setLoading(true); setError(null)
    try {
      await registerVisitor({ temp_id: alert.temp_id, ...form })
      await loadOccupants()
      dismiss()
      setForm({ full_name: '', cedula: '', email: '', phone: '', apartment: '' })
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const field = (label: string, key: keyof typeof form, required = false) => (
    <div>
      <label className="block text-xs text-gray-400 mb-1.5 font-medium flex items-center gap-1">
        {label} {required && <span className="text-yellow-500">*</span>}
      </label>
      <input
        type="text"
        value={form[key]}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        required={required}
        className="w-full bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 transition-all placeholder-gray-600"
        placeholder={`Ingresa ${label.toLowerCase()}`}
      />
    </div>
  )

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass backdrop-blur-2xl border border-glass/50 rounded-3xl w-full max-w-md shadow-[0_0_60px_rgba(255,202,58,0.15)] relative overflow-hidden">
        <div className="absolute inset-0 border-2 border-yellow-500/20 rounded-3xl pointer-events-none animate-pulse" />

        <div className="flex items-center justify-between px-8 py-6 border-b border-glass/50 bg-gradient-to-r from-transparent via-yellow-500/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-yellow-500/20 border border-yellow-400/30 flex items-center justify-center">
              <span className="text-yellow-400">⚠️</span>
            </div>
            <div>
              <h2 className="text-white font-semibold text-lg">Validación Requerida</h2>
              <p className="text-yellow-200/70 text-xs">Persona desconocida detectada</p>
            </div>
          </div>
          <button onClick={dismiss} className="text-gray-500 hover:text-white text-2xl leading-none transition-colors px-2">
            ×
          </button>
        </div>

        <div className="px-8 py-6">
          {alert.photo_url && (
            <div className="relative mb-6">
              <div className="absolute -inset-1 bg-yellow-500/30 rounded-2xl blur-xl pointer-events-none animate-pulse" />
              <div className="relative">
                <img
                  src={alert.photo_url}
                  alt="Desconocido"
                  className="w-full h-48 rounded-2xl object-cover border-2 border-yellow-400/30 shadow-[0_0_20px_rgba(255,202,58,0.2)]"
                />
                <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-lg border border-yellow-400/30">
                  <span className="text-[10px] font-bold text-yellow-400 tracking-wider uppercase">Foto Detectada</span>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {field('Nombre completo', 'full_name', true)}
            <div className="grid grid-cols-2 gap-3">
              {field('Cédula', 'cedula')}
              {field('Teléfono', 'phone')}
            </div>
            {field('Apartamento destino', 'apartment')}
            {field('Email', 'email')}

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={dismiss}
                className="flex-1 py-3 rounded-xl border border-gray-700 text-gray-400 hover:text-white hover:border-gray-600 bg-gray-800/50 backdrop-blur-md text-sm font-medium transition-all"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-3 rounded-xl bg-gradient-to-br from-yellow-500 to-yellow-400 hover:from-yellow-400 hover:to-yellow-300 disabled:opacity-50 disabled:cursor-not-allowed text-black font-semibold text-sm transition-all shadow-[0_0_15px_rgba(255,202,58,0.3)]"
              >
                {loading ? 'Procesando...' : 'Autorizar Ingreso'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
