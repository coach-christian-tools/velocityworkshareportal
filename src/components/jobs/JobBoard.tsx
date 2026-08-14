import { useEffect, useState } from "react"
import { collection, onSnapshot, addDoc, doc, updateDoc, deleteDoc, Timestamp } from "firebase/firestore"
import { db } from "../../lib/firebase"
import { Posting } from "../../types"
import { useAuth } from "../../contexts/AuthContext"
import { Button } from "../ui/Button"
import { Card } from "../ui/Card"
import { Input } from "../ui/Input"
import { Plus, Trash2, X, Calendar as CalendarIcon, Link as LinkIcon, UserPlus } from "lucide-react"
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
      alert("Successfully declared for job!")
    } catch (err) {
      console.error(err)
      alert("Failed to declare for job.")
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
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">Job Board</h2>
        {isAdmin && (
          <Button onClick={() => openAdminModal()}>
            <Plus className="w-4 h-4 mr-2" />
            Create Job
          </Button>
        )}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        <Button variant={filterType === "All" ? "primary" : "outline"} onClick={() => setFilterType("All")}>All Jobs</Button>
        <Button variant={filterType === "General" ? "primary" : "outline"} onClick={() => setFilterType("General")}>General</Button>
        <Button variant={filterType === "Event-Specific" ? "primary" : "outline"} onClick={() => setFilterType("Event-Specific")}>Event-Specific</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredJobs.map(job => (
          <Card key={job.id} className="flex flex-col relative overflow-hidden group">
            <div className={`absolute top-0 left-0 w-1 h-full ${job.type === 'General' ? 'bg-blue-500' : 'bg-orange-500'}`} />
            
            <div className="flex justify-between items-start mb-2 pl-3">
              <h3 className="font-bold text-lg">{job.title}</h3>
              <span className={`text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap ml-2 ${job.type === 'General' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                {job.type}
              </span>
            </div>
            
            <div className="text-sm space-y-1 mb-4 flex-1 pl-3">
              <p><strong>Date:</strong> {job.date.toDate().toLocaleDateString()}</p>
              {(job.startTime || job.endTime) && (
                <p><strong>Time:</strong> {job.startTime?.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {job.endTime?.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
              )}
              {job.pointOfContact && <p><strong>Contact:</strong> {job.pointOfContact}</p>}
              {job.description && <p className="text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">{job.description}</p>}
            </div>

            <div className="flex flex-col gap-2 mt-auto pl-3">
              {!isAdmin && (
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1" onClick={() => { setSelectedJob(job); setIsDeclareOpen(true); }}>
                    <UserPlus className="w-4 h-4 mr-2" /> Declare
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => generateGuestLink(job.id)} title="Copy Guest Proxy Link">
                    <LinkIcon className="w-4 h-4 mr-2" /> Guest Link
                  </Button>
                </div>
              )}
              
              <Button size="sm" variant="outline" className="w-full" onClick={() => generateICS(job)}>
                <CalendarIcon className="w-4 h-4 mr-2" /> Add to Calendar
              </Button>
              
              {isAdmin && (
                <div className="flex gap-2 mt-2">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => openAdminModal(job)}>Edit</Button>
                  <Button size="sm" variant="danger" onClick={() => deleteJob(job.id)}><Trash2 className="w-4 h-4" /></Button>
                </div>
              )}
            </div>
          </Card>
        ))}
        {filteredJobs.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-500">
            No jobs found.
          </div>
        )}
      </div>

      {/* Family Declare Modal */}
      {isDeclareOpen && selectedJob && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <Card className="w-full max-w-sm bg-[var(--background)] shadow-2xl relative z-10 border border-[var(--glass-border)]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">Declare Shift</h3>
              <button onClick={() => setIsDeclareOpen(false)} className="p-1 hover:bg-black/10 rounded-full transition-colors"><X className="w-5 h-5"/></button>
            </div>
            <form onSubmit={handleDeclare} className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                You are claiming: <strong>{selectedJob.title}</strong>
              </p>
              <div>
                <label className="block text-sm font-medium mb-1">Family Member Name</label>
                <Input required value={assigneeName} onChange={e => setAssigneeName(e.target.value)} placeholder="e.g. John Doe" />
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <Button variant="outline" type="button" onClick={() => setIsDeclareOpen(false)}>Cancel</Button>
                <Button type="submit">Confirm Declaration</Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Admin Modal */}
      {isAdmin && isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
          <Card className="w-full max-w-lg bg-[var(--background)] shadow-2xl relative z-10 border border-[var(--glass-border)] my-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">{editingJob ? "Edit Job" : "Create Job"}</h3>
              <button type="button" onClick={() => setIsModalOpen(false)} className="p-1 hover:bg-black/10 rounded-full transition-colors"><X className="w-5 h-5"/></button>
            </div>
            <form onSubmit={saveJob} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Title</label>
                <Input required value={title} onChange={e => setTitle(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Type</label>
                <select 
                  className="flex h-10 w-full rounded-md border border-[var(--glass-border)] bg-[var(--glass-bg)] px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                  value={type}
                  onChange={e => setType(e.target.value as any)}
                >
                  <option value="General">General</option>
                  <option value="Event-Specific">Event-Specific</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Date</label>
                <Input type="date" required value={date} onChange={e => setDate(e.target.value)} />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-1">Start Time</label>
                  <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-1">End Time</label>
                  <Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} />
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-1">Min Positions</label>
                  <Input type="number" min={1} required value={minPos} onChange={e => setMinPos(Number(e.target.value))} />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-1">Desired</label>
                  <Input type="number" min={1} required value={desiredPos} onChange={e => setDesiredPos(Number(e.target.value))} />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-1">Max Positions</label>
                  <Input type="number" min={1} required value={maxPos} onChange={e => setMaxPos(Number(e.target.value))} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea 
                  className="flex min-h-[80px] w-full rounded-md border border-[var(--glass-border)] bg-[var(--glass-bg)] px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                  value={description}
                  onChange={e => setDescription(e.target.value)} 
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Point of Contact</label>
                <Input value={poc} onChange={e => setPoc(e.target.value)} />
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                <Button type="submit">Save Job</Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  )
}
