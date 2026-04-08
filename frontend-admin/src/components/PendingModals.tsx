import { useEffect, useState } from 'react'
import { Icon } from './Icon'

interface PendingApproval {
  pending_id: string
  person: {
    id: string
    full_name: string
    apartment: string | null
    person_type: string
    photo_path: string | null
  }
  event_type: 'entry' | 'exit'
  message: string
  duration: string | null
  photo_url: string | null
}

interface PendingRegistration {
  pending_id: string
  temp_id: string
  photo_url: string | null
}

interface Props {
  pendingApprovals: PendingApproval[]
  pendingRegistrations: PendingRegistration[]
  onApprove: (pendingId: string) => void
  onDeny: (pendingId: string) => void
  onRegister: (pendingId: string, data: {
    full_name: string
    cedula?: string
    phone?: string
    apartment?: string
    person_type: string
  }) => void
  onCancel: (pendingId: string) => void
}

export function PendingModals({ pendingApprovals, pendingRegistrations, onApprove, onDeny, onRegister, onCancel }: Props) {
  return (
    <>
      {pendingApprovals.map(p => (
        <ApprovalModal key={p.pending_id} data={p} onApprove={() => onApprove(p.pending_id)} onDeny={() => onDeny(p.pending_id)} onCancel={() => onCancel(p.pending_id)} />
      ))}
      {pendingRegistrations.map(p => (
        <RegistrationModal key={p.pending_id} data={p} onRegister={(data) => onRegister(p.pending_id, data)} onDeny={() => onDeny(p.pending_id)} onCancel={() => onCancel(p.pending_id)} />
      ))}
    </>
  )
}

function ApprovalModal({ data, onApprove, onDeny, onCancel }: {
  data: PendingApproval
  onApprove: () => void
  onDeny: () => void
  onCancel: () => void
}) {
  //优先显示捕获的照片，而不是存档的照片
  const displayPhotoUrl = data.photo_url || (data.person.photo_path ? `/media/${data.person.photo_path}` : null);
  
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass border border-cyan-500/50 rounded-2xl w-full max-w-2xl shadow-[0_0_60px_rgba(0,229,255,0.2)]">
        <div className="p-8">
          <div className="flex items-start gap-6 mb-6">
            <div className="w-40 h-40 rounded-2xl bg-gray-800 border border-gray-700 overflow-hidden shrink-0">
              {displayPhotoUrl ? (
                <img src={displayPhotoUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Icon icon="User" size={48} className="text-gray-600" />
                </div>
              )}
            </div>
            <div>
              <h3 className="text-white font-semibold text-xl">{data.person.full_name}</h3>
              <p className="text-cyan-400 text-base">
                {data.event_type === 'entry' ? 'Solicita ingreso' : 'Solicita salida'}
              </p>
              {data.person.apartment && (
                <p className="text-gray-500 text-base">Apto: {data.person.apartment}</p>
              )}
            </div>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 py-3 rounded-xl border border-gray-600 text-gray-400 hover:bg-gray-800 font-medium"
            >
              Cancelar
            </button>
            <button
              onClick={onDeny}
              className="flex-1 py-3 rounded-xl border border-red-500/50 text-red-400 hover:bg-red-500/10 font-medium"
            >
              <Icon icon="X" size={18} className="inline mr-2" />
              Denegar
            </button>
            <button
              onClick={onApprove}
              className="flex-1 py-3 rounded-xl bg-green-500 hover:bg-green-400 text-black font-medium"
            >
              <Icon icon="Check" size={18} className="inline mr-2" />
              Aprobar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function RegistrationModal({ data, onRegister, onDeny, onCancel }: {
  data: PendingRegistration
  onRegister: (d: any) => void
  onDeny: () => void
  onCancel: () => void
}) {
  const [form, setForm] = useState({
    full_name: '',
    cedula: '',
    phone: '',
    apartment: '',
    person_type: 'visitor',
  })

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass border border-yellow-500/50 rounded-2xl w-full max-w-2xl shadow-[0_0_60px_rgba(255,200,0,0.2)]">
        <div className="p-8">
          <h3 className="text-white font-semibold text-xl mb-6">Registro de Visitante</h3>
          
          <div className="flex gap-6 mb-6">
            <div className="w-40 h-40 rounded-2xl bg-gray-800 border border-gray-700 overflow-hidden shrink-0">
              {data.photo_url ? (
                <img src={data.photo_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Icon icon="User" size={48} className="text-gray-600" />
                </div>
              )}
            </div>
            <div className="flex-1 space-y-3">
              <input
                type="text"
                placeholder="Nombre completo *"
                value={form.full_name}
                onChange={e => setForm({...form, full_name: e.target.value})}
                className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
              />
              <input
                type="text"
                placeholder="Cédula"
                value={form.cedula}
                onChange={e => setForm({...form, cedula: e.target.value})}
                className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
              />
              <input
                type="text"
                placeholder="Teléfono"
                value={form.phone}
                onChange={e => setForm({...form, phone: e.target.value})}
                className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
              />
              <input
                type="text"
                placeholder="Apartamento"
                value={form.apartment}
                onChange={e => setForm({...form, apartment: e.target.value})}
                className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
              />
            </div>
          </div>

          <div className="mb-6">
            <label className="text-xs text-gray-400 mb-2 block">Tipo de persona</label>
            <select
              value={form.person_type}
              onChange={e => setForm({...form, person_type: e.target.value})}
              className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
            >
              <option value="client">Cliente</option>
              <option value="visitor">Visitante</option>
              <option value="employee">Empleado</option>
            </select>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 py-3 rounded-xl border border-gray-600 text-gray-400 hover:bg-gray-800 font-medium"
            >
              Cancelar
            </button>
            <button
              onClick={onDeny}
              className="flex-1 py-3 rounded-xl border border-red-500/50 text-red-400 hover:bg-red-500/10 font-medium"
            >
              <Icon icon="X" size={18} className="inline mr-2" />
              Denegar
            </button>
            <button
              onClick={() => onRegister(form)}
              disabled={!form.full_name.trim()}
              className="flex-1 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-black font-medium"
            >
              <Icon icon="UserPlus" size={18} className="inline mr-2" />
              Registrar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
