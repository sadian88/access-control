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
import { AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { registerVisitor } from '../api'
import { usePrismStore } from '../store'

interface UnknownModalProps {
  alert: any
  dismiss: () => void
}

export function PrismUnknownModal({ alert, dismiss }: UnknownModalProps) {
  const loadOccupants = usePrismStore(s => s.loadOccupants)

  const [form, setForm] = useState({
    full_name: '',
    cedula: '',
    email: '',
    phone: '',
    apartment: '',
    visitor_card_number: '',
    belongs_to: '',
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.full_name.trim()) {
      toast.error('El nombre es obligatorio.')
      return
    }
    setLoading(true)
    try {
      await registerVisitor({ temp_id: alert.temp_id, ...form })
      await loadOccupants()
      dismiss()
      setForm({ full_name: '', cedula: '', email: '', phone: '', apartment: '', visitor_card_number: '', belongs_to: '' })
      toast.success('Visitante autorizado')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) dismiss() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Validación Requerida
          </DialogTitle>
        </DialogHeader>

        {alert.photo_url && (
          <img
            src={alert.photo_url}
            alt="Desconocido"
            className="w-full h-48 rounded-lg object-cover border"
          />
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label>Nombre completo *</Label>
            <Input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} placeholder="Nombre completo" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Cédula</Label>
              <Input value={form.cedula} onChange={e => setForm(f => ({ ...f, cedula: e.target.value }))} placeholder="Cédula" />
            </div>
            <div>
              <Label>Teléfono</Label>
              <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="Teléfono" />
            </div>
          </div>
          <div>
            <Label>Apartamento destino</Label>
            <Input value={form.apartment} onChange={e => setForm(f => ({ ...f, apartment: e.target.value }))} placeholder="Apartamento" />
          </div>
          <div>
            <Label>Email</Label>
            <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="Email" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Número de tarjeta visitante</Label>
              <Input value={form.visitor_card_number} onChange={e => setForm(f => ({ ...f, visitor_card_number: e.target.value }))} placeholder="Ej: V-12345" />
            </div>
            <div>
              <Label>Pertenece a</Label>
              <Select value={form.belongs_to} onValueChange={v => setForm(f => ({ ...f, belongs_to: v }))}>
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

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={dismiss}>Cancelar</Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Procesando...' : 'Autorizar Ingreso'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
