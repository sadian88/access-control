export interface Person {
  id: string
  full_name: string
  cedula: string | null
  email: string | null
  phone: string | null
  apartment: string | null
  photo_path: string | null
  person_type: 'resident' | 'client' | 'visitor'
  state: 'IN' | 'OUT'
  last_entry_at: string | null
  created_at: string
}

export interface EventRecord {
  id: string
  person_id: string | null
  person_name: string | null
  event_type: 'entry' | 'exit' | 'unknown'
  photo_path: string | null
  stay_duration: string | null
  timestamp: string
}

export type WsEvent =
  | { type: 'entry'; person: { id: string; full_name: string; apartment: string | null; person_type: string }; duration: string | null; timestamp: string }
  | { type: 'exit'; person: { id: string; full_name: string; apartment: string | null; person_type: string }; duration: string | null; timestamp: string }
  | { type: 'unknown'; temp_id: string; photo_url: string | null; timestamp: string }
  | { type: 'pending_approval'; pending_id: string; person: { id: string; full_name: string; apartment: string | null; person_type: string; photo_path: string | null }; event_type: string; message: string; duration: string | null; photo_url: string | null; timestamp: string }
  | { type: 'pending_registration'; pending_id: string; temp_id: string; photo_url: string | null; timestamp: string }

export interface Notification {
  id: string
  wsEvent: WsEvent
  seen: boolean
}

export interface PersonStats {
  total: number
  residents: number
  clients: number
  visitors: number
  inside: number
  outside: number
}
