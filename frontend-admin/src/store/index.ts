import { create } from 'zustand'
import type { EventRecord, Notification, Person, WsEvent } from '../types'
import { fetchEvents, fetchOccupants } from '../api/client'

interface PendingApproval {
  pending_id: string
  person: {
    id: string
    full_name: string
    apartment: string | null
    person_type: string
    photo_path: string | null
  }
  event_type: "entry" | "exit"
  message: string
  duration: string | null
  photo_url: string | null
}

interface PendingRegistration {
  pending_id: string
  temp_id: string
  photo_url: string | null
}

interface Store {
  occupants: Person[]
  events: EventRecord[]
  notifications: Notification[]
  unknownAlert: (WsEvent & { type: 'unknown' }) | null
  wsConnected: boolean
  currentPage: number
  itemsPerPage: number
  activityDateFilter: { start_date: string; end_date: string } | null
  pendingApprovals: PendingApproval[]
  pendingRegistrations: PendingRegistration[]

  setWsConnected: (v: boolean) => void
  loadOccupants: () => Promise<void>
  loadEvents: () => Promise<void>
  handleWsEvent: (event: WsEvent) => void
  dismissUnknown: () => void
  clearNotification: (id: string) => void
  setCurrentPage: (page: number) => void
  setItemsPerPage: (items: number) => void
  getPaginatedEvents: () => { items: EventRecord[]; totalPages: number }
  setActivityDateFilter: (filter: { start_date: string; end_date: string } | null) => void
  addPendingApproval: (approval: PendingApproval) => void
  removePendingApproval: (id: string) => void
  addPendingRegistration: (reg: PendingRegistration) => void
  removePendingRegistration: (id: string) => void
  triggerOccupantsRefresh: () => void
}

export const useStore = create<Store>((set, get) => ({
  occupants: [],
  events: [],
  notifications: [],
  unknownAlert: null,
  wsConnected: false,
  currentPage: 1,
  itemsPerPage: 5,
  activityDateFilter: null,
  pendingApprovals: [],
  pendingRegistrations: [],

  setWsConnected: (v) => set({ wsConnected: v }),

  loadOccupants: async () => {
    try {
      const occupants = await fetchOccupants()
      set({ occupants })
    } catch (error) {
      console.error('Error loading occupants:', error)
    }
  },

  loadEvents: async () => {
    try {
      const events = await fetchEvents()
      set({ events })
    } catch (error) {
      console.error('Error loading events:', error)
    }
  },

  handleWsEvent: (event) => {
    // Handle pending_approval
    if (event.type === 'pending_approval') {
      set((s) => ({
        pendingApprovals: [...s.pendingApprovals, {
          pending_id: event.pending_id,
          person: event.person,
          event_type: event.event_type as 'entry' | 'exit',
          message: event.message,
          duration: event.duration,
          photo_url: event.photo_url,
        }],
      }))
      return
    }

    // Handle pending_registration
    if (event.type === 'pending_registration') {
      set((s) => ({
        pendingRegistrations: [...s.pendingRegistrations, {
          pending_id: event.pending_id,
          temp_id: event.temp_id,
          photo_url: event.photo_url,
        }],
      }))
      return
    }

    // Handle entry
    if (event.type === 'entry') {
      set((s) => {
        // Remove from pending approvals if exists
        const newApprovals = s.pendingApprovals.filter(p => p.person.id !== event.person.id)
        return {
          notifications: [{
            id: crypto.randomUUID(),
            wsEvent: event,
            seen: false,
          }, ...s.notifications].slice(0, 50),
          occupants: s.occupants.find(o => o.id === event.person.id)
            ? s.occupants
            : [...s.occupants, {
                id: event.person.id,
                full_name: event.person.full_name,
                apartment: event.person.apartment,
                person_type: event.person.person_type as 'resident' | 'client' | 'visitor',
                state: 'IN',
                last_entry_at: event.timestamp,
                cedula: null, email: null, phone: null, photo_path: null, created_at: event.timestamp,
              }],
          pendingApprovals: newApprovals,
        }
      })
    } 
    // Handle exit
    else if (event.type === 'exit') {
      set((s) => ({
        notifications: [{
          id: crypto.randomUUID(),
          wsEvent: event,
          seen: false,
        }, ...s.notifications].slice(0, 50),
        occupants: s.occupants.filter(o => o.id !== event.person.id),
      }))
    }
    // Handle unknown (legacy)
    else if (event.type === 'unknown') {
      set((s) => ({
        notifications: [{
          id: crypto.randomUUID(),
          wsEvent: event,
          seen: false,
        }, ...s.notifications].slice(0, 50),
        unknownAlert: event,
      }))
    }

    get().loadEvents()
  },

  dismissUnknown: () => set({ unknownAlert: null }),

  clearNotification: (id) =>
    set((s) => ({ notifications: s.notifications.filter(n => n.id !== id) })),

  setCurrentPage: (page) => set({ currentPage: page }),
  setItemsPerPage: (items) => set({ itemsPerPage: items }),

  getPaginatedEvents: () => {
    const { events, currentPage, itemsPerPage } = get()
    const start = (currentPage - 1) * itemsPerPage
    const paginated = events.slice(start, start + itemsPerPage)
    const totalPages = Math.ceil(events.length / itemsPerPage)
    return { items: paginated, totalPages }
  },

  setActivityDateFilter: (filter) => set({ activityDateFilter: filter }),

  addPendingApproval: (approval) => set((s) => ({
    pendingApprovals: [...s.pendingApprovals, approval]
  })),
  
  removePendingApproval: (id) => set((s) => ({
    pendingApprovals: s.pendingApprovals.filter(p => p.pending_id !== id)
  })),
  
  addPendingRegistration: (reg) => set((s) => ({
    pendingRegistrations: [...s.pendingRegistrations, reg]
  })),
  
  removePendingRegistration: (id) => set((s) => ({
    pendingRegistrations: s.pendingRegistrations.filter(r => r.pending_id !== id)
  })),

  triggerOccupantsRefresh: async () => {
    await get().loadOccupants()
    window.dispatchEvent(new Event('occupants-refresh'))
  },
}))
