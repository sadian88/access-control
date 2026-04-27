import { createFileRoute } from '@tanstack/react-router'
import { PrismOccupantsPage } from '@/features/prism/pages/occupants'

export const Route = createFileRoute('/_authenticated/occupants')({
  component: PrismOccupantsPage,
})
