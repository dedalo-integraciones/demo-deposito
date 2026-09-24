import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import {
  getAuth,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
  setPersistence,
  browserSessionPersistence,
} from 'firebase/auth'
import { app, isFirebaseConfigured } from '../lib/firebase.js'
import { getUsuarioByUid, seedSuperAdmin } from '../services/usuariosService.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState(null)

  const fetchProfile = useCallback(async (currentUser) => {
    if (!currentUser) {
      setUserProfile(null)
      return null
    }

    try {
      let profile = await getUsuarioByUid(currentUser.uid, currentUser.email)

      // Si el usuario logueado es el superadmin conocido (dueño) y no tiene perfil aún, sembrarlo
      const isKnownSuperadmin =
        currentUser.email?.toLowerCase() === 'depositobombal.sa@hotmail.com' ||
        currentUser.email?.toLowerCase() === 'nelsonhammerle@gmail.com'

      if (isKnownSuperadmin && (!profile || (profile.rol !== 'SADMIN' && profile.rol !== 'superadmin'))) {
        await seedSuperAdmin(currentUser.uid, currentUser.email)
        profile = await getUsuarioByUid(currentUser.uid, currentUser.email)
      }

      // Si el perfil está deshabilitado, bloquear y cerrar sesión
      if (profile && profile.status === 'deshabilitado') {
        const auth = getAuth(app)
        await signOut(auth)
        setUser(null)
        setUserProfile(null)
        setAuthError('Tu cuenta de usuario ha sido deshabilitada. Contactá al administrador.')
        return null
      }

      // Crear un objeto nuevo (no mutación) para que todos los consumidores se re-rendericen
      const freshProfile = profile ? { ...profile } : null
      setUserProfile(freshProfile)
      return freshProfile
    } catch (err) {
      console.warn('[AuthContext] Error al cargar perfil de usuario:', err)
      return null
    }
  }, [])

  useEffect(() => {
    if (!isFirebaseConfigured || !app) {
      setUser(null)
      setUserProfile(null)
      setLoading(false)
      return
    }

    const auth = getAuth(app)

    try {
      setPersistence(auth, browserSessionPersistence).catch((err) => {
        console.warn('[Auth] No se pudo fijar browserSessionPersistence:', err)
      })
    } catch (e) {
      console.warn('[Auth] Error al inicializar persistencia:', e)
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setAuthError(null)
      if (currentUser) {
        setUser(currentUser)
        await fetchProfile(currentUser)
      } else {
        setUser(null)
        setUserProfile(null)
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [fetchProfile])

  const login = async (email, password) => {
    if (!isFirebaseConfigured || !app) {
      throw new Error('Firebase no está configurado en este entorno.')
    }
    setAuthError(null)
    const auth = getAuth(app)
    try {
      await setPersistence(auth, browserSessionPersistence)
    } catch (persistErr) {
      console.warn('[Auth] Advertencia al aplicar persistencia de sesión:', persistErr)
    }

    const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password)
    const profile = await fetchProfile(userCredential.user)

    if (profile && profile.status === 'deshabilitado') {
      throw new Error('Tu cuenta de usuario ha sido deshabilitada. Contactá al administrador.')
    }

    return userCredential
  }

  const resetPassword = async (email) => {
    if (!isFirebaseConfigured || !app) {
      throw new Error('Firebase no está configurado en este entorno.')
    }
    const auth = getAuth(app)
    return sendPasswordResetEmail(auth, email.trim())
  }

  const logout = async () => {
    if (!app) return
    const auth = getAuth(app)
    setUserProfile(null)
    setAuthError(null)
    return signOut(auth)
  }

  const refreshUserProfile = async () => {
    const auth = app ? getAuth(app) : null
    const currentUser = auth?.currentUser || user
    if (currentUser) {
      const freshDoc = await getUsuarioByUid(currentUser.uid, currentUser.email)
      if (freshDoc) {
        // Crear un objeto nuevo inmutable para que React detecte el cambio de referencia y re-renderice
        const newProfile = { ...freshDoc }
        setUserProfile(newProfile)
        return newProfile
      }
      return await fetchProfile(currentUser)
    }
    return null
  }

  const clearMustChangePasswordFlag = () => {
    setUserProfile((prev) => {
      if (!prev) return null
      return {
        ...prev,
        mustChangePassword: false,
        _updatedAt: Date.now(),
      }
    })
  }

  // Normalización de rol e identificadores
  const rawRole = (userProfile?.rol || '').toLowerCase()
  const isSuperAdminEmail =
    user?.email?.toLowerCase() === 'depositobombal.sa@hotmail.com' ||
    user?.email?.toLowerCase() === 'nelsonhammerle@gmail.com'

  const isSuperAdmin = rawRole === 'superadmin' || rawRole === 'sadmin' || isSuperAdminEmail
  const isAdmin = isSuperAdmin || rawRole === 'admin' || rawRole === 'vendedor'
  const mustChangePasswordRequired = Boolean(userProfile?.mustChangePassword)

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        profile: userProfile,
        userRole: userProfile?.rol || (isSuperAdmin ? 'SADMIN' : 'ADMIN'),
        isSuperAdmin,
        isAdmin,
        mustChangePasswordRequired,
        clearMustChangePasswordFlag,
        refreshUserProfile,
        authError,
        loading,
        login,
        resetPassword,
        logout,
        isFirebaseConfigured,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider')
  }
  return context
}
