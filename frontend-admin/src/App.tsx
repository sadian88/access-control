import { useEffect, useState } from 'react'
import { Sidebar, type Page } from './components/Sidebar'
import { Header } from './components/Header'
import { OccupantsPage } from './components/OccupantsPage'
import { ActivityPage } from './components/ActivityPage'
import { OccupantsList } from './components/OccupantsList'
import { NotificationFeed } from './components/NotificationFeed'
import { EventsChart, HourlyActivityChart } from './components/Charts'
import { UnknownModal } from './components/UnknownModal'
import { PendingModals } from './components/PendingModals'
import { useWebSocket } from './hooks/useWebSocket'
import { useStore } from './store'
import { Icon } from './components/Icon'
import { approvePending, completeRegistration, cancelPending } from './api/client'

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard')
  const [showNotifications, setShowNotifications] = useState(true)
  useWebSocket()
  
  const { 
    occupants, 
    events, 
    notifications, 
    unknownAlert, 
    dismissUnknown, 
    getPaginatedEvents,
    currentPage: tablePage,
    setCurrentPage: setTablePage,
    itemsPerPage,
    setItemsPerPage,
    setActivityDateFilter,
    pendingApprovals,
    pendingRegistrations,
    removePendingApproval,
    removePendingRegistration,
    loadOccupants,
    loadEvents,
    triggerOccupantsRefresh
  } = useStore()

  useEffect(() => {
    loadOccupants()
    loadEvents()
  }, [])

  async function handleApprove(pendingId: string) {
    try {
      await approvePending(pendingId, 'approve')
      removePendingApproval(pendingId)
      loadOccupants()
      loadEvents()
    } catch (err) {
      console.error('Error approving:', err)
    }
  }

  async function handleDeny(pendingId: string) {
    try {
      await approvePending(pendingId, 'deny')
      removePendingApproval(pendingId)
    } catch (err) {
      console.error('Error denying:', err)
    }
  }

  async function handleRegister(pendingId: string, data: any) {
    try {
      await completeRegistration(pendingId, data)
      removePendingRegistration(pendingId)
      loadOccupants()
      loadEvents()
    } catch (err) {
      console.error('Error registering:', err)
    }
  }

  async function handleCancel(pendingId: string) {
    try {
      await cancelPending(pendingId)
      removePendingApproval(pendingId)
      removePendingRegistration(pendingId)
    } catch (err) {
      console.error('Error cancelling:', err)
    }
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'occupants':
        return <OccupantsPage />
      case 'activity':
        return <ActivityPage />
      case 'dashboard':
      default:
        return <DashboardView />
    }
  }

  const { items: paginatedEvents, totalPages } = getPaginatedEvents()
  const todayEvents = events.filter((e: any) => new Date(e.timestamp).toDateString() === new Date().toDateString()).length
  const unreadCount = notifications.filter((n: any) => !n.seen).length

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header notifications={notifications} onToggleNotifications={() => setShowNotifications(!showNotifications)} showNotifications={showNotifications} />

        <main className="relative flex-1 overflow-auto px-4 pb-14 pt-6 sm:px-6 lg:px-10">
          {currentPage === 'dashboard' ? (
            <div className="space-y-4">
              {/* Stats compact */}
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                <StatCard title="Adentro" value={occupants.length} icon="Users" color="accent" />
                <StatCard title="Hoy" value={todayEvents} icon="Bolt" color="primary" />
                <StatCard title="Empleados" value={occupants.filter((o: any) => o.person_type === 'employee').length} icon="Briefcase" color="green" />
                <StatCard title="Clientes" value={occupants.filter((o: any) => o.person_type === 'client').length} icon="UserTie" color="blue" />
                <StatCard title="Visitantes" value={occupants.filter((o: any) => o.person_type === 'visitor').length} icon="User" color="yellow" />
                <StatCard title="Alertas" value={unknownAlert ? 1 : 0} icon="ExclamationTriangle" color="red" />
              </div>

              {/* Main content grid */}
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
                {/* Charts column */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:col-span-3">
                  <div className="glass border border-white/10 p-4">
                    <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-white">
                      <Icon icon="ChartLine" size={14} className="text-lb-primary" />
                      Accesos 7 días
                    </h3>
                    <div className="h-24">
                      <EventsChart data={events} />
                    </div>
                  </div>
                  <div className="glass border border-white/10 p-4">
                    <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-white">
                      <Icon icon="ChartBar" size={14} className="text-lb-accent" />
                      Por hora
                    </h3>
                    <div className="h-24">
                      <HourlyActivityChart data={events} />
                    </div>
                  </div>
                  <div className="glass border border-white/10 p-4">
                    <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-white">
                      <Icon icon="Users" size={14} className="text-emerald-400" />
                      Distribución
                    </h3>
                    <div className="flex items-center gap-4">
                      <div className="relative w-20 h-20">
                        {(() => {
                          const e = occupants.filter(o => o.person_type === 'employee').length
                          const c = occupants.filter(o => o.person_type === 'client').length
                          const v = occupants.filter(o => o.person_type === 'visitor').length
                          const t = Math.max(occupants.length, 1)
                          return (
                            <div className="absolute inset-0 rounded-full" style={{ background: `conic-gradient(rgba(52,211,153,0.6) 0deg ${(e/t)*360}deg, rgba(59,130,246,0.6) ${(e/t)*360}deg ${((e+c)/t)*360}deg, rgba(234,179,8,0.6) ${((e+c)/t)*360}deg 360deg)` }} />
                          )
                        })()}
                        <div className="absolute inset-4 flex items-center justify-center rounded-full bg-lb-inverse">
                          <span className="text-lg font-bold text-white">{occupants.length}</span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs">
                          <div className="w-2 h-2 rounded bg-green-500" />
                          <span className="text-gray-400">Emp: {occupants.filter(o => o.person_type === 'employee').length}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <div className="w-2 h-2 rounded bg-blue-500" />
                          <span className="text-gray-400">Cli: {occupants.filter(o => o.person_type === 'client').length}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <div className="w-2 h-2 rounded bg-yellow-500" />
                          <span className="text-gray-400">Vis: {occupants.filter(o => o.person_type === 'visitor').length}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="glass border border-white/10 p-4">
                    <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-white">
                      <Icon icon="UserCheck" size={14} className="text-emerald-400" />
                      Dentro ahora
                    </h3>
                    <OccupantsList occupants={occupants} />
                  </div>
                </div>

                {/* Notifications - prominent */}
                <div className="min-h-[280px] lg:col-span-1">
                  <NotificationFeed 
                    notifications={notifications} 
                    unknownAlert={unknownAlert}
                    onNavigateToActivity={(eventId, startDate) => {
                      if (startDate) {
                        setActivityDateFilter({ start_date: startDate, end_date: startDate })
                      }
                      setCurrentPage('activity')
                    }}
                  />
                </div>
              </div>
            </div>
          ) : (
            renderPage()
          )}

          <footer className="pointer-events-none absolute bottom-4 left-4 right-4 text-center text-xs text-lb-title lg:left-10 lg:right-10">
            Basado en el tema Light Blue (Flatlogic). PRISM — control de accesos.
          </footer>
        </main>

        {unknownAlert && <UnknownModal alert={unknownAlert} dismiss={dismissUnknown} />}
        
        {/* Pending approval/registration modals */}
        <PendingModals
          pendingApprovals={pendingApprovals}
          pendingRegistrations={pendingRegistrations}
          onApprove={handleApprove}
          onDeny={handleDeny}
          onRegister={handleRegister}
          onCancel={handleCancel}
        />
      </div>
    </div>
  )
}

function StatCard({ title, value, icon, color }: { title: string; value: number; icon: string; color: string }) {
  const colorStyles: Record<string, { bg: string; border: string; text: string }> = {
    accent: { bg: 'bg-lb-accent/10', border: 'border-lb-accent/25', text: 'text-lb-accent' },
    primary: { bg: 'bg-lb-primary/10', border: 'border-lb-primary/25', text: 'text-lb-primary' },
    green: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400' },
    blue: { bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-400' },
    yellow: { bg: 'bg-amber-500/10', border: 'border-amber-500/25', text: 'text-amber-400' },
    red: { bg: 'bg-red-500/10', border: 'border-red-500/25', text: 'text-red-400' },
  }
  const styles = colorStyles[color] ?? colorStyles.primary

  return (
    <div className={`glass border border-white/10 p-3 ${styles.bg}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-lb-title">{title}</p>
          <p className={`text-xl font-bold ${styles.text}`}>{value}</p>
        </div>
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md border ${styles.border} ${styles.bg}`}>
          <Icon icon={icon} size={16} className={styles.text} />
        </div>
      </div>
    </div>
  )
}

function DashboardView() {
  return null
}