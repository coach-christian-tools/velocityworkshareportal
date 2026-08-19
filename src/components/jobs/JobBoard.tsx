import { useEffect, useState } from "react"
import { collection, onSnapshot, addDoc, doc, updateDoc, deleteDoc, Timestamp } from "firebase/firestore"
import { db } from "../../lib/firebase"
import type { Posting } from "../../types"
import { useAuth } from "../../contexts/AuthContext"
import { Button } from "../ui/Button"
import { Card } from "../ui/Card"
import { Input } from "../ui/Input"
import { Plus, Trash2, X, Calendar as CalendarIcon, Link as LinkIcon, UserPlus, Clock, Users, Mail } from "lucide-react"
import { generateICS } from "../../lib/calendar"

export function JobBoard() {
  const { isAdmin, familyId } = useAuth()
  const [jobs, setJobs] = useState<Posting[]>([])
  const [filterType, setFilterType] = useState<"All" | "General" | "Event-Specific">("All")
  
  // Admin form state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingJob, setEditingJob] = useState<Posting | null>(null)
  
  // Declaration state
  const [isDeclareOpen, setIsDeclareOpen] = useState(false)
  const [selectedJob, setSelectedJob] = useState<Posting | null>(null)
  const [assigneeName, setAssigneeName] = useState("")

  const [title, setTitle] = useState("")
  const [type, setType] = useState<"General" | "Event-Specific">("General")
  const [date, setDate] = useState("")
  const [startTime, setStartTime] = useState("")
  const [endTime, setEndTime] = useState("")
  const [description, setDescription] = useState("")
  const [minPos, setMinPos] = useState(1)
  const [desiredPos, setDesiredPos] = useState(1)
  const [maxPos, setMaxPos] = useState(1)
  const [poc, setPoc] = useState("")

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "postings"), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Posting))
      data.sort((a, b) => a.date.toMillis() - b.date.toMillis())
      setJobs(data)
    })
    return () => unsub()
  }, [])

  const openAdminModal = (job?: Posting) => {
    if (job) {
      setEditingJob(job)
      setTitle(job.title)
      setType(job.type)
      setDate(job.date.toDate().toISOString().split('T')[0])
      setStartTime(job.startTime ? job.startTime.toDate().toTimeString().slice(0,5) : "")
      setEndTime(job.endTime ? job.endTime.toDate().toTimeString().slice(0,5) : "")
      setDescription(job.description || "")
      setMinPos(job.positions.min)
      setDesiredPos(job.positions.desired)
      setMaxPos(job.positions.max)
      setPoc(job.pointOfContact || "")
    } else {
      setEditingJob(null)
      setTitle("")
      setType("General")
      setDate("")
      setStartTime("")
      setEndTime("")
      setDescription("")
      setMinPos(1)
      setDesiredPos(1)
      setMaxPos(1)
      setPoc("")
    }
    setIsModalOpen(true)
  }

  const saveJob = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const dateObj = new Date(date)
    dateObj.setMinutes(dateObj.getMinutes() + dateObj.getTimezoneOffset()) 
    const firestoreDate = Timestamp.fromDate(dateObj)
    
    let firestoreStart = null
    if (startTime) {
      const [h, m] = startTime.split(':')
      const d = new Date(dateObj)
      d.setHours(parseInt(h), parseInt(m))
      firestoreStart = Timestamp.fromDate(d)
    }

    let firestoreEnd = null
    if (endTime) {
      const [h, m] = endTime.split(':')
      const d = new Date(dateObj)
      d.setHours(parseInt(h), parseInt(m))
      firestoreEnd = Timestamp.fromDate(d)
    }

    const jobData = {
      title,
      type,
      date: firestoreDate,
      startTime: firestoreStart,
      endTime: firestoreEnd,
      description,
      positions: { min: minPos, desired: desiredPos, max: maxPos },
      pointOfContact: poc,
      status: editingJob ? editingJob.status : "Open"
    }

    try {
      if (editingJob) {
        await updateDoc(doc(db, "postings", editingJob.id), jobData)
      } else {
        await addDoc(collection(db, "postings"), jobData)
      }
      setIsModalOpen(false)
    } catch (err) {
      console.error(err)
      alert("Error saving job")
    }
  }

  const deleteJob = async (id: string) => {
    if (confirm("Delete this job posting?")) {
      await deleteDoc(doc(db, "postings", id))
    }
  }

  const handleDeclare = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedJob || !familyId) return

    try {
      await addDoc(collection(db, "registrations"), {
        postingId: selectedJob.id,
        familyId,
        assignee: {
          name: assigneeName,
          isGuest: false
        },
        status: "Pending"
      })
      setIsDeclareOpen(false)
      setAssigneeName("")
      alert("Successfully declared for shift!")
    } catch (err) {
      console.error(err)
      alert("Failed to declare for shift.")
    }
  }

  const generateGuestLink = (jobId: string) => {
    if (!familyId) return
    const url = `${window.location.origin}/guest?jobId=${jobId}&familyId=${familyId}`
    navigator.clipboard.writeText(url)
    alert("Guest proxy link copied to clipboard!\n\n" + url)
  }

  const filteredJobs = jobs.filter(j => filterType === "All" || j.type === filterType)

  return (
    <div className="space-y-6">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#13415D] tracking-tight">Workshare Shifts</h2>
          <p className="text-sm text-slate-500 mt-1">Claim shifts for your family or share guest proxy links.</p>
        </div>
        {isAdmin && (
          <Button onClick={() => openAdminModal()} variant="primary" className="self-start sm:self-auto">
            <Plus className="w-4 h-4 mr-2" />
            Add New Shift
          </Button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {(["All", "General", "Event-Specific"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setFilterType(t)}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
              filterType === t
                ? "bg-[#0A856C] text-white shadow-xs"
                : "bg-white text-[#13415D] border border-slate-200 hover:bg-slate-50"
            }`}
          >
            {t === "All" ? "All Shifts" : `${t} Pool`}
          </button>
        ))}
      </div>

      {/* Grid of Job Postings */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredJobs.map(job => (
          <Card key={job.id} className="flex flex-col relative overflow-hidden bg-white border border-slate-200 p-5 hover:border-slate-300 transition-all">
            <div 
              className={`absolute top-0 left-0 bottom-0 w-1.5 ${
                job.type === 'General' ? 'bg-[#0A856C]' : 'bg-[#13415D]'
              }`} 
            />
            
            <div className="pl-2 flex-1 flex flex-col">
              <div className="flex justify-between items-start gap-2 mb-2">
                <h3 className="font-bold text-base text-[#13415D] leading-tight">{job.title}</h3>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md whitespace-nowrap ${
                  job.type === 'General' 
                    ? 'bg-[#0A856C]/10 text-[#0A856C]' 
                    : 'bg-[#13415D]/10 text-[#13415D]'
                }`}>
                  {job.type}
                </span>
              </div>
              
              <div className="text-xs text-slate-600 space-y-1.5 mb-4 flex-1">
                <div className="flex items-center gap-1.5">
                  <CalendarIcon className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  <span>{job.date.toDate().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                </div>
                {(job.startTime || job.endTime) && (
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span>
                      {job.startTime?.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {job.endTime?.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                  </div>
                )}
                {job.positions && (
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span>Desired: {job.positions.desired} (Min {job.positions.min} / Max {job.positions.max})</span>
                  </div>
                )}
                {job.pointOfContact && (
                  <div className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span>{job.pointOfContact}</span>
                  </div>
                )}
                {job.description && (
                  <p className="text-slate-500 pt-1 line-clamp-2 leading-relaxed">{job.description}</p>
                )}
              </div>

              <div className="flex flex-col gap-2 pt-3 border-t border-slate-100 mt-auto">
                {!isAdmin && (
                  <div className="grid grid-cols-2 gap-2">
                    <Button size="sm" variant="primary" onClick={() => { setSelectedJob(job); setIsDeclareOpen(true); }}>
                      <UserPlus className="w-3.5 h-3.5 mr-1.5" /> Declare
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => generateGuestLink(job.id)} title="Copy Guest Proxy Link">
                      <LinkIcon className="w-3.5 h-3.5 mr-1.5" /> Guest Link
                    </Button>
                  </div>
                )}
                
                <Button size="sm" variant="outline" className="w-full text-slate-600" onClick={() => generateICS(job)}>
                  <CalendarIcon className="w-3.5 h-3.5 mr-1.5 text-slate-400" /> Add to Calendar
                </Button>
                
                {isAdmin && (
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => openAdminModal(job)}>Edit</Button>
                    <Button size="sm" variant="danger" onClick={() => deleteJob(job.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
                )}
              </div>
            </div>
          </Card>
        ))}
        {filteredJobs.length === 0 && (
          <div className="col-span-full py-12 px-4 text-center bg-white rounded-2xl border border-dashed border-slate-300">
            <p className="text-sm font-semibold text-slate-500">No shifts found for this filter.</p>
          </div>
        )}
      </div>

      {/* Family Declare Modal */}
      {isDeclareOpen && selectedJob && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <Card className="w-full max-w-sm bg-white shadow-xl relative z-10 border border-slate-200 p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-[#13415D]">Declare for Shift</h3>
              <button onClick={() => setIsDeclareOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-full transition-colors"><X className="w-5 h-5"/></button>
            </div>
            <form onSubmit={handleDeclare} className="space-y-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-xs text-slate-500">Selected shift:</p>
                <p className="text-sm font-bold text-[#13415D]">{selectedJob.title}</p>
                <p className="text-xs text-slate-600 mt-1">{selectedJob.date.toDate().toLocaleDateString()}</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#13415D] mb-1">Assignee Full Name</label>
                <Input required value={assigneeName} onChange={e => setAssigneeName(e.target.value)} placeholder="e.g. John Doe" />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <Button variant="outline" type="button" onClick={() => setIsDeclareOpen(false)}>Cancel</Button>
                <Button type="submit" variant="primary">Confirm</Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Admin Modal */}
      {isAdmin && isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <Card className="w-full max-w-lg bg-white shadow-xl relative z-10 border border-slate-200 my-8 p-6">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-xl font-bold text-[#13415D]">{editingJob ? "Edit Shift" : "Create New Shift"}</h3>
              <button type="button" onClick={() => setIsModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-full transition-colors"><X className="w-5 h-5"/></button>
            </div>
            <form onSubmit={saveJob} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#13415D] mb-1">Shift Title</label>
                <Input required value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Snack Bar Setup" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#13415D] mb-1">Shift Category</label>
                <select 
                  className="flex h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-[#13415D] focus-visible:outline-none focus-visible:border-[#0A856C] focus-visible:ring-2 focus-visible:ring-[#0A856C]/20"
                  value={type}
                  onChange={e => setType(e.target.value as any)}
                >
                  <option value="General">General</option>
                  <option value="Event-Specific">Event-Specific</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#13415D] mb-1">Date</label>
                <Input type="date" required value={date} onChange={e => setDate(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#13415D] mb-1">Start Time</label>
                  <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#13415D] mb-1">End Time</label>
                  <Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#13415D] mb-1">Min Spots</label>
                  <Input type="number" min={1} required value={minPos} onChange={e => setMinPos(Number(e.target.value))} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#13415D] mb-1">Desired</label>
                  <Input type="number" min={1} required value={desiredPos} onChange={e => setDesiredPos(Number(e.target.value))} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#13415D] mb-1">Max Spots</label>
                  <Input type="number" min={1} required value={maxPos} onChange={e => setMaxPos(Number(e.target.value))} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#13415D] mb-1">Description</label>
                <textarea 
                  className="flex min-h-[70px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-[#13415D] focus-visible:outline-none focus-visible:border-[#0A856C] focus-visible:ring-2 focus-visible:ring-[#0A856C]/20"
                  value={description}
                  onChange={e => setDescription(e.target.value)} 
                  placeholder="Details about responsibilities and location..."
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#13415D] mb-1">Point of Contact / Lead</label>
                <Input value={poc} onChange={e => setPoc(e.target.value)} placeholder="e.g. coach@example.com" />
              </div>
              <div className="pt-3 flex justify-end gap-2">
                <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                <Button type="submit" variant="primary">Save Shift</Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  )
}

