import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Check, X, UserPlus } from 'lucide-react'

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
  visitor_card_number?: string | null
  belongs_to?: string | null
}

interface PendingRegistration {
  pending_id: string
  temp_id: string
  photo_url: string | null
}

interface Props {
  pendingApprovals: PendingApproval[]
  pendingRegistrations: PendingRegistration[]
  onApprove: (pendingId: string, data?: { visitor_card_number?: string; belongs_to?: string }) => void
  onDeny: (pendingId: string) => void
  onRegister: (pendingId: string, data: {
    full_name: string
    cedula?: string
    phone?: string
    apartment?: string
    person_type: string
    visitor_card_number?: string
    belongs_to?: string
  }) => void
  onCancel: (pendingId: string) => void
}

export function PrismPendingModals({ pendingApprovals, pendingRegistrations, onApprove, onDeny, onRegister, onCancel }: Props) {
  return (
    <>
      {pendingApprovals.map(p => (
        <ApprovalModal key={p.pending_id} data={p} onApprove={(data) => onApprove(p.pending_id, data)} onDeny={() => onDeny(p.pending_id)} onCancel={() => onCancel(p.pending_id)} />
      ))}
      {pendingRegistrations.map(p => (
        <RegistrationModal key={p.pending_id} data={p} onRegister={(data) => onRegister(p.pending_id, data)} onDeny={() => onDeny(p.pending_id)} onCancel={() => onCancel(p.pending_id)} />
      ))}
    </>
  )
}

function ApprovalModal({ data, onApprove, onDeny, onCancel }: {
  data: PendingApproval
  onApprove: (data?: { visitor_card_number?: string; belongs_to?: string }) => void
  onDeny: () => void
  onCancel: () => void
}) {
  const isEntry = data.event_type === 'entry'
  const [cardNumber, setCardNumber] = useState('')
  const [belongsTo, setBelongsTo] = useState('')

  const displayPhotoUrl = data.photo_url || (data.person.photo_path ? `/media/${data.person.photo_path}` : null)

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onCancel() }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Solicitud de {data.event_type === 'entry' ? 'Ingreso' : 'Salida'}</DialogTitle>
        </DialogHeader>
        <div className="flex items-start gap-4">
          <Avatar className="w-24 h-24 rounded-lg">
            {displayPhotoUrl ? <AvatarImage src={displayPhotoUrl} alt={data.person.full_name} /> : null}
            <AvatarFallback className="text-2xl rounded-lg">{data.person.full_name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <h3 className="text-lg font-semibold">{data.person.full_name}</h3>
            <p className="text-sm text-muted-foreground">
              {data.event_type === 'entry' ? 'Solicita ingreso' : 'Solicita salida'}
            </p>
            {data.person.apartment && <p className="text-sm text-muted-foreground">Apto: {data.person.apartment}</p>}
          </div>
        </div>

        {/* Entry: ask for card info. Exit: show existing card info */}
        {isEntry ? (
          <div className="space-y-3 mt-4">
            <div>
              <Label>Número de tarjeta visitante</Label>
              <Input
                value={cardNumber}
                onChange={e => setCardNumber(e.target.value)}
                placeholder="Ej: V-12345"
              />
            </div>
            <div>
              <Label>Pertenece a</Label>
              <Select value={belongsTo} onValueChange={setBelongsTo}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UNFINET">UNFINET</SelectItem>
                  <SelectItem value="IFX">IFX</SelectItem>
                  <SelectItem value="OTRO">OTRO</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-2 rounded-lg border p-3 bg-muted/50">
            <p className="text-sm font-medium">Información del visitante</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Tarjeta:</span>
                <p className="font-medium">{data.visitor_card_number || '—'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Pertenece a:</span>
                <p className="font-medium">{data.belongs_to || '—'}</p>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <Button variant="outline" className="flex-1" onClick={onCancel}>Cancelar</Button>
          <Button variant="destructive" className="flex-1" onClick={onDeny}><X className="mr-2 h-4 w-4" /> Denegar</Button>
          <Button className="flex-1" onClick={() => onApprove(
            isEntry ? { visitor_card_number: cardNumber || undefined, belongs_to: belongsTo || undefined } : undefined
          )}><Check className="mr-2 h-4 w-4" /> Aprobar</Button>
        </div>
      </DialogContent>
    </Dialog>
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
    visitor_card_number: '',
    belongs_to: '',
  })

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onCancel() }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Registro de Visitante</DialogTitle>
        </DialogHeader>
        <div className="flex gap-4">
          <Avatar className="w-32 h-32 rounded-lg shrink-0">
            {data.photo_url ? <AvatarImage src={data.photo_url} alt="Visitante" /> : null}
            <AvatarFallback className="text-3xl rounded-lg">?</AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-2">
            <Input placeholder="Nombre completo *" value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} />
            <Input placeholder="Cédula" value={form.cedula} onChange={e => setForm({...form, cedula: e.target.value})} />
            <Input placeholder="Teléfono" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
            <Input placeholder="Apartamento" value={form.apartment} onChange={e => setForm({...form, apartment: e.target.value})} />
          </div>
        </div>
        <div className="space-y-3">
          <div>
            <Label>Tipo de persona</Label>
            <Select value={form.person_type} onValueChange={v => setForm({...form, person_type: v})}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="client">Cliente</SelectItem>
                <SelectItem value="visitor">Visitante</SelectItem>
                <SelectItem value="employee">Empleado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Número de tarjeta visitante</Label>
              <Input
                value={form.visitor_card_number}
                onChange={e => setForm({...form, visitor_card_number: e.target.value})}
                placeholder="Ej: V-12345"
              />
            </div>
            <div>
              <Label>Pertenece a</Label>
              <Select value={form.belongs_to} onValueChange={v => setForm({...form, belongs_to: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UNFINET">UNFINET</SelectItem>
                  <SelectItem value="IFX">IFX</SelectItem>
                  <SelectItem value="OTRO">OTRO</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <Button variant="outline" className="flex-1" onClick={onCancel}>Cancelar</Button>
          <Button variant="destructive" className="flex-1" onClick={onDeny}><X className="mr-2 h-4 w-4" /> Denegar</Button>
          <Button className="flex-1" disabled={!form.full_name.trim()} onClick={() => onRegister(form)}><UserPlus className="mr-2 h-4 w-4" /> Registrar</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
