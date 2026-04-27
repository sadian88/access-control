import { Lock, ScanFace } from 'lucide-react'
import { Logo } from '@/assets/logo'

type AuthLayoutProps = {
  children: React.ReactNode
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className='grid min-h-svh lg:grid-cols-2'>
      {/* Left side — dark branded panel */}
      <div className='relative hidden flex-col justify-between bg-zinc-950 p-10 text-white lg:flex'>
        {/* Subtle grid pattern */}
        <div
          className='absolute inset-0 opacity-[0.08]'
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        {/* Glow effects */}
        <div className='absolute -top-40 -left-40 h-96 w-96 rounded-full bg-cyan-500/20 blur-[120px]' />
        <div className='absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-emerald-500/15 blur-[120px]' />

        <div className='relative z-10 flex items-center gap-2 text-lg font-medium'>
          <Logo className='me-2' />
          <span>PRISM Admin</span>
        </div>

        <div className='relative z-10'>
          <h2 className='text-3xl font-bold tracking-tight mb-4'>
            Control de Accesos
            <br />
            Inteligente
          </h2>
          <p className='text-zinc-400 max-w-sm leading-relaxed'>
            Sistema de reconocimiento facial y gestión de ocupantes para edificios y zonas restringidas.
          </p>

          {/* Feature pills */}
          <div className='mt-8 flex flex-wrap gap-2'>
            {[
              { icon: ScanFace, label: 'Reconocimiento Facial' },
              { icon: Lock, label: 'Seguridad Avanzada' },
            ].map((f) => (
              <div
                key={f.label}
                className='inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-zinc-300 backdrop-blur-sm'
              >
                <f.icon className='h-3.5 w-3.5 text-cyan-400' />
                {f.label}
              </div>
            ))}
          </div>
        </div>

        <div className='relative z-10 text-xs text-zinc-500'>
          © {new Date().getFullYear()} Edge Guard — Todos los derechos reservados.
        </div>
      </div>

      {/* Right side — form */}
      <div className='flex flex-col gap-4 p-6 md:p-10'>
        <div className='flex justify-center gap-2 lg:hidden mb-6'>
          <Logo className='me-2' />
          <span className='text-xl font-medium'>PRISM Admin</span>
        </div>
        <div className='flex flex-1 items-center justify-center'>
          <div className='w-full max-w-sm'>{children}</div>
        </div>
      </div>
    </div>
  )
}
