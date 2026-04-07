import { useMemo } from 'react'

interface HourlyActivityChartProps {
  data: any[]
}

export function HourlyActivityChart({ data }: HourlyActivityChartProps) {
  const hourlyData = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => i)
    const counts = hours.map(() => ({ entry: 0, exit: 0 }))

    data.forEach((event: any) => {
      const date = new Date(event.timestamp)
      const hour = date.getHours()
      if (event.event_type === 'entry') counts[hour].entry++
      else if (event.event_type === 'exit') counts[hour].exit++
    })

    return { hours, counts }
  }, [data])

  const maxCount = Math.max(...hourlyData.counts.flatMap(c => c.entry + c.exit), 1)
  const getHeight = (count: number) => `${(count / maxCount) * 100}%`

  return (
    <div className="h-full flex items-end gap-px">
      {hourlyData.hours.map((hour) => (
        <div
          key={hour}
          className="flex-1 flex items-end gap-px group relative"
        >
          <div
            className="flex-1 rounded-t bg-cyan-500/70"
            style={{ height: getHeight(hourlyData.counts[hour].entry + hourlyData.counts[hour].exit) }}
          />
        </div>
      ))}
    </div>
  )
}
