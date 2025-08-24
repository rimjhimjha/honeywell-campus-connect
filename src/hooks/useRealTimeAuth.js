import { useState, useEffect, useCallback } from 'react'
import ApiService from '../services/api'

export const useRealTimeAuth = () => {
  const [user, setUser] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Check existing authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('auth_token')
        if (token) {
          console.log('Found existing token, checking validity...')
          ApiService.setAuthToken(token)
          const userData = await ApiService.getCurrentUser()
          if (userData) {
            console.log('Token valid, user authenticated:', userData)
            setUser(userData)
            setIsAuthenticated(true)
          } else {
            console.log('Token invalid, clearing...')
            localStorage.removeItem('auth_token')
            ApiService.setAuthToken(null)
          }
        } else {
          console.log('No existing token found')
        }
      } catch (error) {
        console.error('Auth check failed:', error)
        localStorage.removeItem('auth_token')
        ApiService.setAuthToken(null)
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [])

  const login = useCallback(async (username, password) => {
    try {
      console.log(`Attempting login for: ${username}`)
      const response = await ApiService.login(username, password)
      
      if (response?.access_token) {
        console.log('Login successful, getting user data...')
        const userData = await ApiService.getCurrentUser()
        setUser(userData)
        setIsAuthenticated(true)
        console.log('User authenticated successfully:', userData)
        return { success: true, user: userData }
      } else {
        console.log('Login failed: No access token received')
        return { success: false, error: 'Invalid credentials' }
      }
    } catch (error) {
      console.error('Login failed:', error)
      let errorMessage = 'Login failed'
      
      if (error.message === 'Failed to fetch') {
        errorMessage = 'Cannot connect to server. Please make sure the backend is running.'
      } else if (error.message.includes('401')) {
        errorMessage = 'Invalid username or password'
      } else {
        errorMessage = error.message || 'Login failed'
      }
      
      return { success: false, error: errorMessage }
    }
  }, [])

  const logout = useCallback(() => {
    console.log('Logging out user')
    setUser(null)
    setIsAuthenticated(false)
    localStorage.removeItem('auth_token')
    ApiService.setAuthToken(null)
  }, [])

  return {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout
  }
}