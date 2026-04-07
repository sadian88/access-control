export function StatCard({ title, value, icon, color, trend }: { title: string; value: number; icon: string; color: string; trend?: string }) {
  const colorStyles: Record<string, { bg: string; border: string; text: string; glow: string }> = {
    cyan: { bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', text: 'text-cyan-400', glow: 'shadow-[0_0_15px_rgba(0,178,255,0.1)]' },
    blue: { bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-400', glow: 'shadow-[0_0_15px_rgba(93,156,236,0.1)]' },
    green: { bg: 'bg-green-500/10', border: 'border-green-500/20', text: 'text-green-400', glow: 'shadow-[0_0_15px_rgba(52,211,153,0.1)]' },
    yellow: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', text: 'text-yellow-400', glow: 'shadow-[0_0_15px_rgba(255,202,58,0.1)]' },
  }

  const styles = colorStyles[color]

  return (
    <div className={`glass backdrop-blur-xl border border-glass/50 rounded-3xl p-5 shadow-glass relative overflow-hidden hover:scale-[1.02] transition-all duration-300 ${styles.glow}`}>
      <div className={`${styles.bg} absolute top-0 right-0 w-24 h-24 rounded-bl-[100%] pointer-events-none transition-transform hover:scale-125 duration-500`} />

      <div className="flex items-start justify-between relative z-10">
        <div>
          <p className="text-gray-400 text-xs font-medium tracking-widest uppercase mb-1">{title}</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white">{value}</span>
            {trend && <span className={`text-xs ${styles.text} font-medium`}>{trend}</span>}
          </div>
        </div>
        <div className={`w-12 h-12 rounded-2xl ${styles.bg} ${styles.border} flex items-center justify-center`}>
          <span className={styles.text}>{icon}</span>
        </div>
      </div>
    </div>
  )
}
