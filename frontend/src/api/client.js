import axios from 'axios'

const TOKEN_KEY = 'vygo_token'
const USER_KEY = 'vygo_user'
export const API_BASE_KEY = 'vygo.apiBase'

export function isNativePlatform() {
  if (typeof window === 'undefined') return false
  // The Expo shell injects VYGO_NATIVE before content loads; Capacitor sets
  // window.Capacitor. Either way the API base must come from local settings.
  if (window.VYGO_NATIVE === true) return true
  return Boolean(window.Capacitor && window.Capacitor.isNativePlatform)
}

function resolveBaseUrl() {
  if (isNativePlatform()) {
    return (localStorage.getItem(API_BASE_KEY) || '') + '/api/v1'
  }
  return '/api/v1'
}

export const api = axios.create({
  baseURL: resolveBaseUrl(),
  timeout: 30000,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    // A 401 from the login/OTP/register endpoints means "bad credentials", not
    // "session expired" — don't wipe an existing session over a failed login.
    const url = err.config?.url || ''
    const isAuthAttempt = /\/auth\/(login|otp|register)/.test(url)
    if (err.response?.status === 401 && !isAuthAttempt) {
      clearAuth()
      window.dispatchEvent(new Event('vygo:unauthorized'))
    }
    return Promise.reject(err)
  }
)

export function saveAuth(token, user) {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || 'null')
  } catch {
    return null
  }
}

export function errorMessage(err, fallback = 'Something went wrong') {
  return err?.response?.data?.error || err?.message || fallback
}
