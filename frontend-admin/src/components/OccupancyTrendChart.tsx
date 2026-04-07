import { useMemo } from 'react'

interface OccupancyTrendChartProps {
  data: any[]
}

export function OccupancyTrendChart({ data }: OccupancyTrendChartProps) {
  const trendData = useMemo(() => {
    const days: string[] = []
    const occupancy: number[] = []
    let currentOccupancy = 0

    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toLocaleDateString('es-CO', { month: 'short', day: 'numeric' })
      days.push(dateStr)
      occupancy.push(currentOccupancy)
    }

    const eventsByDay: Record<string, { in: number; out: number }> = {}
    data.forEach((event: any) => {
      const date = new Date(event.timestamp)
      const now = new Date()
      const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
      if (diffDays < 7) {
        const dayIndex = 6 - diffDays
        const key = days[dayIndex]
        if (!eventsByDay[key]) eventsByDay[key] = { in: 0, out: 0 }
        if (event.event_type === 'entry') eventsByDay[key].in++
        else if (event.event_type === 'exit') eventsByDay[key].out++
      }
    })

    currentOccupancy = 0
    for (let i = 0; i < days.length; i++) {
      const day = days[i]
      if (eventsByDay[day]) {
        currentOccupancy += eventsByDay[day].in
        currentOccupancy -= eventsByDay[day].out
      }
      occupancy[i] = Math.max(0, currentOccupancy)
    }

    return { days, occupancy }
  }, [data])

  const maxOccupancy = Math.max(...trendData.occupancy, 1)
  const minOccupancy = Math.min(...trendData.occupancy.filter(o => o > 0), 0)

  const getY = (val: number) => {
    if (maxOccupancy === minOccupancy) return 50
    return 100 - ((val - minOccupancy) / (maxOccupancy - minOccupancy)) * 100
  }

  const points = trendData.occupancy
    .map((val, i) => `${(i / (trendData.days.length - 1)) * 100},${getY(val)}`)
    .join(' ')

  return (
    <div className="h-48">
      <div className="relative h-40">
        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(0, 178, 255, 0.3)" />
              <stop offset="100%" stopColor="rgba(0, 178, 255, 0)" />
            </linearGradient>
          </defs>
          <polygon
            points={`0,100 ${points} 100,100`}
            fill="url(#areaGradient)"
          />
          <polyline
            points={points}
            fill="none"
            stroke="#00b2ff"
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />
          {trendData.occupancy.map((val, i) => (
            <circle
              key={i}
              cx={(i / (trendData.days.length - 1)) * 100}
              cy={getY(val)}
              r="3"
              fill="#00b2ff"
              className="group-hover:scale-150 transition-transform"
            >
              <title>{val} personas</title>
            </circle>
          ))}
        </svg>
      </div>
      <div className="flex justify-between mt-2">
        {trendData.days.map(day => (
          <span key={day} className="text-xs text-gray-400">{day}</span>
        ))}
      </div>
    </div>
  )
}
