import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, type RenderResult } from 'vitest-browser-react'
import { type Locator, userEvent } from 'vitest/browser'
import { UserAuthForm } from './user-auth-form'

const navigate = vi.fn()
const setUserMock = vi.fn()
const setAccessTokenMock = vi.fn()

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: () => ({
    auth: {
      setUser: setUserMock,
      setAccessToken: setAccessTokenMock,
    },
  }),
}))

vi.mock('@/features/auth/api', () => ({
  login: vi.fn(() => Promise.resolve({ access_token: 'mock-token', token_type: 'bearer' })),
  fetchMe: vi.fn(() => Promise.resolve({
    id: 'uuid-1',
    username: 'admin',
    email: 'admin@prism.local',
    full_name: 'Admin',
    is_active: true,
    is_superuser: true,
  })),
}))

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>()
  return {
    ...actual,
    useNavigate: () => navigate,
    Link: ({
      children,
      to,
      className,
      ...rest
    }: {
      children?: React.ReactNode
      to: string
      className?: string
    }) => (
      <a href={to} className={className} {...rest}>
        {children}
      </a>
    ),
  }
})

describe('UserAuthForm', () => {
  describe('Rendering without redirectTo', () => {
    let screen: RenderResult
    let usernameInput: Locator
    let passwordInput: Locator
    let signInButton: Locator

    beforeEach(async () => {
      vi.clearAllMocks()
      screen = await render(<UserAuthForm />)
      usernameInput = screen.getByRole('textbox', { name: /Usuario/i })
      passwordInput = screen.getByLabelText(/Contraseña/i)
      signInButton = screen.getByRole('button', { name: /Iniciar sesión/i })
    })

    it('renders fields and submit button', async () => {
      await expect.element(usernameInput).toBeInTheDocument()
      await expect.element(passwordInput).toBeInTheDocument()
      await expect.element(signInButton).toBeInTheDocument()
    })

    it('shows validation messages when submitting empty form', async () => {
      await userEvent.click(signInButton)

      await expect
        .element(screen.getByText(/Ingresa tu usuario/i))
        .toBeInTheDocument()
      await expect
        .element(screen.getByText(/Ingresa tu contraseña/i))
        .toBeInTheDocument()
    })

    it('authenticates and navigates to default route on success', async () => {
      await userEvent.fill(usernameInput, 'admin')
      await userEvent.fill(passwordInput, 'admin')

      await userEvent.click(signInButton)

      await vi.waitFor(() => expect(setAccessTokenMock).toHaveBeenCalledOnce())
      expect(setAccessTokenMock).toHaveBeenCalledWith('mock-token')
      expect(setUserMock).toHaveBeenCalledOnce()

      await vi.waitFor(() =>
        expect(navigate).toHaveBeenCalledWith({ to: '/', replace: true })
      )
    })
  })

  it('navigates to redirectTo when provided', async () => {
    vi.clearAllMocks()

    const { getByRole, getByLabelText } = await render(
      <UserAuthForm redirectTo='/settings' />
    )

    await userEvent.fill(getByRole('textbox', { name: /Usuario/i }), 'admin')
    await userEvent.fill(getByLabelText('Contraseña'), 'admin')

    await userEvent.click(getByRole('button', { name: /Iniciar sesión/i }))

    await vi.waitFor(() => expect(setAccessTokenMock).toHaveBeenCalledOnce())
    expect(setUserMock).toHaveBeenCalledOnce()

    await vi.waitFor(() =>
      expect(navigate).toHaveBeenCalledWith({
        to: '/settings',
        replace: true,
      })
    )
  })
})
