import { useMemo } from 'react'

interface TypeDistributionChartProps {
  data: any[]
}

export function TypeDistributionChart({ data }: TypeDistributionChartProps) {
  const distribution = useMemo(() => {
    const counts = { entry: 0, exit: 0, unknown: 0 }
    const total = data.length || 1

    data.forEach((event: any) => {
      if (counts.hasOwnProperty(event.event_type)) {
        counts[event.event_type as keyof typeof counts]++
      }
    })

    return {
      entry: (counts.entry / total) * 100,
      exit: (counts.exit / total) * 100,
      unknown: (counts.unknown / total) * 100,
    }
  }, [data])

  const segments = [
    { type: 'entry', value: distribution.entry, color: 'text-green-400', bar: 'bg-green-500' },
    { type: 'exit', value: distribution.exit, color: 'text-blue-400', bar: 'bg-blue-500' },
    { type: 'unknown', value: distribution.unknown, color: 'text-yellow-400', bar: 'bg-yellow-500' },
  ]

  return (
    <div className="flex flex-col items-center justify-center h-60">
      <div className="relative w-48 h-48">
        <div className="absolute inset-0 rounded-full bg-gray-800/50" />
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: `conic-gradient(
              rgba(34, 197, 94, 0.6) 0deg ${distribution.entry * 3.6}deg,
              rgba(59, 130, 246, 0.6) ${distribution.entry * 3.6}deg ${(distribution.entry + distribution.exit) * 3.6}deg,
              rgba(234, 179, 8, 0.6) ${(distribution.entry + distribution.exit) * 3.6}deg 360deg
            )`,
          }}
        />
        <div className="absolute inset-8 rounded-full bg-gradient-to-br from-gray-900 to-black flex items-center justify-center shadow-inner">
          <div className="text-center">
            <span className="block text-4xl font-bold text-white">{data.length}</span>
            <span className="text-xs text-gray-400 uppercase tracking-wider">Total</span>
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-3 w-full max-w-xs">
        {segments.map((segment) => (
          <div key={segment.type} className="flex items-center justify-between px-3 py-2 rounded-xl bg-gray-800/30 border border-gray-700/30">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${segment.bar}`} />
              <span className={`text-sm font-medium capitalize ${segment.color}`}>
                {segment.type === 'entry' ? 'Entradas' : segment.type === 'exit' ? 'Salidas' : 'Desconocidos'}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-white">{distribution[segment.type as keyof typeof distribution].toFixed(1)}%</span>
              <span className={`text-sm ${segment.color}`}>📈</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
