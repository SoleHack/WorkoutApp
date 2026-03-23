'use client'
import { createContext, useContext, useEffect, useState } from 'react'
import { getSupabase } from '../lib/supabase-client'
import { useRouter } from 'next/navigation'

const AuthContext = createContext({})

export function AuthProvider({
  children, initialUser }) {
  const supabase = getSupabase()
  const [user, setUser] = useState(initialUser || null)
  const router = useRouter()


  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null)
      if (event === 'SIGNED_OUT') router.push('/login')
      if (event === 'SIGNED_IN') router.refresh()
    })
    return () => subscription.unsubscribe()
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const supabase = getSupabase()
  return useContext(AuthContext)
}
