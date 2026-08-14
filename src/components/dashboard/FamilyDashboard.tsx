import { useEffect, useState } from "react"
import { collection, query, where, onSnapshot, doc, getDoc } from "firebase/firestore"
import { db } from "../../lib/firebase"
import { useAuth } from "../../contexts/AuthContext"
import { Family, Registration, Posting } from "../../types"
import { Card } from "../ui/Card"

export function FamilyDashboard() {
  const { familyId, isAdmin } = useAuth()
  const [family, setFamily] = useState<Family | null>(null)
  const [completedGeneral, setCompletedGeneral] = useState(0)
  const [completedEvent, setCompletedEvent] = useState(0)

  useEffect(() => {
    if (!familyId) return

    const unsubFam = onSnapshot(doc(db, "families", familyId), (docSnap) => {
      if (docSnap.exists()) {
        setFamily({ id: docSnap.id, ...docSnap.data() } as Family)
      }
    })

    const unsubRegs = onSnapshot(query(collection(db, "registrations"), where("familyId", "==", familyId), where("status", "==", "Complete")), async (snapshot) => {
      let gen = 0
      let ev = 0
      
      for (const regDoc of snapshot.docs) {
        const reg = regDoc.data() as Registration
        const postSnap = await getDoc(doc(db, "postings", reg.postingId))
        if (postSnap.exists()) {
          const post = postSnap.data() as Posting
          let hours = 1
          if (post.startTime && post.endTime) {
            hours = (post.endTime.toMillis() - post.startTime.toMillis()) / (1000 * 60 * 60)
          }
          if (post.type === "General") gen += hours
          else ev += hours
        }
      }
      setCompletedGeneral(gen)
      setCompletedEvent(ev)
    })

    return () => { unsubFam(); unsubRegs() }
  }, [familyId])

  if (isAdmin) {
    return (
      <div className="space-y-6">
        <h2 className="text-3xl font-bold">Admin Dashboard</h2>
        <Card>
          <p>Welcome to the Admin Portal. Use the sidebar to manage families and jobs.</p>
        </Card>
      </div>
    )
  }

  if (!family) return <div className="p-8 text-center">Loading...</div>

  const genReq = family.requirements?.generalPoolHours || 0
  const evReq = family.requirements?.eventSpecificHours || 0
  const genPct = Math.min(100, genReq > 0 ? (completedGeneral / genReq) * 100 : 100)
  const evPct = Math.min(100, evReq > 0 ? (completedEvent / evReq) * 100 : 100)

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">Family Dashboard</h2>
      
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <h3 className="text-xl font-bold mb-4 text-blue-600">General Pool Hours</h3>
          <div className="flex justify-between mb-2 font-medium">
            <span>Progress: {Math.round(completedGeneral * 10) / 10} / {genReq} hrs</span>
            <span>{Math.round(genPct)}%</span>
          </div>
          <div className="w-full bg-black/10 dark:bg-white/10 rounded-full h-4 overflow-hidden border border-[var(--glass-border)]">
            <div className="bg-blue-500 h-4 transition-all duration-1000 ease-out" style={{ width: `${genPct}%` }} />
          </div>
        </Card>

        <Card>
          <h3 className="text-xl font-bold mb-4 text-orange-600">Event-Specific Hours</h3>
          <div className="flex justify-between mb-2 font-medium">
            <span>Progress: {Math.round(completedEvent * 10) / 10} / {evReq} hrs</span>
            <span>{Math.round(evPct)}%</span>
          </div>
          <div className="w-full bg-black/10 dark:bg-white/10 rounded-full h-4 overflow-hidden border border-[var(--glass-border)]">
            <div className="bg-orange-500 h-4 transition-all duration-1000 ease-out" style={{ width: `${evPct}%` }} />
          </div>
        </Card>
      </div>
    </div>
  )
}
