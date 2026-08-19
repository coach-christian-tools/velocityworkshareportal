import { createContext, useContext, useEffect, useState } from "react"
import type { ReactNode } from "react"
import type { User } from "firebase/auth"
import { onAuthStateChanged, signOut } from "firebase/auth"
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore"
import { auth, db } from "../lib/firebase"

interface AuthContextType {
  user: User | null
  isAdmin: boolean
  familyId: string | null
  loading: boolean
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAdmin: false,
  familyId: null,
  loading: true,
  logout: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [familyId, setFamilyId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser)
      
      if (firebaseUser) {
        try {
          const userEmail = firebaseUser.email?.toLowerCase().trim() || ""
          const isVelocityAdmin = userEmail.endsWith("@velocity-swimming.com")

          if (isVelocityAdmin) {
            setIsAdmin(true)
            setFamilyId(null)
          } else {
            let explicitAdmin = false
            try {
              const adminDoc = await getDoc(doc(db, "admins", firebaseUser.uid))
              if (adminDoc.exists()) {
                explicitAdmin = true
              }
            } catch {
              // Ignore if admins collection lookup fails
            }

            if (explicitAdmin) {
              setIsAdmin(true)
              setFamilyId(null)
            } else {
              setIsAdmin(false)
              if (firebaseUser.email) {
                const familiesRef = collection(db, "families")
                const q = query(familiesRef, where("authorizedEmails", "array-contains", firebaseUser.email))
                const snapshot = await getDocs(q)
                if (!snapshot.empty) {
                  setFamilyId(snapshot.docs[0].id)
                } else {
                  const qLower = query(familiesRef, where("authorizedEmails", "array-contains", userEmail))
                  const snapshotLower = await getDocs(qLower)
                  if (!snapshotLower.empty) {
                    setFamilyId(snapshotLower.docs[0].id)
                  } else {
                    setFamilyId(null)
                  }
                }
              } else {
                setFamilyId(null)
              }
            }
          }
        } catch (error) {
          console.error("Error fetching user roles:", error)
          setIsAdmin(false)
          setFamilyId(null)
        }
      } else {
        setIsAdmin(false)
        setFamilyId(null)
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const logout = async () => {
    await signOut(auth)
  }

  return (
    <AuthContext.Provider value={{ user, isAdmin, familyId, loading, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
