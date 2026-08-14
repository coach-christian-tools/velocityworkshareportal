import { useEffect, useState } from "react"
import { collection, onSnapshot, doc, updateDoc, deleteDoc } from "firebase/firestore"
import { db } from "../../lib/firebase"
import type { Registration, Posting, Family } from "../../types"
import { Button } from "../ui/Button"
import { Card } from "../ui/Card"
import { downloadCSV } from "../../lib/csv"
import { Download, CheckCircle, XCircle, Trash2 } from "lucide-react"

export function RegistrationsAdmin() {
  const [registrations, setRegistrations] = useState<Registration[]>([])
  const [postings, setPostings] = useState<Record<string, Posting>>({})
  const [families, setFamilies] = useState<Record<string, Family>>({})

  useEffect(() => {
    const unsubRegs = onSnapshot(collection(db, "registrations"), (snapshot) => {
      setRegistrations(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Registration)))
    })
    const unsubPosts = onSnapshot(collection(db, "postings"), (snapshot) => {
      const posts: Record<string, Posting> = {}
      snapshot.forEach(d => { posts[d.id] = { id: d.id, ...d.data() } as Posting })
      setPostings(posts)
    })
    const unsubFams = onSnapshot(collection(db, "families"), (snapshot) => {
      const fams: Record<string, Family> = {}
      snapshot.forEach(d => { fams[d.id] = { id: d.id, ...d.data() } as Family })
      setFamilies(fams)
    })

    return () => { unsubRegs(); unsubPosts(); unsubFams(); }
  }, [])

  const handleExport = () => {
    const dataToExport = registrations.map(r => {
      const post = postings[r.postingId]
      const fam = families[r.familyId]
      return {
        ID: r.id,
        JobTitle: post?.title || "Unknown Job",
        JobDate: post ? post.date.toDate().toLocaleDateString() : "",
        FamilyEmail: fam ? fam.authorizedEmails.join(", ") : "Unknown",
        AssigneeName: r.assignee.name,
        IsGuest: r.assignee.isGuest ? "Yes" : "No",
        GuestRelation: r.assignee.relation || "",
        Status: r.status
      }
    })
    downloadCSV(dataToExport, "registrations_export.csv")
  }

  const updateStatus = async (id: string, status: Registration["status"]) => {
    await updateDoc(doc(db, "registrations", id), { status })
  }

  const deleteRegistration = async (id: string) => {
    if (confirm("Delete this registration?")) {
      await deleteDoc(doc(db, "registrations", id))
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">Roster & Attendance</h2>
        <Button variant="outline" onClick={handleExport}>
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      <Card className="overflow-x-auto p-0">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[var(--glass-border)]">
              <th className="p-4 font-semibold text-sm">Job</th>
              <th className="p-4 font-semibold text-sm">Date</th>
              <th className="p-4 font-semibold text-sm">Family/Email</th>
              <th className="p-4 font-semibold text-sm">Assignee</th>
              <th className="p-4 font-semibold text-sm">Status</th>
              <th className="p-4 font-semibold text-sm text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {registrations.map(r => {
              const post = postings[r.postingId]
              const fam = families[r.familyId]
              return (
                <tr key={r.id} className="border-b border-[var(--glass-border)] last:border-0 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                  <td className="p-4">{post?.title || <span className="text-red-500">Deleted Job</span>}</td>
                  <td className="p-4">{post ? post.date.toDate().toLocaleDateString() : ""}</td>
                  <td className="p-4">{fam ? fam.authorizedEmails.join(", ") : <span className="text-red-500">Deleted Family</span>}</td>
                  <td className="p-4">
                    {r.assignee.name}
                    {r.assignee.isGuest && <span className="ml-2 text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">Guest ({r.assignee.relation})</span>}
                  </td>
                  <td className="p-4">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      r.status === 'Complete' ? 'bg-green-100 text-green-700' :
                      r.status === 'Incomplete' ? 'bg-red-100 text-red-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="p-4 flex justify-end gap-2">
                    {r.status === 'Pending' && (
                      <>
                        <Button variant="ghost" size="sm" className="text-green-600 hover:text-green-700" onClick={() => updateStatus(r.id, "Complete")} title="Mark Complete">
                          <CheckCircle className="w-5 h-5" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700" onClick={() => updateStatus(r.id, "Incomplete")} title="Mark Incomplete (No-Show)">
                          <XCircle className="w-5 h-5" />
                        </Button>
                      </>
                    )}
                    <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600" onClick={() => deleteRegistration(r.id)} title="Delete Registration">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              )
            })}
            {registrations.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-gray-500">No registrations found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
