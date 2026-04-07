import { useEffect, useRef } from 'react'
import { useStore } from '../store'
import type { WsEvent } from '../types'

const WS_URL = 'ws://localhost:8000/api/v1/ws/admin'
const RECONNECT_MS = 3000

export function useWebSocket() {
  const setConnected = useStore(s => s.setWsConnected)
  const handleEvent = useStore(s => s.handleWsEvent)
  const wsRef = useRef<WebSocket | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    function connect() {
      const ws = new WebSocket(WS_URL)
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
