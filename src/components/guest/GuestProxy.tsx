import { useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { doc, getDoc, addDoc, collection } from "firebase/firestore"
import { db } from "../../lib/firebase"
import type { Posting, Family } from "../../types"
import { Card } from "../ui/Card"
import { Input } from "../ui/Input"
import { Button } from "../ui/Button"
import { VSLogo } from "../ui/VSLogo"
import { Calendar, Clock, CheckCircle2, AlertTriangle, UserCheck } from "lucide-react"

export function GuestProxy() {
  const [searchParams] = useSearchParams()
  const jobId = searchParams.get("jobId")
  const familyId = searchParams.get("familyId")

  const [job, setJob] = useState<Posting | null>(null)
  const [family, setFamily] = useState<Family | null>(null)
  const [loading, setLoading] = useState(true)

  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [relation, setRelation] = useState("")
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    async function fetchData() {
      if (!jobId || !familyId) {
        setLoading(false)
        return
      }
      try {
        const jobSnap = await getDoc(doc(db, "postings", jobId))
        if (jobSnap.exists()) setJob({ id: jobSnap.id, ...jobSnap.data() } as Posting)
        
        const famSnap = await getDoc(doc(db, "families", familyId))
        if (famSnap.exists()) setFamily({ id: famSnap.id, ...famSnap.data() } as Family)
      } catch (err) {
        console.error(err)
      }
      setLoading(false)
    }
    fetchData()
  }, [jobId, familyId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!job || !family) return

    try {
      await addDoc(collection(db, "registrations"), {
        postingId: job.id,
        familyId: family.id,
        assignee: {
          name: `${firstName} ${lastName}`,
          isGuest: true,
          relation
        },
        status: "Pending"
      })
      setSubmitted(true)
    } catch (err) {
      console.error(err)
      alert("Failed to sign up.")
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-slate-500 font-medium animate-pulse">Loading shift details...</div>
      </div>
    )
  }

  if (!job || !family) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center bg-white border border-red-200 p-8">
          <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-3">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-[#13415D] mb-2">Invalid or Expired Link</h2>
          <p className="text-sm text-slate-500">This guest proxy sign-up link is not recognized or the shift is no longer available.</p>
        </Card>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center bg-white border border-[#0A856C]/30 p-8 shadow-sm">
          <div className="w-16 h-16 bg-[#0A856C]/10 text-[#0A856C] rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-extrabold text-[#13415D] mb-2">Thank You!</h2>
          <p className="text-sm text-slate-600">
            You have successfully registered to cover <strong>{job.title}</strong> as a guest volunteer.
          </p>
          <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-500">
            Credit has been linked to the <strong>{family.authorizedEmails[0]?.split('@')[0]}</strong> family.
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md flex flex-col items-center">
        {/* Brand Header */}
        <div className="mb-6 text-center">
          <VSLogo size="lg" className="mb-2" />
          <p className="text-sm text-slate-500 font-medium">Guest Proxy Volunteer Registration</p>
        </div>

        <Card className="w-full bg-white shadow-sm border border-slate-200 p-6 sm:p-8">
          {/* Shift Details Box */}
          <div className="bg-[#13415D]/5 border border-[#13415D]/15 p-4 rounded-xl mb-6">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#0A856C] uppercase tracking-wider mb-1">
              <UserCheck className="w-3.5 h-3.5" /> Volunteering On Behalf Of
            </div>
            <p className="font-extrabold text-[#13415D] text-sm truncate">{family.authorizedEmails.join(", ")}</p>
            
            <div className="my-3 border-t border-slate-200/80" />
            
            <p className="font-bold text-base text-[#13415D]">{job.title}</p>
            <div className="mt-1 space-y-1 text-xs text-slate-600">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>{job.date.toDate().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
              </div>
              {(job.startTime || job.endTime) && (
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>
                    {job.startTime?.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {job.endTime?.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </span>
                </div>
              )}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#13415D] mb-1">First Name</label>
                <Input required value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Jane" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#13415D] mb-1">Last Name</label>
                <Input required value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Doe" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#13415D] mb-1">Relation to Family</label>
              <Input required value={relation} onChange={e => setRelation(e.target.value)} placeholder="e.g. Grandparent, Family Friend, Relative" />
            </div>
            <div className="pt-2">
              <Button type="submit" variant="primary" size="lg" className="w-full">
                Confirm Guest Registration
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  )
}

