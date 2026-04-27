import { createFileRoute, redirect } from '@tanstack/react-router'
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout'
import { useAuthStore } from '@/stores/auth-store'
import { fetchMe } from '@/features/auth/api'

export const Route = createFileRoute('/_authenticated')({
  component: AuthenticatedLayout,
  beforeLoad: async () => {
    const token = useAuthStore.getState().auth.accessToken
    if (!token) {
      throw redirect({ to: '/sign-in' })
    }
    try {
      const user = await fetchMe(token)
      useAuthStore.getState().auth.setUser(user)
    } catch {
      useAuthStore.getState().auth.reset()
      throw redirect({ to: '/sign-in' })
    }
  },
})
