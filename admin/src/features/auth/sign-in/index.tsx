import { useSearch } from '@tanstack/react-router'
import { Shield } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { AuthLayout } from '../auth-layout'
import { UserAuthForm } from './components/user-auth-form'

export function SignIn() {
  const { redirect } = useSearch({ from: '/(auth)/sign-in' })

  return (
    <AuthLayout>
      <div className='flex flex-col gap-6'>
        <div className='flex flex-col items-center gap-2 text-center lg:items-start lg:text-left'>
          <div className='flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-600 text-white shadow-lg shadow-cyan-600/20'>
            <Shield className='h-5 w-5' />
          </div>
          <h1 className='text-2xl font-bold tracking-tight'>Iniciar sesión</h1>
          <p className='text-sm text-muted-foreground'>
            Ingresa tus credenciales para acceder al panel de control.
          </p>
        </div>
        <Card className='border-0 shadow-none sm:border sm:shadow-sm'>
          <CardContent className='pt-6'>
            <UserAuthForm redirectTo={redirect} />
          </CardContent>
        </Card>
      </div>
    </AuthLayout>
  )
}
