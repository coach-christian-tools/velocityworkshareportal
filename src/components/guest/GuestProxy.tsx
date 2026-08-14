import { useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { doc, getDoc, addDoc, collection } from "firebase/firestore"
import { db } from "../../lib/firebase"
import type { Posting, Family } from "../../types"
import { Card } from "../ui/Card"
import { Input } from "../ui/Input"
import { Button } from "../ui/Button"

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
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  if (!job || !family) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center border-red-200">
          <h2 className="text-xl font-bold text-red-500 mb-2">Invalid Link</h2>
          <p>This guest proxy link is invalid or has expired.</p>
        </Card>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--background)]">
        <Card className="w-full max-w-md text-center border-green-200">
          <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">✓</div>
          <h2 className="text-2xl font-bold text-green-600 mb-2">Thank You!</h2>
          <p>You have successfully registered for <strong>{job.title}</strong>.</p>
          <p className="mt-2 text-sm text-gray-500">The {family.authorizedEmails[0]?.split('@')[0]} family has been credited.</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--background)]">
      <Card className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-primary-600 mb-2">Velocity Swimming</h1>
          <h2 className="text-xl font-semibold">Guest Proxy Sign-Up</h2>
        </div>

        <div className="bg-primary-50 dark:bg-primary-900/20 p-4 rounded-lg mb-6 border border-primary-100 dark:border-primary-800">
          <p className="text-sm font-medium text-primary-800 dark:text-primary-300 mb-1">You are signing up on behalf of:</p>
          <p className="font-bold">{family.authorizedEmails.join(", ")}</p>
          <hr className="my-3 border-primary-200 dark:border-primary-800" />
          <p className="font-semibold">{job.title}</p>
          <p className="text-sm">{job.date.toDate().toLocaleDateString()}</p>
          {(job.startTime || job.endTime) && (
            <p className="text-sm">{job.startTime?.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {job.endTime?.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">First Name</label>
              <Input required value={firstName} onChange={e => setFirstName(e.target.value)} />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">Last Name</label>
              <Input required value={lastName} onChange={e => setLastName(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Relation to Family</label>
            <Input required value={relation} onChange={e => setRelation(e.target.value)} placeholder="e.g. Grandparent, Friend" />
          </div>
          <div className="pt-4">
            <Button type="submit" className="w-full h-12 text-lg">Sign Up</Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
