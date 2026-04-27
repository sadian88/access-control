import {
  LayoutDashboard,
  Users,
  Activity,
} from 'lucide-react'
import { type SidebarData } from '../types'

export const sidebarData: SidebarData = {
  user: {
    name: 'Admin',
    email: 'admin@prism.local',
    avatar: '/avatars/shadcn.jpg',
  },
  teams: [],
  navGroups: [
    {
      title: 'PRISM',
      items: [
        {
          title: 'Dashboard',
          url: '/',
          icon: LayoutDashboard,
        },
        {
          title: 'Ocupantes',
          url: '/occupants',
          icon: Users,
        },
        {
          title: 'Actividad',
          url: '/activity',
          icon: Activity,
        },
      ],
    },
  ],
}
