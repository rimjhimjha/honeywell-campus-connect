import { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'
import SupabaseService from '../services/supabase'

export const useSupabaseAuth = () => {
  const [user, setUser] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          const userData = await SupabaseService.getCurrentUser()
          setUser(userData)
          setIsAuthenticated(true)
        }
      } catch (error) {
        console.error('Error getting initial session:', error)
      } finally {
        setIsLoading(false)
      }
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email)
        
        if (session?.user) {
          const userData = await SupabaseService.getCurrentUser()
          setUser(userData)
          setIsAuthenticated(true)
        } else {
          setUser(null)
          setIsAuthenticated(false)
        }
        setIsLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const login = async (username, password) => {
    try {
      setIsLoading(true)
      
      // For demo purposes, map username to email
      const emailMap = {
        'admin': 'admin@nigraniai.com',
        'operator': 'operator@nigraniai.com'
      }
      
      const email = emailMap[username] || username
      
      const { data, error } = await SupabaseService.signIn(email, password)
      
      if (error) {
        console.error('Login error:', error)
        return { success: false, error: error.message }
      }

      if (data?.user) {
        const userData = await SupabaseService.getCurrentUser()
        setUser(userData)
        setIsAuthenticated(true)
        
        // Log the login
        await SupabaseService.createSystemLog(
          'INFO',
          `User ${userData?.username || email} logged in`,
          'auth'
        )
        
        return { success: true, user: userData }
      }

      return { success: false, error: 'Login failed' }
    } catch (error) {
      console.error('Login failed:', error)
      return { success: false, error: error.message }
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async () => {
    try {
      if (user) {
        await SupabaseService.createSystemLog(
          'INFO',
          `User ${user.username} logged out`,
          'auth'
        )
      }
      
      await SupabaseService.signOut()
      setUser(null)
      setIsAuthenticated(false)
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  return {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout
  }
}