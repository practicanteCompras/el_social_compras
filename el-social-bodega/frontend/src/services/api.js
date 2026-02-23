import axios from 'axios'
import { supabase, clearSupabaseAuthStorage } from './supabase'

const API_TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT) || 10000

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: API_TIMEOUT_MS,
})

/**
 * Module-level token cache updated by onAuthStateChange.
 * Avoids calling supabase.auth.getSession() on every request,
 * which can hang/timeout if Supabase needs to refresh an expired token.
 */
let cachedAccessToken = null

/**
 * Bootstrap: read the current session synchronously from memory/localStorage
 * so the first request after page load has a token without waiting for
 * onAuthStateChange to fire.
 */
supabase.auth.getSession().then(({ data: { session } }) => {
  cachedAccessToken = session?.access_token ?? null
}).catch(() => {
  cachedAccessToken = null
})

/**
 * Keep the cached token in sync with auth state changes (login, logout,
 * token refresh). This is the single source of truth for the interceptor.
 */
supabase.auth.onAuthStateChange((_event, session) => {
  cachedAccessToken = session?.access_token ?? null
})

/**
 * Allows AuthContext (or anything else) to force-set the token,
 * e.g. right after signIn returns the session.
 */
export function setApiAccessToken(token) {
  cachedAccessToken = token ?? null
}

api.interceptors.request.use(
  (config) => {
    if (cachedAccessToken) {
      config.headers.Authorization = `Bearer ${cachedAccessToken}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

api.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(error)
)

export default api
