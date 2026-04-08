import { Icon } from './Icon'

export function StatCard({
  title,
  value,
  icon,
  color,
  trend,
}: {
  title: string
  value: number
  icon: string
  color: string
  trend?: string
}) {
  const colorStyles: Record<string, { bg: string; border: string; text: string }> = {
    accent: { bg: 'bg-lb-accent/10', border: 'border-lb-accent/25', text: 'text-lb-accent' },
    primary: { bg: 'bg-lb-primary/10', border: 'border-lb-primary/25', text: 'text-lb-primary' },
    cyan: { bg: 'bg-lb-primary/10', border: 'border-lb-primary/25', text: 'text-lb-primary' },
    blue: { bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-400' },
    green: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400' },
    yellow: { bg: 'bg-amber-500/10', border: 'border-amber-500/25', text: 'text-amber-400' },
    red: { bg: 'bg-red-500/10', border: 'border-red-500/25', text: 'text-red-400' },
  }

  const styles = colorStyles[color] ?? colorStyles.primary

  return (
    <div className={`glass border border-white/10 p-5 ${styles.bg}`}>
      <div className="relative z-10 flex items-start justify-between">
        <div>
          <p className="mb-1 text-xs font-bold uppercase tracking-wider text-lb-title">{title}</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white">{value}</span>
            {trend && <span className={`text-xs font-medium ${styles.text}`}>{trend}</span>}
          </div>
        </div>
        <div className={`flex h-12 w-12 items-center justify-center rounded-md border ${styles.border} ${styles.bg}`}>
          <Icon icon={icon as any} size={22} className={styles.text} />
        </div>
      </div>
    </div>
  )
}
