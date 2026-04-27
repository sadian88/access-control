import type { AuthUser } from '@/stores/auth-store'

const BASE = '/api/v1'

export interface LoginCredentials {
  username: string
  password: string
}

export interface RegisterData {
  username: string
  email?: string
  password: string
  full_name?: string
}

export async function login(credentials: LoginCredentials): Promise<{ access_token: string; token_type: string }> {
  const formData = new URLSearchParams()
  formData.append('username', credentials.username)
  formData.append('password', credentials.password)

  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formData,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || 'Error de autenticación')
  }
  return res.json()
}

export async function register(data: RegisterData): Promise<AuthUser> {
  const res = await fetch(`${BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || 'Error al registrar')
  }
  return res.json()
}

export async function fetchMe(token: string): Promise<AuthUser> {
  const res = await fetch(`${BASE}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Sesión inválida')
  return res.json()
}
