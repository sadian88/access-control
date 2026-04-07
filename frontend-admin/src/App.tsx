import { useEffect, useState } from 'react'
import { Sidebar, type Page } from './components/Sidebar'
import { Header } from './components/Header'
import { OccupantsPage } from './components/OccupantsPage'
import { ActivityPage } from './components/ActivityPage'
import { OccupantsList } from './components/OccupantsList'
import { NotificationFeed } from './components/NotificationFeed'
import { EventsChart, TypeDistributionChart, HourlyActivityChart, OccupancyTrendChart } from './components/Charts'
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
    wsConnected, 
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

      <div className="flex-1 flex flex-col overflow-hidden bg-gradient-to-br from-gray-900/50 to-black/50">
        <Header wsConnected={wsConnected} notifications={notifications} onToggleNotifications={() => setShowNotifications(!showNotifications)} showNotifications={showNotifications} />
        
        <main className="flex-1 overflow-auto">
          {currentPage === 'dashboard' ? (
            <div className="p-3 lg:p-4 space-y-3">
              {/* Stats compact */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                <StatCard title="Adentro" value={occupants.length} icon="Users" color="cyan" />
                <StatCard title="Hoy" value={todayEvents} icon="Activity" color="blue" />
                <StatCard title="Residentes" value={occupants.filter((o: any) => o.person_type === 'resident').length} icon="Home" color="green" />
                <StatCard title="Clientes" value={occupants.filter((o: any) => o.person_type === 'client').length} icon="UserTie" color="blue" />
                <StatCard title="Visitantes" value={occupants.filter((o: any) => o.person_type === 'visitor').length} icon="User" color="yellow" />
                <StatCard title="Alertas" value={unknownAlert ? 1 : 0} icon="AlertTriangle" color="red" />
              </div>

              {/* Main content grid */}
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
                {/* Charts column */}
                <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="glass border border-glass/50 rounded-2xl p-4">
                    <h3 className="text-white text-sm font-medium mb-2 flex items-center gap-2">
                      <Icon icon="ChartLine" size={14} className="text-cyan-400" />
                      Accesos 7 días
                    </h3>
                    <div className="h-24">
                      <EventsChart data={events} />
                    </div>
                  </div>
                  <div className="glass border border-glass/50 rounded-2xl p-4">
                    <h3 className="text-white text-sm font-medium mb-2 flex items-center gap-2">
                      <Icon icon="ChartBar" size={14} className="text-yellow-400" />
                      Por hora
                    </h3>
                    <div className="h-24">
                      <HourlyActivityChart data={events} />
                    </div>
                  </div>
                  <div className="glass border border-glass/50 rounded-2xl p-4">
                    <h3 className="text-white text-sm font-medium mb-2 flex items-center gap-2">
                      <Icon icon="Users" size={14} className="text-green-400" />
                      Distribución
                    </h3>
                    <div className="flex items-center gap-4">
                      <div className="relative w-20 h-20">
                        {(() => {
                          const r = occupants.filter(o => o.person_type === 'resident').length
                          const c = occupants.filter(o => o.person_type === 'client').length
                          const v = occupants.filter(o => o.person_type === 'visitor').length
                          const t = Math.max(occupants.length, 1)
                          return (
                            <div className="absolute inset-0 rounded-full" style={{ background: `conic-gradient(rgba(52,211,153,0.6) 0deg ${(r/t)*360}deg, rgba(59,130,246,0.6) ${(r/t)*360}deg ${((r+c)/t)*360}deg, rgba(234,179,8,0.6) ${((r+c)/t)*360}deg 360deg)` }} />
                          )
                        })()}
                        <div className="absolute inset-4 rounded-full bg-gray-900 flex items-center justify-center">
                          <span className="text-lg font-bold text-white">{occupants.length}</span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs">
                          <div className="w-2 h-2 rounded bg-green-500" />
                          <span className="text-gray-400">Res: {occupants.filter(o => o.person_type === 'resident').length}</span>
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
                  <div className="glass border border-glass/50 rounded-2xl p-4">
                    <h3 className="text-white text-sm font-medium mb-2 flex items-center gap-2">
                      <Icon icon="UserCheck" size={14} className="text-green-400" />
                      Dentro ahora
                    </h3>
                    <OccupantsList occupants={occupants} />
                  </div>
                </div>

                {/* Notifications - prominent */}
                <div className="lg:col-span-1">
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
    cyan: { bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', text: 'text-cyan-400' },
    blue: { bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-400' },
    green: { bg: 'bg-green-500/10', border: 'border-green-500/20', text: 'text-green-400' },
    yellow: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', text: 'text-yellow-400' },
    red: { bg: 'bg-red-500/10', border: 'border-red-500/20', text: 'text-red-400' },
  }
  const styles = colorStyles[color]

  return (
    <div className={`glass border ${styles.border} rounded-xl p-3 ${styles.bg}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-500 text-[10px] uppercase tracking-wider">{title}</p>
          <p className={`text-xl font-bold ${styles.text}`}>{value}</p>
        </div>
        <div className={`w-8 h-8 rounded-lg ${styles.bg} ${styles.border} flex items-center justify-center`}>
          <Icon icon={icon} size={16} className={styles.text} />
        </div>
      </div>
    </div>
  )
}

function DashboardView() {
  return null
}