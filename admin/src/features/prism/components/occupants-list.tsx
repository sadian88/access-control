import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import type { Person } from '../types'

export function PrismOccupantsList({ occupants }: { occupants: Person[] }) {
  if (occupants.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground text-xs">
        No hay personas adentro
      </div>
    )
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {occupants.slice(0, 8).map((p) => (
        <div key={p.id} className="flex items-center gap-1.5 px-2 py-1 rounded-lg border bg-muted/50 text-xs">
          <Avatar className="w-5 h-5">
            {p.photo_path ? (
              <AvatarImage src={`/media/${p.photo_path}`} alt={p.full_name} />
            ) : null}
            <AvatarFallback className="text-[8px]">{p.full_name.charAt(0)}</AvatarFallback>
          </Avatar>
          <span className="truncate max-w-[60px]">{p.full_name.split(' ')[0]}</span>
        </div>
      ))}
      {occupants.length > 8 && (
        <Badge variant="secondary" className="px-2 py-1 text-xs">+{occupants.length - 8}</Badge>
      )}
    </div>
  )
}
