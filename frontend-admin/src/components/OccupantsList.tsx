import type { Person } from '../types'
import { Icon } from './Icon'

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return 'ahora'
  if (diff < 3600) return `${Math.floor(diff / 60)}m`
  return `${Math.floor(diff / 3600)}h`
}

export function OccupantsList({ occupants }: { occupants: Person[] }) {
  if (occupants.length === 0) {
    return (
      <div className="text-center py-4 text-gray-500 text-xs">
        No hay personas adentro
      </div>
    )
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {occupants.slice(0, 8).map((p: any) => (
        <div key={p.id} className="flex items-center gap-1.5 px-2 py-1 rounded-lg glass border border-glass/30 text-xs">
          <div className="w-5 h-5 rounded-full bg-gray-800 overflow-hidden flex-shrink-0">
            {p.photo_path ? (
              <img src={`/media/${p.photo_path}`} alt={p.full_name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Icon icon={p.person_type === 'resident' ? 'Home' : p.person_type === 'client' ? 'UserTie' : 'User'} size={10} className="text-gray-600" />
              </div>
            )}
          </div>
          <span className="text-white truncate max-w-[60px]">{p.full_name.split(' ')[0]}</span>
        </div>
      ))}
      {occupants.length > 8 && (
        <span className="px-2 py-1 text-xs text-gray-400">+{occupants.length - 8}</span>
      )}
    </div>
  )
}
