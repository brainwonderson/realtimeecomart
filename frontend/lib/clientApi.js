import { API_BASE } from './api'
import { getStoredToken } from './session'

export async function authFetch(path, options = {}) {
  const token = getStoredToken()

  // Jangan paksa Content-Type jika body adalah FormData
  // (browser akan set otomatis dengan boundary yang benar)
  const isFormData = options.body instanceof FormData
  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers || {})
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers
  })

  return response
}

export async function authJson(path, options = {}) {
  const response = await authFetch(path, options)
  const text = await response.text()
  let data = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = text
  }
  if (!response.ok) {
    const error = new Error(typeof data === 'string' ? data : data?.error || 'Request failed')
    error.status = response.status
    error.data = data
    throw error
  }
  return data
}
