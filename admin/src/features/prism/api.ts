import { useAuthStore } from '@/stores/auth-store'
import type { EventRecord, Person, PersonStats, EventStats, DayEvent } from './types'

const BASE = '/api/v1'

function authHeaders(): Record<string, string> {
  const token = useAuthStore.getState().auth.accessToken
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function fetchOccupants(): Promise<Person[]> {
  const res = await fetch(`${BASE}/people?state=IN`, { headers: authHeaders() })
  if (!res.ok) throw new Error('Error al cargar ocupantes')
  return res.json()
}

export async function fetchAllPeople(params?: {
  state?: string
  person_type?: string
  search?: string
}): Promise<Person[]> {
  const query = new URLSearchParams()
  if (params?.state) query.set('state', params.state)
  if (params?.person_type) query.set('person_type', params.person_type)
  if (params?.search) query.set('search', params.search)
  const res = await fetch(`${BASE}/people?${query}`, { headers: authHeaders() })
  if (!res.ok) throw new Error('Error al cargar personas')
  return res.json()
}

export async function fetchPersonStats(): Promise<PersonStats> {
  const res = await fetch(`${BASE}/people/stats`, { headers: authHeaders() })
  if (!res.ok) throw new Error('Error al cargar estadísticas')
  return res.json()
}

export async function fetchPerson(id: string): Promise<Person> {
  const res = await fetch(`${BASE}/people/${id}`, { headers: authHeaders() })
  if (!res.ok) throw new Error('Error al cargar persona')
  return res.json()
}

export async function createPerson(data: {
  full_name: string
  cedula?: string
  email?: string
  phone?: string
  apartment?: string
  person_type?: string
  photo_data?: string
}): Promise<Person> {
  const res = await fetch(`${BASE}/people`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Error al crear persona')
  return res.json()
}

export async function updatePerson(id: string, data: Partial<{
  full_name: string
  cedula: string
  email: string
  phone: string
  apartment: string
  person_type: string
  photo_data: string
}>): Promise<Person> {
  const res = await fetch(`${BASE}/people/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Error al actualizar persona')
  return res.json()
}

export async function deletePerson(id: string): Promise<void> {
  const res = await fetch(`${BASE}/people/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error('Error al eliminar persona')
}

export async function fetchEvents(params?: {
  limit?: number
  offset?: number
  event_type?: string
  person_id?: string
  start_date?: string
  end_date?: string
}): Promise<EventRecord[]> {
  const query = new URLSearchParams()
  if (params?.limit) query.set('limit', String(params.limit))
  if (params?.offset) query.set('offset', String(params.offset))
  if (params?.event_type) query.set('event_type', params.event_type)
  if (params?.person_id) query.set('person_id', params.person_id)
  if (params?.start_date) query.set('start_date', params.start_date)
  if (params?.end_date) query.set('end_date', params.end_date)
  const res = await fetch(`${BASE}/events?${query}`, { headers: authHeaders() })
  if (!res.ok) throw new Error('Error al cargar eventos')
  return res.json()
}

export async function fetchEventStats(days = 7): Promise<EventStats> {
  const res = await fetch(`${BASE}/events/stats?days=${days}`, { headers: authHeaders() })
  if (!res.ok) throw new Error('Error al cargar estadísticas de eventos')
  return res.json()
}

export async function fetchEventsByDay(days = 7): Promise<DayEvent[]> {
  const res = await fetch(`${BASE}/events/by-day?days=${days}`, { headers: authHeaders() })
  if (!res.ok) throw new Error('Error al cargar eventos por día')
  return res.json()
}

export async function fetchEventCount(params?: {
  event_type?: string
  start_date?: string
  end_date?: string
}): Promise<{ count: number }> {
  const query = new URLSearchParams()
  if (params?.event_type) query.set('event_type', params.event_type)
  if (params?.start_date) query.set('start_date', params.start_date)
  if (params?.end_date) query.set('end_date', params.end_date)
  const res = await fetch(`${BASE}/events/count?${query}`, { headers: authHeaders() })
  if (!res.ok) throw new Error('Error al contar eventos')
  return res.json()
}

export function exportToCSV(data: any[], filename: string) {
  if (data.length === 0) return
  const headers = Object.keys(data[0])
  const csvRows = [
    headers.join(','),
    ...data.map(row =>
      headers.map(h => {
        const val = row[h]
        if (val === null || val === undefined) return ''
        if (typeof val === 'string' && val.includes(',')) return `"${val}"`
        return String(val)
      }).join(',')
    )
  ]
  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export async function registerVisitor(data: {
  temp_id: string
  full_name: string
  cedula?: string
  email?: string
  phone?: string
  apartment?: string
  visitor_card_number?: string
  belongs_to?: string
}): Promise<Person> {
  const res = await fetch(`${BASE}/visitors`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Error al registrar visitante')
  return res.json()
}

export async function approvePending(
  pendingId: string,
  action: 'approve' | 'deny',
  data?: { visitor_card_number?: string; belongs_to?: string }
): Promise<void> {
  const res = await fetch(`${BASE}/approve/${pendingId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ action, ...data }),
  })
  if (!res.ok) throw new Error('Error al procesar aprobación')
}

export async function completeRegistration(pendingId: string, data: {
  full_name: string
  cedula?: string
  phone?: string
  apartment?: string
  person_type: string
  visitor_card_number?: string
  belongs_to?: string
}): Promise<{ person_id: string }> {
  const res = await fetch(`${BASE}/complete-registration/${pendingId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Error al completar registro')
  return res.json()
}

export async function cancelPending(pendingId: string): Promise<void> {
  const res = await fetch(`${BASE}/cancel/${pendingId}`, {
    method: 'POST',
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error('Error al cancelar')
}

export async function manualIdentify(frame_b64: string): Promise<{
  status: 'known' | 'unknown' | 'no_face'
  person?: {
    id: string
    full_name: string
    cedula: string | null
    phone: string | null
    apartment: string | null
    photo_path: string | null
    person_type: string
    state: string
  }
  suggested_event_type?: 'entry' | 'exit'
  last_entry_data?: {
    visitor_card_number: string | null
    belongs_to: string | null
    entry_zone: string | null
    has_equipment: boolean | null
    notes: string | null
  }
}> {
  const res = await fetch(`${BASE}/manual-identify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ frame_b64 }),
  })
  if (!res.ok) throw new Error('Error en identificación manual')
  return res.json()
}

export async function createManualEvent(data: {
  frame_b64?: string
  person_id?: string
  is_new_person?: boolean
  full_name?: string
  cedula?: string
  phone?: string
  apartment?: string
  person_type?: string
  event_type: 'entry' | 'exit'
  visitor_card_number?: string
  belongs_to?: string
  entry_zone?: string
  has_equipment?: boolean
  notes?: string
}): Promise<{ status: string; event_id: string; person_id: string; message: string }> {
  const res = await fetch(`${BASE}/manual-event`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Error al crear evento' }))
    throw new Error(err.detail || 'Error al crear evento')
  }
  return res.json()
}
