import { createFileRoute } from '@tanstack/react-router'
import { PrismDashboard } from '@/features/prism/pages/dashboard'

export const Route = createFileRoute('/_authenticated/')({
  component: PrismDashboard,
})
