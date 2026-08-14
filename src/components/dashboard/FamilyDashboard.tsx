import { useEffect, useState } from "react"
import { collection, query, where, onSnapshot, doc, getDoc, deleteDoc } from "firebase/firestore"
import { db } from "../../lib/firebase"
import { useAuth } from "../../contexts/AuthContext"
import type { Family, Registration, Posting } from "../../types"
import { Card } from "../ui/Card"

export function FamilyDashboard() {
  const { familyId, isAdmin } = useAuth()
  const [family, setFamily] = useState<Family | null>(null)
  const [completedGeneral, setCompletedGeneral] = useState(0)
  const [completedEvent, setCompletedEvent] = useState(0)

  const [upcomingRegs, setUpcomingRegs] = useState<(Registration & { job: Posting })[]>([])

  useEffect(() => {
    if (!familyId) return

    const unsubFam = onSnapshot(doc(db, "families", familyId), (docSnap) => {
      if (docSnap.exists()) {
        setFamily({ id: docSnap.id, ...docSnap.data() } as Family)
      }
    })

    const unsubRegs = onSnapshot(query(collection(db, "registrations"), where("familyId", "==", familyId)), async (snapshot) => {
      let gen = 0
      let ev = 0
      const upcoming = []
      
      for (const regDoc of snapshot.docs) {
        const reg = { id: regDoc.id, ...regDoc.data() } as Registration
        const postSnap = await getDoc(doc(db, "postings", reg.postingId))
        if (postSnap.exists()) {
          const post = { id: postSnap.id, ...postSnap.data() } as Posting
          
          if (reg.status === "Complete") {
            let hours = 1
            if (post.startTime && post.endTime) {
              hours = (post.endTime.toMillis() - post.startTime.toMillis()) / (1000 * 60 * 60)
            }
            if (post.type === "General") gen += hours
            else ev += hours
          } else if (reg.status === "Pending") {
            upcoming.push({ ...reg, job: post })
          }
        }
      }
      upcoming.sort((a, b) => a.job.date.toMillis() - b.job.date.toMillis())
      setUpcomingRegs(upcoming)
      setCompletedGeneral(gen)
      setCompletedEvent(ev)
    })

    return () => { unsubFam(); unsubRegs() }
  }, [familyId])

  const cancelRegistration = async (regId: string, job: Posting) => {
    const now = new Date()
    // Use start time if available, otherwise just use the date at midnight
    const jobTime = job.startTime ? job.startTime.toDate() : job.date.toDate()
    const diffHours = (jobTime.getTime() - now.getTime()) / (1000 * 60 * 60)
    
    if (diffHours < 24) {
      alert("Cancellation Lockout: You cannot cancel a shift within 24 hours of its start time. Please contact the administrator directly.")
      return
    }

    if (confirm("Are you sure you want to cancel this shift?")) {
      try {
        await deleteDoc(doc(db, "registrations", regId))
      } catch (err) {
        console.error(err)
      }
    }
  }

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

      <h3 className="text-2xl font-bold mt-12 mb-4">Upcoming Shifts</h3>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {upcomingRegs.map(reg => (
          <Card key={reg.id} className="flex flex-col relative overflow-hidden">
             <div className={`absolute top-0 left-0 w-1 h-full ${reg.job.type === 'General' ? 'bg-blue-500' : 'bg-orange-500'}`} />
             <div className="pl-3">
               <h4 className="font-bold text-lg mb-1">{reg.job.title}</h4>
               <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{reg.job.date.toDate().toLocaleDateString()} {reg.job.startTime && `- ${reg.job.startTime.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`}</p>
               <p className="text-sm font-medium">Assignee: {reg.assignee.name} {reg.assignee.isGuest && "(Guest)"}</p>
               <div className="mt-4">
                 <button onClick={() => cancelRegistration(reg.id, reg.job)} className="text-sm text-red-500 hover:text-red-700 font-medium">Cancel Shift</button>
               </div>
             </div>
          </Card>
        ))}
        {upcomingRegs.length === 0 && (
          <div className="col-span-full py-8 text-gray-500 text-center glass rounded-xl border border-[var(--glass-border)]">
            No upcoming shifts. Visit the Job Board to declare for one!
          </div>
        )}
      </div>
    </div>
  )
}
