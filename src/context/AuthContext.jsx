import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [hospitalProfile, setHospitalProfile] = useState(null)
  const [role, setRole] = useState(null) // 'donor' | 'hospital'
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) fetchProfile(session.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) fetchProfile(session.user.id)
      else {
        setUserProfile(null)
        setHospitalProfile(null)
        setRole(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId) {
    setLoading(true)
    // Check donor profile first
    const { data: donor } = await supabase
      .from('donors')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (donor) {
      setUserProfile(donor)
      setRole('donor')
      setLoading(false)
      return
    }

    // Check hospital profile
    const { data: hospital } = await supabase
      .from('hospitals')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (hospital) {
      setHospitalProfile(hospital)
      setRole('hospital')
    }
    setLoading(false)
  }

  async function signUp(email, password, type, profileData) {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error

    const userId = data.user.id
    const table = type === 'donor' ? 'donors' : 'hospitals'
    const { error: profileError } = await supabase
      .from(table)
      .insert({ ...profileData, user_id: userId })

    if (profileError) throw profileError
    return data
  }

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{
      session,
      userProfile,
      hospitalProfile,
      role,
      loading,
      signUp,
      signIn,
      signOut,
      refetchProfile: () => session && fetchProfile(session.user.id),
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
