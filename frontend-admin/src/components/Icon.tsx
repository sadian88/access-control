import * as Icons from 'react-icons/fa'

export function Icon({ icon, size = 20, className = '' }: { icon: string; size?: number; className?: string }) {
  const IconComponent = (Icons as any)[`Fa${icon}`] || (Icons as any)['FaInfo']
  return <IconComponent size={size} className={className} />
}

export { Icons }
export type IconName = keyof typeof Icons
