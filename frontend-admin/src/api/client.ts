import type { EventRecord, Person } from '../types'

const BASE = '/api/v1'

export interface PersonStats {
  total: number
  employees: number
  clients: number
  visitors: number
  inside: number
  outside: number
}

export interface EventStats {
  total: number
  entries: number
  exits: number
  unknown: number
  today: number
  days: number
}

export interface DayEvent {
  date: string
  day: string
  entries: number
  exits: number
}

export async function fetchOccupants(): Promise<Person[]> {
  const res = await fetch(`${BASE}/people?state=IN`)
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
  
  const res = await fetch(`${BASE}/people?${query}`)
  if (!res.ok) throw new Error('Error al cargar personas')
  return res.json()
}

export async function fetchPersonStats(): Promise<PersonStats> {
  const res = await fetch(`${BASE}/people/stats`)
  if (!res.ok) throw new Error('Error al cargar estadísticas')
  return res.json()
}

export async function fetchPerson(id: string): Promise<Person> {
  const res = await fetch(`${BASE}/people/${id}`)
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
    headers: { 'Content-Type': 'application/json' },
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
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Error al actualizar persona')
  return res.json()
}

export async function deletePerson(id: string): Promise<void> {
  const res = await fetch(`${BASE}/people/${id}`, {
    method: 'DELETE',
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
  
  const res = await fetch(`${BASE}/events?${query}`)
  if (!res.ok) throw new Error('Error al cargar eventos')
  return res.json()
}

export async function fetchEventStats(days = 7): Promise<EventStats> {
  const res = await fetch(`${BASE}/events/stats?days=${days}`)
  if (!res.ok) throw new Error('Error al cargar estadísticas de eventos')
  return res.json()
}

export async function fetchEventsByDay(days = 7): Promise<DayEvent[]> {
  const res = await fetch(`${BASE}/events/by-day?days=${days}`)
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
  
  const res = await fetch(`${BASE}/events/count?${query}`)
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
}): Promise<Person> {
  const res = await fetch(`${BASE}/visitors`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Error al registrar visitante')
  return res.json()
}

export async function approvePending(pendingId: string, action: 'approve' | 'deny'): Promise<void> {
  const res = await fetch(`${BASE}/approve/${pendingId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action }),
  })
  if (!res.ok) throw new Error('Error al procesar aprobación')
}

export async function completeRegistration(pendingId: string, data: {
  full_name: string
  cedula?: string
  phone?: string
  apartment?: string
  person_type: string
}): Promise<{ person_id: string }> {
  const res = await fetch(`${BASE}/complete-registration/${pendingId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Error al completar registro')
  return res.json()
}

export async function cancelPending(pendingId: string): Promise<void> {
  const res = await fetch(`${BASE}/cancel/${pendingId}`, {
    method: 'POST',
  })
  if (!res.ok) throw new Error('Error al cancelar')
}