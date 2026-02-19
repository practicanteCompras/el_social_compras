import React, { createContext, useContext, useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../services/supabase'
import api from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchUserProfile = async (session) => {
      if (!session) {
        setUser(null)
        return
      }
      try {
        const { data } = await api.get('/auth/me')
        setUser(data)
      } catch (err) {
        setUser(session.user)
      }
    }

    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession)
      fetchUserProfile(initialSession).finally(() => setLoading(false))
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session)
        await fetchUserProfile(session)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setSession(null)
  }

  const value = {
    user,
    session,
    loading,
    signIn,
    signOut,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

export function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (loading) return
    if (!user) {
      navigate('/iniciar-sesion', { state: { from: location }, replace: true })
      return
    }
    if (allowedRoles && allowedRoles.length > 0) {
      const role = user.role || user.role_name
      if (!role || !allowedRoles.includes(role)) {
        navigate('/', { replace: true })
      }
    }
  }, [user, loading, allowedRoles, navigate, location])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Cargando...</p>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return children
}
