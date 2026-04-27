import { createFileRoute } from '@tanstack/react-router'
import { PrismActivityPage } from '@/features/prism/pages/activity'

export const Route = createFileRoute('/_authenticated/activity')({
  component: PrismActivityPage,
})
