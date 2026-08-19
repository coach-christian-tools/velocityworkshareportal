import { useEffect, useState } from "react"
import { collection, query, where, onSnapshot, doc, getDoc, deleteDoc } from "firebase/firestore"
import { db } from "../../lib/firebase"
import { useAuth } from "../../contexts/AuthContext"
import type { Family, Registration, Posting } from "../../types"
import { Card } from "../ui/Card"
import { Calendar, Clock, User, Award, CheckCircle2 } from "lucide-react"

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
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#13415D]">Administrator Dashboard</h2>
          <p className="text-sm text-slate-500 mt-1">Manage family accounts, postings, and shift rosters.</p>
        </div>
        <Card className="bg-white border border-slate-200 p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-[#0A856C]/10 text-[#0A856C]">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#13415D]">Welcome to VS Workshare Admin</h3>
              <p className="text-sm text-slate-600 mt-1">
                Use the navigation menu to review registered families, verify rosters, or post new volunteer shifts on the Job Board.
              </p>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  if (!family) {
    return (
      <div className="p-12 text-center text-slate-500 font-medium animate-pulse">
        Loading family dashboard...
      </div>
    )
  }

  const genReq = family.requirements?.generalPoolHours || 0
  const evReq = family.requirements?.eventSpecificHours || 0
  const genPct = Math.min(100, genReq > 0 ? (completedGeneral / genReq) * 100 : 100)
  const evPct = Math.min(100, evReq > 0 ? (completedEvent / evReq) * 100 : 100)

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-[#13415D] tracking-tight">
          {family.accountName ? `${family.accountName} Dashboard` : "Family Dashboard"}
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          {family.accountName ? `${family.accountName} • ` : ""}{family.category} Division • Track your seasonal workshare requirements
        </p>
      </div>
      
      {/* Progress Cards */}
      <div className="grid sm:grid-cols-2 gap-5">
        <Card className="bg-white border border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-[#0A856C]" />
              <h3 className="text-base font-bold text-[#13415D]">General Pool Hours</h3>
            </div>
            {genPct >= 100 && (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-[#0A856C] bg-[#0A856C]/10 px-2 py-0.5 rounded-full">
                <CheckCircle2 className="w-3.5 h-3.5" /> Met
              </span>
            )}
          </div>
          
          <div className="flex justify-between items-baseline mb-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-[#13415D]">
              {Math.round(completedGeneral * 10) / 10} <span className="text-sm font-medium text-slate-500">/ {genReq} hrs</span>
            </span>
            <span className="text-sm font-bold text-[#0A856C]">{Math.round(genPct)}%</span>
          </div>

          <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
            <div 
              className="bg-[#0A856C] h-3 rounded-full transition-all duration-1000 ease-out" 
              style={{ width: `${genPct}%` }} 
            />
          </div>
        </Card>

        <Card className="bg-white border border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-[#13415D]" />
              <h3 className="text-base font-bold text-[#13415D]">Event-Specific Hours</h3>
            </div>
            {evPct >= 100 && (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-[#0A856C] bg-[#0A856C]/10 px-2 py-0.5 rounded-full">
                <CheckCircle2 className="w-3.5 h-3.5" /> Met
              </span>
            )}
          </div>

          <div className="flex justify-between items-baseline mb-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-[#13415D]">
              {Math.round(completedEvent * 10) / 10} <span className="text-sm font-medium text-slate-500">/ {evReq} hrs</span>
            </span>
            <span className="text-sm font-bold text-[#13415D]">{Math.round(evPct)}%</span>
          </div>

          <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
            <div 
              className="bg-[#13415D] h-3 rounded-full transition-all duration-1000 ease-out" 
              style={{ width: `${evPct}%` }} 
            />
          </div>
        </Card>
      </div>

      {/* Upcoming Shifts Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg sm:text-xl font-bold text-[#13415D]">Upcoming Shifts</h3>
          <span className="text-xs font-semibold text-slate-500">
            {upcomingRegs.length} {upcomingRegs.length === 1 ? "shift" : "shifts"} scheduled
          </span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {upcomingRegs.map(reg => (
            <Card key={reg.id} className="relative overflow-hidden bg-white border border-slate-200 flex flex-col p-5 hover:border-slate-300 transition-all">
              <div 
                className={`absolute top-0 left-0 bottom-0 w-1.5 ${
                  reg.job.type === 'General' ? 'bg-[#0A856C]' : 'bg-[#13415D]'
                }`} 
              />
              <div className="pl-2 flex-1">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h4 className="font-bold text-base text-[#13415D] leading-tight">{reg.job.title}</h4>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md whitespace-nowrap ${
                    reg.job.type === 'General' 
                      ? 'bg-[#0A856C]/10 text-[#0A856C]' 
                      : 'bg-[#13415D]/10 text-[#13415D]'
                  }`}>
                    {reg.job.type}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-slate-600 mb-4">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span>{reg.job.date.toDate().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                  </div>
                  {reg.job.startTime && (
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span>{reg.job.startTime.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span className="font-medium text-[#13415D]">
                      {reg.assignee.name} {reg.assignee.isGuest && <span className="text-slate-500 font-normal">(Guest)</span>}
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 mt-auto flex justify-between items-center">
                  <button 
                    onClick={() => cancelRegistration(reg.id, reg.job)} 
                    className="text-xs text-red-600 hover:text-red-800 font-semibold py-1.5 px-2 -ml-2 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                  >
                    Cancel Shift
                  </button>
                  <span className="text-[11px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                    Pending
                  </span>
                </div>
              </div>
            </Card>
          ))}
          {upcomingRegs.length === 0 && (
            <div className="col-span-full py-12 px-4 text-center bg-white rounded-2xl border border-dashed border-slate-300">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
                <Calendar className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-[#13415D] mb-1">No Upcoming Shifts</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                You haven't declared any shifts yet. Head over to the Job Board to claim upcoming workshare positions.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

