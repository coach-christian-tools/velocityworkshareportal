import { useEffect, useState } from "react"
import { collection, onSnapshot, addDoc, doc, updateDoc, deleteDoc } from "firebase/firestore"
import { db } from "../../lib/firebase"
import type { Family } from "../../types"
import { Button } from "../ui/Button"
import { Card } from "../ui/Card"
import { Input } from "../ui/Input"
import { downloadCSV } from "../../lib/csv"
import { Download, Plus, Edit2, Trash2, X } from "lucide-react"

export function FamiliesAdmin() {
  const [families, setFamilies] = useState<Family[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingFamily, setEditingFamily] = useState<Family | null>(null)
  
  // Form state
  const [category, setCategory] = useState<Family["category"]>("Recreation")
  const [emails, setEmails] = useState("")
  const [generalHours, setGeneralHours] = useState(0)
  const [eventHours, setEventHours] = useState(0)

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "families"), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Family))
      setFamilies(data)
    })
    return () => unsub()
  }, [])

  const handleExport = () => {
    const dataToExport = families.map(f => ({
      ID: f.id,
      Category: f.category,
      Emails: f.authorizedEmails.join("; "),
      GeneralPoolHoursReq: f.requirements.generalPoolHours,
      EventSpecificHoursReq: f.requirements.eventSpecificHours
    }))
    downloadCSV(dataToExport, "families_export.csv")
  }

  const openModal = (family?: Family) => {
    if (family) {
      setEditingFamily(family)
      setCategory(family.category)
      setEmails(family.authorizedEmails.join(", "))
      setGeneralHours(family.requirements.generalPoolHours)
      setEventHours(family.requirements.eventSpecificHours)
    } else {
      setEditingFamily(null)
      setCategory("Recreation")
      setEmails("")
      setGeneralHours(0)
      setEventHours(0)
    }
    setIsModalOpen(true)
  }

  const saveFamily = async (e: React.FormEvent) => {
    e.preventDefault()
    const authorizedEmails = emails.split(",").map(e => e.trim()).filter(e => e)
    
    const familyData = {
      category,
      authorizedEmails,
      requirements: {
        generalPoolHours: generalHours,
        eventSpecificHours: eventHours
      },
      members: editingFamily?.members || [] // keep existing members for now
    }

    try {
      if (editingFamily) {
        await updateDoc(doc(db, "families", editingFamily.id), familyData)
      } else {
        await addDoc(collection(db, "families"), familyData)
      }
      setIsModalOpen(false)
    } catch (err) {
      console.error(err)
      alert("Error saving family data. Check console.")
    }
  }

  const deleteFamily = async (id: string) => {
    if (confirm("Are you sure you want to delete this family?")) {
      await deleteDoc(doc(db, "families", id))
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">Families</h2>
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button onClick={() => openModal()}>
            <Plus className="w-4 h-4 mr-2" />
            Add Family
          </Button>
        </div>
      </div>

      <Card className="overflow-x-auto p-0">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[var(--glass-border)]">
              <th className="p-4 font-semibold text-sm">Category</th>
              <th className="p-4 font-semibold text-sm">Authorized Emails</th>
              <th className="p-4 font-semibold text-sm">Req. Hours (Gen/Event)</th>
              <th className="p-4 font-semibold text-sm text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {families.map(f => (
              <tr key={f.id} className="border-b border-[var(--glass-border)] last:border-0 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                <td className="p-4">{f.category}</td>
                <td className="p-4">{f.authorizedEmails.join(", ")}</td>
                <td className="p-4">{f.requirements?.generalPoolHours || 0} / {f.requirements?.eventSpecificHours || 0}</td>
                <td className="p-4 flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => openModal(f)}>
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600" onClick={() => deleteFamily(f.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </td>
              </tr>
            ))}
            {families.length === 0 && (
              <tr>
                <td colSpan={4} className="p-8 text-center text-gray-500">No families found. Add one to get started.</td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <Card className="w-full max-w-lg bg-[var(--background)] shadow-2xl relative z-10 border border-[var(--glass-border)]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">{editingFamily ? "Edit Family" : "Add Family"}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 hover:bg-black/10 rounded-full transition-colors"><X className="w-5 h-5"/></button>
            </div>
            <form onSubmit={saveFamily} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Category</label>
                <select 
                  className="flex h-10 w-full rounded-md border border-[var(--glass-border)] bg-[var(--glass-bg)] px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                  value={category}
                  onChange={e => setCategory(e.target.value as any)}
                >
                  <option value="Recreation">Recreation</option>
                  <option value="Development">Development</option>
                  <option value="Competitive">Competitive</option>
                  <option value="Masters">Masters</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Authorized Emails (comma separated)</label>
                <Input required value={emails} onChange={e => setEmails(e.target.value)} placeholder="email1@example.com, email2@example.com" />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-1">General Pool Hours</label>
                  <Input type="number" required min={0} value={generalHours} onChange={e => setGeneralHours(Number(e.target.value))} />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-1">Event-Specific Hours</label>
                  <Input type="number" required min={0} value={eventHours} onChange={e => setEventHours(Number(e.target.value))} />
                </div>
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                <Button type="submit">Save</Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  )
}
