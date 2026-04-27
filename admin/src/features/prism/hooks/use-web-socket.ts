import { useEffect, useRef } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { usePrismStore } from '../store'
import type { WsEvent } from '../types'

function getWsUrl(token: string) {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${window.location.host}/api/v1/ws/admin?token=${encodeURIComponent(token)}`
}

const RECONNECT_MS = 3000

export function useWebSocket() {
  const setConnected = usePrismStore(s => s.setWsConnected)
  const handleEvent = usePrismStore(s => s.handleWsEvent)
  const wsRef = useRef<WebSocket | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const token = useAuthStore.getState().auth.accessToken
    if (!token) return

    function connect() {
      const ws = new WebSocket(getWsUrl(token))
      wsRef.current = ws

      ws.onopen = () => setConnected(true)
      ws.onclose = () => {
        setConnected(false)
        timerRef.current = setTimeout(connect, RECONNECT_MS)
      }
      ws.onerror = () => ws.close()
      ws.onmessage = (e) => {
        try {
          const event = JSON.parse(e.data) as WsEvent
          handleEvent(event)
        } catch { /* ignorar mensajes malformados */ }
      }
    }

    connect()
    return () => {
      wsRef.current?.close()
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])
}
