import { useMemo } from 'react'

interface EventsChartProps {
  data: any[]
}

export function EventsChart({ data }: EventsChartProps) {
  const chartData = useMemo(() => {
    const days: string[] = []
    const counts: { entry: number[]; exit: number[] } = { entry: [], exit: [] }

    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toLocaleDateString('es-CO', { weekday: 'short' })
      days.push(dateStr.slice(0, 2))
      counts.entry.push(0)
      counts.exit.push(0)
    }

    data.forEach((event: any) => {
      const eventDate = new Date(event.timestamp)
      const now = new Date()
      const diffDays = Math.floor((now.getTime() - eventDate.getTime()) / (1000 * 60 * 60 * 24))
      if (diffDays < 7) {
        const dayIndex = 6 - diffDays
        if (event.event_type === 'entry') counts.entry[dayIndex]++
        else if (event.event_type === 'exit') counts.exit[dayIndex]++
      }
    })

    return { days, counts }
  }, [data])

  const maxCount = Math.max(...chartData.counts.entry, ...chartData.counts.exit, 1)
  const getBarHeight = (count: number) => `${(count / maxCount) * 100}%`

  return (
    <div className="h-full flex items-end gap-1">
      {chartData.days.map((day, i) => (
        <div key={day} className="flex-1 flex flex-col items-center gap-1">
          <div className="flex items-end gap-0.5 w-full h-16">
            <div className="flex-1 rounded-t bg-green-500/70" style={{ height: getBarHeight(chartData.counts.entry[i] || 0) }} title={`${chartData.counts.entry[i]} ingresos`} />
            <div className="flex-1 rounded-t bg-blue-500/70" style={{ height: getBarHeight(chartData.counts.exit[i] || 0) }} title={`${chartData.counts.exit[i]} salidas`} />
          </div>
          <span className="text-[10px] text-gray-500">{day}</span>
        </div>
      ))}
    </div>
  )
}
