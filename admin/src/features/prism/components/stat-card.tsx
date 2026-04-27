import { type LucideIcon } from 'lucide-react'

interface StatCardProps {
  title: string
  value: number
  icon: LucideIcon
  color: string
  bgGradient?: string
  pulse?: boolean
}

const colorMap: Record<string, { bg: string; text: string; ring: string; glow: string }> = {
  'text-emerald-500': {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-600 dark:text-emerald-400',
    ring: 'ring-emerald-500/20',
    glow: 'shadow-emerald-500/10',
  },
  'text-blue-500': {
    bg: 'bg-blue-500/10',
    text: 'text-blue-600 dark:text-blue-400',
    ring: 'ring-blue-500/20',
    glow: 'shadow-blue-500/10',
  },
  'text-green-500': {
    bg: 'bg-green-500/10',
    text: 'text-green-600 dark:text-green-400',
    ring: 'ring-green-500/20',
    glow: 'shadow-green-500/10',
  },
  'text-indigo-500': {
    bg: 'bg-indigo-500/10',
    text: 'text-indigo-600 dark:text-indigo-400',
    ring: 'ring-indigo-500/20',
    glow: 'shadow-indigo-500/10',
  },
  'text-amber-500': {
    bg: 'bg-amber-500/10',
    text: 'text-amber-600 dark:text-amber-400',
    ring: 'ring-amber-500/20',
    glow: 'shadow-amber-500/10',
  },
  'text-red-500': {
    bg: 'bg-red-500/10',
    text: 'text-red-600 dark:text-red-400',
    ring: 'ring-red-500/20',
    glow: 'shadow-red-500/10',
  },
}

export function PrismStatCard({ title, value, icon: Icon, color, pulse }: StatCardProps) {
  const theme = colorMap[color] || colorMap['text-blue-500']

  return (
    <div
      className={[
        'relative overflow-hidden rounded-2xl border bg-card p-5 shadow-sm transition-all hover:shadow-md',
        theme.glow,
        pulse ? 'ring-2 ring-red-500/30 animate-pulse' : `ring-1 ${theme.ring}`,
      ].join(' ')}
    >
      {/* Subtle gradient overlay */}
      <div
        className={`absolute -right-4 -top-4 h-20 w-20 rounded-full opacity-40 blur-2xl ${theme.bg.replace('/10', '/30')}`}
      />

      <div className='relative flex items-center gap-4'>
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${theme.bg} ${theme.text}`}
        >
          <Icon className='h-6 w-6' />
        </div>
        <div className='flex flex-col'>
          <span className='text-xs font-medium uppercase tracking-wider text-muted-foreground'>
            {title}
          </span>
          <span className={`text-3xl font-bold tracking-tight ${theme.text}`}>
            {value}
          </span>
        </div>
      </div>
    </div>
  )
}
