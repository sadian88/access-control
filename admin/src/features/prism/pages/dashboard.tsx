import { useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Users, Zap, Briefcase, Building2, User, AlertTriangle, ScanFace } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { TopNav } from '@/components/layout/top-nav'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { usePrismStore } from '@/features/prism/store'
import { useWebSocket } from '@/features/prism/hooks/use-web-socket'
import { approvePending, completeRegistration, cancelPending } from '@/features/prism/api'
import { PrismStatCard } from '@/features/prism/components/stat-card'
import { PrismEventsChart } from '@/features/prism/components/events-chart'
import { PrismNotificationFeed } from '@/features/prism/components/notification-feed'
import { PrismUnknownModal } from '@/features/prism/components/unknown-modal'
import { PrismPendingModals } from '@/features/prism/components/pending-modals'

const topNav = [
  { title: 'Dashboard', href: '/', isActive: true, disabled: false },
  { title: 'Ocupantes', href: '/occupants', isActive: false, disabled: false },
  { title: 'Actividad', href: '/activity', isActive: false, disabled: false },
]

export function PrismDashboard() {
  const navigate = useNavigate()
  useWebSocket()

  const {
    occupants,
    events,
    notifications,
    unknownAlert,
    dismissUnknown,
    setActivityDateFilter,
    pendingApprovals,
    pendingRegistrations,
    removePendingApproval,
    removePendingRegistration,
    loadOccupants,
    loadEvents,
  } = usePrismStore()

  useEffect(() => {
    loadOccupants()
    loadEvents()
  }, [])

  async function handleApprove(pendingId: string, data?: { visitor_card_number?: string; belongs_to?: string }) {
    try {
      await approvePending(pendingId, 'approve', data)
      removePendingApproval(pendingId)
      loadOccupants()
      loadEvents()
    } catch (err: any) {
      console.error('Error approving:', err)
    }
  }

  async function handleDeny(pendingId: string) {
    try {
      await approvePending(pendingId, 'deny')
      removePendingApproval(pendingId)
    } catch (err: any) {
      console.error('Error denying:', err)
    }
  }

  async function handleRegister(pendingId: string, data: any) {
    try {
      await completeRegistration(pendingId, data)
      removePendingRegistration(pendingId)
      loadOccupants()
      loadEvents()
    } catch (err: any) {
      console.error('Error registering:', err)
    }
  }

  async function handleCancel(pendingId: string) {
    try {
      await cancelPending(pendingId)
      removePendingApproval(pendingId)
      removePendingRegistration(pendingId)
    } catch (err: any) {
      console.error('Error cancelling:', err)
    }
  }

  const todayEvents = events.filter((e: any) => new Date(e.timestamp).toDateString() === new Date().toDateString()).length

  return (
    <>
      <Header>
        <TopNav links={topNav} className='me-auto' />
        <Search />
        <ThemeSwitch />
        <ProfileDropdown />
      </Header>

      <Main>
        <div className='mb-6 flex items-center justify-between'>
          <h1 className='text-2xl font-bold tracking-tight'>PRISM Dashboard</h1>
        </div>

        <div className="space-y-4">
          {/* Main action button */}
          <div className="flex justify-center">
            <Button
              size="lg"
              onClick={() => {
                usePrismStore.getState().openEntryModal()
              }}
              className="h-20 gap-4 bg-cyan-600 hover:bg-cyan-500 text-white text-lg font-bold shadow-[0_0_30px_rgba(6,182,212,0.35)] hover:shadow-[0_0_45px_rgba(6,182,212,0.5)] transition-all active:scale-[0.98] px-10"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-black/20">
                <ScanFace className="h-6 w-6" />
              </div>
              <div className="text-left">
                <span className="block">Iniciar Reconocimiento Facial</span>
                <span className="block text-xs font-medium opacity-80">El sistema detectará automáticamente ingreso o salida</span>
              </div>
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <PrismStatCard title="Adentro" value={occupants.length} icon={Users} color="text-emerald-500" />
            <PrismStatCard title="Hoy" value={todayEvents} icon={Zap} color="text-blue-500" />
            <PrismStatCard title="Empleados" value={occupants.filter((o: any) => o.person_type === 'employee').length} icon={Briefcase} color="text-green-500" />
            <PrismStatCard title="Clientes" value={occupants.filter((o: any) => o.person_type === 'client').length} icon={Building2} color="text-indigo-500" />
            <PrismStatCard title="Visitantes" value={occupants.filter((o: any) => o.person_type === 'visitor').length} icon={User} color="text-amber-500" />
            <PrismStatCard title="Alertas" value={unknownAlert ? 1 : 0} icon={AlertTriangle} color="text-red-500" pulse={!!unknownAlert} />
          </div>

          {/* Main grid */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {/* Accesos 7 días — takes 2 cols */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Zap className="h-4 w-4 text-blue-500" />
                  Accesos 7 días
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-56">
                  <PrismEventsChart data={events} />
                </div>
              </CardContent>
            </Card>

            {/* Distribución — takes 1 col */}
            <Card className="lg:col-span-1">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Users className="h-4 w-4 text-emerald-500" />
                  Distribución
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center gap-6 py-2">
                  <div className="relative w-24 h-24">
                    {(() => {
                      const e = occupants.filter(o => o.person_type === 'employee').length
                      const c = occupants.filter(o => o.person_type === 'client').length
                      const t = Math.max(occupants.length, 1)
                      return (
                        <div className="absolute inset-0 rounded-full" style={{ background: `conic-gradient(rgba(34,197,94,0.6) 0deg ${(e/t)*360}deg, rgba(99,102,241,0.6) ${(e/t)*360}deg ${((e+c)/t)*360}deg, rgba(245,158,11,0.6) ${((e+c)/t)*360}deg 360deg)` }} />
                      )
                    })()}
                    <div className="absolute inset-5 flex items-center justify-center rounded-full bg-background">
                      <span className="text-xl font-bold">{occupants.length}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                      <span className="text-muted-foreground">Empleados</span>
                      <span className="ml-auto font-semibold">{occupants.filter(o => o.person_type === 'employee').length}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                      <span className="text-muted-foreground">Clientes</span>
                      <span className="ml-auto font-semibold">{occupants.filter(o => o.person_type === 'client').length}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                      <span className="text-muted-foreground">Visitantes</span>
                      <span className="ml-auto font-semibold">{occupants.filter(o => o.person_type === 'visitor').length}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Notificaciones — full width below */}
            <div className="lg:col-span-3">
              <PrismNotificationFeed
                notifications={notifications}
                onNavigateToActivity={(_eventId, startDate) => {
                  if (startDate) {
                    setActivityDateFilter({ start_date: startDate, end_date: startDate })
                  }
                  navigate({ to: '/activity' })
                }}
              />
            </div>
          </div>
        </div>
      </Main>

      {unknownAlert && <PrismUnknownModal alert={unknownAlert} dismiss={dismissUnknown} />}

      <PrismPendingModals
        pendingApprovals={pendingApprovals}
        pendingRegistrations={pendingRegistrations}
        onApprove={handleApprove}
        onDeny={handleDeny}
        onRegister={handleRegister}
        onCancel={handleCancel}
      />

    </>
  )
}
