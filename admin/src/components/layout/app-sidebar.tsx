import { useLayout } from '@/context/layout-provider'
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarRail,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import { sidebarData } from './data/sidebar-data'
import { NavGroup } from './nav-group'
import { usePrismStore } from '@/features/prism/store'
import { ScanFace, Shield } from 'lucide-react'

export function AppSidebar() {
  const { collapsible, variant } = useLayout()
  const openEntryModal = usePrismStore((s) => s.openEntryModal)

  return (
    <Sidebar collapsible={collapsible} variant={variant}>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-3">
          <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <Shield className="size-4" />
          </div>
          <div className="grid flex-1 text-start text-sm leading-tight">
            <span className="truncate font-semibold">PRISM</span>
            <span className="truncate text-xs text-muted-foreground">Control de Accesos</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {/* Prominent facial recognition button */}
        <div className="px-3 py-2">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={openEntryModal}
                className="h-auto py-3 bg-cyan-600 hover:bg-cyan-500 text-white hover:text-white font-bold shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all active:scale-[0.97]"
                tooltip="Iniciar Reconocimiento Facial"
              >
                <ScanFace className="h-5 w-5 shrink-0" />
                <span className="text-sm">Iniciar Reconocimiento Facial</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </div>

        {sidebarData.navGroups.map((props) => (
          <NavGroup key={props.title} {...props} />
        ))}
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}
