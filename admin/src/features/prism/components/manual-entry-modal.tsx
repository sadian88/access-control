import { useEffect, useRef, useState, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Check, LogIn, LogOut, Loader2, AlertTriangle, UserPlus, ScanFace, Camera } from 'lucide-react'
import { manualIdentify, createManualEvent } from '@/features/prism/api'
import { personTypeLabel } from '@/features/prism/types'
import { usePrismStore } from '@/features/prism/store'

declare global {
  interface Window {
    FaceMesh: any
    FACEMESH_TESSELATION: any
    FACEMESH_FACE_OVAL: any
    FACEMESH_LEFT_EYE: any
    FACEMESH_RIGHT_EYE: any
    FACEMESH_LEFT_EYEBROW: any
    FACEMESH_RIGHT_EYEBROW: any
    FACEMESH_LIPS: any
  }
}

const SCAN_INTERVAL = 600
const FACE_STABLE_FRAMES = 2
const MESH_INTERVAL = 85
const ANALYSIS_WIDTH = 480
const ANALYSIS_HEIGHT = 270

export function ManualEntryModal() {
  const { showEntryModal, entryModalType, setShowEntryModal, loadOccupants, loadEvents } = usePrismStore()
  const open = showEntryModal
  const defaultEventType = entryModalType
  const onOpenChange = setShowEntryModal
  const onSuccess = () => {
    loadOccupants()
    loadEvents()
  }
  const [step, setStep] = useState<'scanning' | 'loading' | 'form' | 'confirm' | 'success' | 'error'>('scanning')
  const [frameB64, setFrameB64] = useState('')
  const [person, setPerson] = useState<any>(null)
  const [suggestedType, setSuggestedType] = useState<'entry' | 'exit' | null>(null)
  const [statusMsg, setStatusMsg] = useState('Iniciando cámara...')

  // Camera ready state
  const [cameraReady, setCameraReady] = useState(false)

  // Telemetry
  const [telemetry, setTelemetry] = useState({
    status: 'ESCANEO',
    face: 'NO DETECTADO',
    points: '0',
    confidence: '0%',
    time: '0 ms',
    event: 'ESPERANDO',
  })

  const [isNew, setIsNew] = useState(false)
  const [newPersonForm, setNewPersonForm] = useState({
    full_name: '',
    cedula: '',
    phone: '',
    apartment: '',
    person_type: 'visitor',
  })
  const [eventForm, setEventForm] = useState({
    visitor_card_number: '',
    belongs_to: '',
    entry_zone: '',
    has_equipment: false,
    notes: '',
  })

  const videoRef = useRef<HTMLVideoElement>(null)
  const meshCanvasRef = useRef<HTMLCanvasElement>(null)
  const captureCanvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const scanTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const isBusyRef = useRef(false)
  const faceFoundCountRef = useRef(0)
  const noFaceCountRef = useRef(0)
  const faceMeshRef = useRef<any>(null)
  const detectCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const lastMeshMsRef = useRef(0)
  const meshRunningRef = useRef(false)
  const latestLandmarksRef = useRef<any>(null)
  const animFrameRef = useRef(0)

  // Initialize FaceMesh
  useEffect(() => {
    if (!open) return

    const initFaceMesh = async () => {
      if (!window.FaceMesh) {
        // Wait for MediaPipe scripts to load
        const checkLoaded = () => {
          if (window.FaceMesh) {
            initFaceMesh()
          } else {
            setTimeout(checkLoaded, 500)
          }
        }
        checkLoaded()
        return
      }

      if (faceMeshRef.current) return // Already initialized

      const faceMesh = new window.FaceMesh({
        locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
      })

      faceMesh.setOptions({
        selfieMode: false,
        maxNumFaces: 1,
        refineLandmarks: false,
        minDetectionConfidence: 0.55,
        minTrackingConfidence: 0.55,
      })

      faceMesh.onResults((results: any) => {
        const landmarks = results.multiFaceLandmarks && results.multiFaceLandmarks.length
          ? results.multiFaceLandmarks[0]
          : null
        latestLandmarksRef.current = landmarks
        drawMeshResults(landmarks)
        updateTelemetry(landmarks)
      })

      faceMeshRef.current = faceMesh

      if (!detectCanvasRef.current) {
        const detectCanvas = document.createElement('canvas')
        detectCanvas.width = ANALYSIS_WIDTH
        detectCanvas.height = ANALYSIS_HEIGHT
        detectCanvasRef.current = detectCanvas
      }
    }

    initFaceMesh()
  }, [open])

  // Start camera
  useEffect(() => {
    if (!open) {
      // Cleanup on close
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop())
        streamRef.current = null
      }
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current)
      }
      if (scanTimerRef.current) {
        clearInterval(scanTimerRef.current)
      }
      setCameraReady(false)
      return
    }

    let cancelled = false

    async function startCamera() {
      try {
        setCameraReady(false)
        setStatusMsg('Iniciando cámara...')

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }
        })

        if (cancelled) {
          stream.getTracks().forEach(t => t.stop())
          return
        }

        streamRef.current = stream

        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.onloadedmetadata = () => {
            if (!cancelled) {
              videoRef.current?.play()
              setCameraReady(true)
              setStatusMsg('Presente su rostro frente a la cámara')
              resizeMeshCanvas()
            }
          }
        }
      } catch (err: any) {
        if (!cancelled) {
          setStatusMsg('No se pudo acceder a la cámara: ' + err.message)
          setStep('error')
        }
      }
    }

    startCamera()
    window.addEventListener('resize', resizeMeshCanvas)

    return () => {
      cancelled = true
      window.removeEventListener('resize', resizeMeshCanvas)
    }
  }, [open])

  // Re-attach stream when video element is available (fixes "Volver a escanear" black screen)
  useEffect(() => {
    if (!open || !videoRef.current || !streamRef.current) return
    if (videoRef.current.srcObject !== streamRef.current) {
      videoRef.current.srcObject = streamRef.current
      videoRef.current.play().catch(() => {})
    }
  })

  // Reset state when opening
  useEffect(() => {
    if (open) {
      setStep('scanning')
      setFrameB64('')
      setPerson(null)
      setSuggestedType(null)
      setStatusMsg('Iniciando cámara...')
      setCameraReady(false)
      setIsNew(false)
      setNewPersonForm({ full_name: '', cedula: '', phone: '', apartment: '', person_type: 'visitor' })
      setEventForm({ visitor_card_number: '', belongs_to: '', entry_zone: '', has_equipment: false, notes: '' })
      isBusyRef.current = false
      faceFoundCountRef.current = 0
      noFaceCountRef.current = 0
      latestLandmarksRef.current = null
    }
  }, [open])

  // Resize mesh canvas
  const resizeMeshCanvas = useCallback(() => {
    const canvas = meshCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    // Use the canvas parent's dimensions if available, or default
    const rect = canvas.parentElement?.getBoundingClientRect()
    const stageW = rect?.width || canvas.clientWidth || 640
    const stageH = rect?.height || canvas.clientHeight || 480

    if (canvas.width !== Math.round(stageW * dpr) || canvas.height !== Math.round(stageH * dpr)) {
      canvas.width = Math.round(stageW * dpr)
      canvas.height = Math.round(stageH * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
  }, [])

  // Draw mesh
  const drawMeshResults = useCallback((landmarks: any) => {
    const canvas = meshCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.parentElement?.getBoundingClientRect()
    const stageW = rect?.width || canvas.clientWidth || 640
    const stageH = rect?.height || canvas.clientHeight || 480

    ctx.clearRect(0, 0, stageW, stageH)
    if (!landmarks || !landmarks.length) return
    if (!window.FACEMESH_TESSELATION) return

    const video = videoRef.current
    const srcW = video?.videoWidth || ANALYSIS_WIDTH
    const srcH = video?.videoHeight || ANALYSIS_HEIGHT
    const scale = Math.max(stageW / srcW, stageH / srcH)
    const drawW = srcW * scale
    const drawH = srcH * scale
    const offsetX = (stageW - drawW) / 2
    const offsetY = (stageH - drawH) / 2

    const points = landmarks.map((point: any) => ({
      x: (point.x * drawW) + offsetX,
      y: (point.y * drawH) + offsetY,
      z: point.z || 0,
    }))

    const drawConnectorSet = (connectors: any, color: string, lineWidth: number) => {
      if (!connectors) return
      ctx.beginPath()
      ctx.strokeStyle = color
      ctx.lineWidth = lineWidth
      for (const [from, to] of connectors) {
        const a = points[from]
        const b = points[to]
        if (!a || !b) continue
        ctx.moveTo(a.x, a.y)
        ctx.lineTo(b.x, b.y)
      }
      ctx.stroke()
    }

    drawConnectorSet(window.FACEMESH_TESSELATION, 'rgba(0, 229, 255, 0.25)', 0.3)
    drawConnectorSet(window.FACEMESH_FACE_OVAL, 'rgba(0, 255, 136, 0.6)', 0.6)
    drawConnectorSet(window.FACEMESH_LEFT_EYE, 'rgba(0, 255, 136, 0.7)', 0.6)
    drawConnectorSet(window.FACEMESH_RIGHT_EYE, 'rgba(0, 255, 136, 0.7)', 0.6)
    drawConnectorSet(window.FACEMESH_LEFT_EYEBROW, 'rgba(0, 229, 255, 0.5)', 0.5)
    drawConnectorSet(window.FACEMESH_RIGHT_EYEBROW, 'rgba(0, 229, 255, 0.5)', 0.5)
    drawConnectorSet(window.FACEMESH_LIPS, 'rgba(0, 229, 255, 0.5)', 0.5)

    ctx.fillStyle = 'rgba(0, 255, 136, 0.95)'
    const anchors = [1, 10, 152, 33, 263, 61, 291, 13, 14]
    for (const index of anchors) {
      const point = points[index]
      if (!point) continue
      ctx.beginPath()
      ctx.arc(point.x, point.y, 4, 0, Math.PI * 2)
      ctx.fill()
    }
  }, [])

  const updateTelemetry = useCallback((landmarks: any) => {
    if (!landmarks || !landmarks.length) {
      setTelemetry(prev => ({
        ...prev,
        status: 'ESCANEO',
        face: 'NO DETECTADO',
        points: '0',
        confidence: '0%',
        time: `${Math.round(lastMeshMsRef.current)} ms`,
        event: 'ESPERANDO',
      }))
      return
    }
    setTelemetry(prev => ({
      ...prev,
      status: 'ROSTRO DETECTADO',
      face: 'CARA HUMANA',
      points: `${landmarks.length}`,
      confidence: '98%',
      time: `${Math.round(lastMeshMsRef.current)} ms`,
      event: 'LISTO',
    }))
  }, [])

  // Mesh loop
  useEffect(() => {
    if (!open || !cameraReady) return
    let lastMeshAt = 0

    const meshLoop = async () => {
      const now = performance.now()
      if (now - lastMeshAt >= MESH_INTERVAL) {
        lastMeshAt = now
        if (!meshRunningRef.current && videoRef.current && videoRef.current.readyState >= 2 && faceMeshRef.current && detectCanvasRef.current) {
          meshRunningRef.current = true
          const startedAt = performance.now()
          try {
            const detectCtx = detectCanvasRef.current.getContext('2d')
            if (detectCtx) {
              detectCtx.drawImage(videoRef.current, 0, 0, ANALYSIS_WIDTH, ANALYSIS_HEIGHT)
              await faceMeshRef.current.send({ image: detectCanvasRef.current })
            }
          } finally {
            lastMeshMsRef.current = performance.now() - startedAt
            meshRunningRef.current = false
          }
        }
      }
      animFrameRef.current = requestAnimationFrame(meshLoop)
    }

    animFrameRef.current = requestAnimationFrame(meshLoop)
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current)
        animFrameRef.current = 0
      }
    }
  }, [open, cameraReady])

  // Auto-scan loop
  useEffect(() => {
    if (!open || !cameraReady || step !== 'scanning') return

    scanTimerRef.current = setInterval(() => {
      if (isBusyRef.current) return
      attemptIdentify()
    }, SCAN_INTERVAL)

    return () => {
      if (scanTimerRef.current) {
        clearInterval(scanTimerRef.current)
        scanTimerRef.current = null
      }
    }
  }, [open, cameraReady, step])

  function captureFrame(): string {
    const video = videoRef.current
    const canvas = captureCanvasRef.current
    if (!video || !canvas || video.readyState < 2) return ''
    const srcW = video.videoWidth || 640
    const srcH = video.videoHeight || 480
    const scale = Math.min(1, 720 / srcW)
    canvas.width = Math.round(srcW * scale)
    canvas.height = Math.round(srcH * scale)
    const ctx = canvas.getContext('2d')
    if (!ctx) return ''
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/jpeg', 0.8)
  }

  const attemptIdentify = useCallback(async () => {
    const hasFace = latestLandmarksRef.current && latestLandmarksRef.current.length > 0
    const frame = captureFrame()
    if (!frame) return

    if (!hasFace) {
      noFaceCountRef.current++
      faceFoundCountRef.current = 0
      if (noFaceCountRef.current > 3) {
        setStatusMsg('No se detectó rostro. Ajuste su posición.')
      }
      return
    }

    faceFoundCountRef.current++
    noFaceCountRef.current = 0

    if (faceFoundCountRef.current < FACE_STABLE_FRAMES) {
      setStatusMsg('Rostro detectado, analizando...')
      return
    }

    isBusyRef.current = true
    setStatusMsg('Identificando...')

    try {
      const result = await manualIdentify(frame)

      if (scanTimerRef.current) {
        clearInterval(scanTimerRef.current)
        scanTimerRef.current = null
      }

      setFrameB64(frame)

      if (result.status === 'unknown') {
        setIsNew(true)
        setPerson(null)
        setSuggestedType(result.suggested_event_type || defaultEventType)
        setStatusMsg('Persona no registrada. Complete los datos.')
      } else {
        setIsNew(false)
        setPerson(result.person)
        setSuggestedType(result.suggested_event_type || defaultEventType)
        setStatusMsg(`Rostro reconocido: ${result.person?.full_name}`)

        // Precargar datos del último ingreso si es salida
        if (result.suggested_event_type === 'exit' && result.last_entry_data) {
          const d = result.last_entry_data
          setEventForm({
            visitor_card_number: d.visitor_card_number || '',
            belongs_to: d.belongs_to || '',
            entry_zone: d.entry_zone || '',
            has_equipment: d.has_equipment || false,
            notes: d.notes || '',
          })
        }
      }
      setStep('form')
    } catch (err: any) {
      setStatusMsg(err.message || 'Error al identificar')
    } finally {
      isBusyRef.current = false
    }
  }, [defaultEventType])

  function handleGoToConfirm() {
    if (isNew && !newPersonForm.full_name.trim()) {
      setStatusMsg('El nombre completo es obligatorio')
      return
    }
    setStatusMsg('')
    setStep('confirm')
  }

  async function handleSubmit() {
    setStep('loading')
    setStatusMsg('Guardando evento...')

    try {
      const payload: any = {
        frame_b64: frameB64,
        event_type: suggestedType || defaultEventType,
        visitor_card_number: eventForm.visitor_card_number || undefined,
        belongs_to: eventForm.belongs_to || undefined,
        entry_zone: eventForm.entry_zone || undefined,
        has_equipment: eventForm.has_equipment,
        notes: eventForm.notes || undefined,
      }

      if (isNew) {
        payload.is_new_person = true
        payload.full_name = newPersonForm.full_name
        payload.cedula = newPersonForm.cedula || undefined
        payload.phone = newPersonForm.phone || undefined
        payload.apartment = newPersonForm.apartment || undefined
        payload.person_type = newPersonForm.person_type
      } else {
        payload.person_id = person.id
      }

      await createManualEvent(payload)
      setStep('success')
      onSuccess()
    } catch (err: any) {
      setStatusMsg(err.message || 'Error al guardar')
      setStep('error')
    }
  }

  const finalEventType = suggestedType || defaultEventType
  const isEntry = finalEventType === 'entry'

  // Camera container - always rendered to preserve video element
  const cameraSection = (
    <div className={step === 'scanning' ? 'block' : 'hidden'}>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-4">
            {/* Camera + Mesh */}
              <div className="relative w-full min-h-[420px] lg:min-h-[520px] rounded-xl overflow-hidden border-2 border-border bg-black">
          {!cameraReady && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black z-20">
              <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
              <p className="text-sm text-cyan-400 font-medium">{statusMsg}</p>
            </div>
          )}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-cover"
            style={{ transform: 'scaleX(-1)' }}
          />
          <canvas
            ref={meshCanvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{ transform: 'scaleX(-1)' }}
          />
          {/* Scan overlay */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-500/5 to-transparent animate-pulse" />
            {/* Corners */}
            <div className="absolute top-4 left-4 w-10 h-10 border-t-[3px] border-l-[3px] border-cyan-400 rounded-tl-lg shadow-[0_0_10px_rgba(0,229,255,0.5)]" />
            <div className="absolute top-4 right-4 w-10 h-10 border-t-[3px] border-r-[3px] border-cyan-400 rounded-tr-lg shadow-[0_0_10px_rgba(0,229,255,0.5)]" />
            <div className="absolute bottom-4 left-4 w-10 h-10 border-b-[3px] border-l-[3px] border-cyan-400 rounded-bl-lg shadow-[0_0_10px_rgba(0,229,255,0.5)]" />
            <div className="absolute bottom-4 right-4 w-10 h-10 border-b-[3px] border-r-[3px] border-cyan-400 rounded-br-lg shadow-[0_0_10px_rgba(0,229,255,0.5)]" />
            {/* Center reticle */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-40 h-40 border border-white/20 rounded-full flex items-center justify-center">
                <div className="w-28 h-28 border border-cyan-400/40 rounded-full animate-ping opacity-20" />
              </div>
            </div>
            {/* Status badge */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 px-5 py-2 rounded-full bg-black/85 border border-cyan-400 text-cyan-400 text-sm font-semibold flex items-center gap-2 shadow-lg backdrop-blur-sm">
              <ScanFace className="h-4 w-4 animate-pulse" />
              {cameraReady ? statusMsg : 'Iniciando...'}
            </div>
          </div>
        </div>

        {/* Telemetry panel */}
        <div className="bg-card border rounded-xl p-4 space-y-3 flex flex-col">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Análisis Biométrico</span>
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-500/15 text-red-500 text-[10px] font-bold border border-red-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              LIVE
            </span>
          </div>
          <div className="space-y-2 flex-1">
            {[
              { key: 'Estado', value: telemetry.status },
              { key: 'Rostro', value: telemetry.face },
              { key: 'Puntos', value: telemetry.points },
              { key: 'Confianza', value: telemetry.confidence },
              { key: 'Tiempo', value: telemetry.time },
              { key: 'Evento', value: telemetry.event },
            ].map((item) => (
              <div key={item.key} className="flex justify-between items-center px-3 py-2 rounded-lg bg-muted/50 border border-border/50">
                <span className="text-xs text-muted-foreground font-medium">{item.key}</span>
                <span className="text-xs font-semibold text-cyan-500 font-mono">{item.value}</span>
              </div>
            ))}
          </div>
          <div className="pt-2 border-t border-border flex justify-between text-[10px] text-muted-foreground uppercase tracking-wider">
            <span>MediaPipe FaceMesh</span>
            <span>Zona: Lobby A1</span>
          </div>
        </div>
      </div>

      <div className="text-center space-y-2 mt-4">
        <p className="text-sm text-muted-foreground">
          El sistema escanea automáticamente. Presente su rostro centrado y bien iluminado.
        </p>
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Cancelar
        </Button>
      </div>
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onOpenChange(false) }}>
      <DialogContent
        className="overflow-hidden p-0"
        style={{
          width: '80vw',
          maxWidth: '800px',
          height: '800px',
          maxHeight: 650,
        }}
      >
        <DialogHeader className="px-6 pt-6 pb-2 shrink-0">
          <DialogTitle className="flex items-center gap-2 text-lg">
            {isEntry ? <LogIn className="h-5 w-5 text-emerald-500" /> : <LogOut className="h-5 w-5 text-blue-500" />}
            {isEntry ? 'Registrar Ingreso' : 'Registrar Salida'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {cameraSection}

        {step === 'loading' && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-muted-foreground">{statusMsg}</p>
          </div>
        )}

        {step === 'form' && (
          <div className="space-y-5">
            {!isNew && person && (
              <div className="flex items-center gap-4 p-4 rounded-xl bg-muted border">
                <div className="w-16 h-16 rounded-xl bg-secondary border overflow-hidden shrink-0">
                  {person.photo_path ? (
                    <img src={`/media/${person.photo_path}`} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <UserPlus className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-base truncate">{person.full_name}</h3>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                    <span className="capitalize">{personTypeLabel(person.person_type)}</span>
                    {person.apartment && <span>Apto: {person.apartment}</span>}
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${person.state === 'IN' ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800' : 'bg-muted text-muted-foreground border-border'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${person.state === 'IN' ? 'bg-emerald-500' : 'bg-muted-foreground'}`} />
                      {person.state === 'IN' ? 'Dentro' : 'Fuera'}
                    </span>
                    <span className={`text-xs font-medium ${isEntry ? 'text-emerald-500' : 'text-blue-500'}`}>
                      Acción detectada: {isEntry ? 'Ingreso' : 'Salida'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {!isNew && person && person.state === 'IN' && isEntry && (
              <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-600 dark:text-yellow-400 text-sm flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                Esta persona ya está dentro. Puede forzar un nuevo ingreso si es necesario.
              </div>
            )}
            {!isNew && person && person.state === 'OUT' && !isEntry && (
              <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-600 dark:text-yellow-400 text-sm flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                Esta persona ya está fuera. Puede forzar una salida si es necesario.
              </div>
            )}

            {isNew && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <UserPlus className="h-4 w-4 text-primary" />
                  Datos del nuevo visitante
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label>Nombre completo *</Label>
                    <Input
                      placeholder="Nombre completo"
                      value={newPersonForm.full_name}
                      onChange={e => setNewPersonForm({ ...newPersonForm, full_name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Cédula</Label>
                    <Input
                      placeholder="Cédula"
                      value={newPersonForm.cedula}
                      onChange={e => setNewPersonForm({ ...newPersonForm, cedula: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Teléfono</Label>
                    <Input
                      placeholder="Teléfono"
                      value={newPersonForm.phone}
                      onChange={e => setNewPersonForm({ ...newPersonForm, phone: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Apartamento / Empresa</Label>
                    <Input
                      placeholder="Apartamento"
                      value={newPersonForm.apartment}
                      onChange={e => setNewPersonForm({ ...newPersonForm, apartment: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label>Tipo de persona</Label>
                  <Select value={newPersonForm.person_type} onValueChange={v => setNewPersonForm({ ...newPersonForm, person_type: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="visitor">Visitante</SelectItem>
                      <SelectItem value="client">Cliente</SelectItem>
                      <SelectItem value="employee">Empleado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Datos adicionales del evento</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label>Número de carné</Label>
                  <Input
                    placeholder="Número de carné"
                    value={eventForm.visitor_card_number}
                    onChange={e => setEventForm({ ...eventForm, visitor_card_number: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Pertenece a</Label>
                  <Select value={eventForm.belongs_to} onValueChange={v => setEventForm({ ...eventForm, belongs_to: v })}>
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
                <div>
                  <Label>Zona de ingreso</Label>
                  <Input
                    placeholder="Zona"
                    value={eventForm.entry_zone}
                    onChange={e => setEventForm({ ...eventForm, entry_zone: e.target.value })}
                  />
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="has_equipment"
                    checked={eventForm.has_equipment}
                    onChange={e => setEventForm({ ...eventForm, has_equipment: e.target.checked })}
                    className="h-4 w-4 rounded border-border"
                  />
                  <Label htmlFor="has_equipment" className="cursor-pointer">Trae equipo</Label>
                </div>
              </div>
              <div>
                <Label>Notas</Label>
                <Textarea
                  placeholder="Notas u observaciones"
                  value={eventForm.notes}
                  onChange={e => setEventForm({ ...eventForm, notes: e.target.value })}
                  rows={3}
                />
              </div>
            </div>

            {statusMsg && <p className="text-center text-sm text-yellow-500">{statusMsg}</p>}

            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => {
                setStep('scanning')
                isBusyRef.current = false
                faceFoundCountRef.current = 0
                noFaceCountRef.current = 0
                setStatusMsg('Presente su rostro frente a la cámara')
              }} className="flex-1">
                <Camera className="mr-2 h-4 w-4" />
                Volver a escanear
              </Button>
              <Button onClick={handleGoToConfirm} className={`flex-1 ${isEntry ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-blue-600 hover:bg-blue-500'}`}>
                Continuar
              </Button>
            </div>
          </div>
        )}

        {step === 'confirm' && (
          <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white ${isEntry ? 'bg-emerald-500' : 'bg-blue-500'}`}>
                {isEntry ? <LogIn className="h-5 w-5" /> : <LogOut className="h-5 w-5" />}
              </div>
              <div>
                <p className="font-semibold">{isEntry ? 'Ingreso' : 'Salida'}</p>
                <p className="text-xs text-muted-foreground">Revise los datos y confirme para guardar</p>
              </div>
            </div>

            {/* Two-column layout: photo + person | event data */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Left: Photo + Person */}
              <div className="space-y-4">
                {frameB64 && (
                  <div className="relative rounded-xl overflow-hidden border aspect-video bg-black">
                    <img src={frameB64} alt="Captura" className="w-full h-full object-cover" />
                    <div className="absolute bottom-2 left-2 px-2 py-1 rounded-md bg-black/70 text-[10px] text-white uppercase tracking-wider">
                      Foto capturada
                    </div>
                  </div>
                )}

                <div className={`p-4 rounded-xl border ${isEntry ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-blue-500/30 bg-blue-500/5'}`}>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3">Persona</p>
                  {isNew ? (
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Nombre</span>
                        <span className="font-medium text-right">{newPersonForm.full_name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Cédula</span>
                        <span className="text-right">{newPersonForm.cedula || '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Teléfono</span>
                        <span className="text-right">{newPersonForm.phone || '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Apto / Empresa</span>
                        <span className="text-right">{newPersonForm.apartment || '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Tipo</span>
                        <span className="text-right">{personTypeLabel(newPersonForm.person_type)}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Nombre</span>
                        <span className="font-medium text-right">{person.full_name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Cédula</span>
                        <span className="text-right">{person.cedula || '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Apto / Empresa</span>
                        <span className="text-right">{person.apartment || '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Tipo</span>
                        <span className="text-right">{personTypeLabel(person.person_type)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Estado actual</span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${person.state === 'IN' ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800' : 'bg-muted text-muted-foreground border-border'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${person.state === 'IN' ? 'bg-emerald-500' : 'bg-muted-foreground'}`} />
                          {person.state === 'IN' ? 'Dentro' : 'Fuera'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right: Event data */}
              <div className="p-4 rounded-xl border bg-card">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3">Datos del evento</p>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Tipo</span>
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${isEntry ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800' : 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800'}`}>
                      {isEntry ? <LogIn className="h-3 w-3" /> : <LogOut className="h-3 w-3" />}
                      {isEntry ? 'Ingreso' : 'Salida'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Carné</span>
                    <span className="text-right">{eventForm.visitor_card_number || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Pertenece a</span>
                    <span className="text-right">{eventForm.belongs_to || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Zona de ingreso</span>
                    <span className="text-right">{eventForm.entry_zone || '—'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Trae equipo</span>
                    <span className={`text-right font-medium ${eventForm.has_equipment ? 'text-amber-500' : ''}`}>{eventForm.has_equipment ? 'Sí' : 'No'}</span>
                  </div>
                  <div className="pt-2 border-t">
                    <span className="text-muted-foreground text-xs">Notas</span>
                    <p className="mt-1 text-sm whitespace-pre-wrap">{eventForm.notes || <span className="text-muted-foreground">—</span>}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep('form')} className="flex-1">
                Editar datos
              </Button>
              <Button onClick={handleSubmit} className={`flex-1 ${isEntry ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-blue-600 hover:bg-blue-500'}`}>
                Confirmar y Guardar
              </Button>
            </div>
          </div>
        )}

        {step === 'success' && (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center text-white ${isEntry ? 'bg-emerald-500' : 'bg-blue-500'}`}>
              <Check className="h-10 w-10" />
            </div>
            <h3 className="font-semibold text-xl">
              {isEntry ? 'Ingreso registrado' : 'Salida registrada'}
            </h3>
            <p className="text-muted-foreground text-sm text-center max-w-xs">
              El evento se ha guardado correctamente y se actualizará en el dashboard.
            </p>
            <Button onClick={() => onOpenChange(false)} className={`mt-2 ${isEntry ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-blue-600 hover:bg-blue-500'}`}>
              Cerrar
            </Button>
          </div>
        )}

        {step === 'error' && (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-800 flex items-center justify-center text-red-600 dark:text-red-400">
              <AlertTriangle className="h-10 w-10" />
            </div>
            <h3 className="font-semibold text-xl">Error</h3>
            <p className="text-red-600 dark:text-red-400 text-sm text-center max-w-xs">{statusMsg}</p>
            <div className="flex gap-3 mt-2">
              <Button variant="outline" onClick={() => {
                setStep('scanning')
                isBusyRef.current = false
                setStatusMsg('Presente su rostro frente a la cámara')
              }}>
                Intentar de nuevo
              </Button>
              <Button variant="secondary" onClick={() => onOpenChange(false)}>
                Cerrar
              </Button>
            </div>
          </div>
        )}

        </div>

        <canvas ref={captureCanvasRef} className="hidden" />
      </DialogContent>
    </Dialog>
  )
}
