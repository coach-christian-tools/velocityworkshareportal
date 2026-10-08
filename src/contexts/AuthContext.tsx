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
  clientMode: boolean
  setClientMode: (mode: boolean) => void
  previewFamilyId: string | null
  setPreviewFamilyId: (id: string | null) => void
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAdmin: false,
  familyId: null,
  loading: true,
  logout: async () => {},
  clientMode: false,
  setClientMode: () => {},
  previewFamilyId: null,
  setPreviewFamilyId: () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [familyId, setFamilyId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [clientMode, setClientMode] = useState(false)
  const [previewFamilyId, setPreviewFamilyId] = useState<string | null>(null)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser)
      
      if (firebaseUser) {
        try {
          let isAdminUser = false
          const userEmail = firebaseUser.email?.toLowerCase().trim() || ""
          const isVelocityAdmin = userEmail.endsWith("@velocity-swimming.com")

          if (isVelocityAdmin) {
            isAdminUser = true
          } else {
            try {
              const adminDoc = await getDoc(doc(db, "admins", firebaseUser.uid))
              if (adminDoc.exists()) {
                isAdminUser = true
              }
            } catch {
              // Ignore if admins collection lookup fails
            }
          }

          setIsAdmin(isAdminUser)

          let foundFamilyId = null
          const familiesRef = collection(db, "families")

          if (firebaseUser.email) {
            const q = query(familiesRef, where("authorizedEmails", "array-contains", firebaseUser.email))
            const snapshot = await getDocs(q)
            if (!snapshot.empty) {
              const testAccount = snapshot.docs.find(d => d.data().accountName === "Christian's Test Account")
              foundFamilyId = testAccount ? testAccount.id : snapshot.docs[0].id
            } else {
              const qLower = query(familiesRef, where("authorizedEmails", "array-contains", userEmail))
              const snapshotLower = await getDocs(qLower)
              if (!snapshotLower.empty) {
                const testAccountLower = snapshotLower.docs.find(d => d.data().accountName === "Christian's Test Account")
                foundFamilyId = testAccountLower ? testAccountLower.id : snapshotLower.docs[0].id
              }
            }
          }

          // If admin and no family found, use default test account
          if (isAdminUser && !foundFamilyId) {
            const testEmail = "christiancutter02@gmail.com"
            const qTest = query(familiesRef, where("authorizedEmails", "array-contains", testEmail))
            const testSnapshot = await getDocs(qTest)
            if (!testSnapshot.empty) {
              foundFamilyId = testSnapshot.docs[0].id
            }
          }

          setFamilyId(foundFamilyId)
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

  const effectiveFamilyId = (clientMode && previewFamilyId) ? previewFamilyId : familyId;

  return (
    <AuthContext.Provider value={{ user, isAdmin, familyId: effectiveFamilyId, loading, logout, clientMode, setClientMode, previewFamilyId, setPreviewFamilyId }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
