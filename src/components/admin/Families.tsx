import { useEffect, useState, useMemo } from "react"
import { collection, onSnapshot, addDoc, doc, updateDoc, deleteDoc } from "firebase/firestore"
import { db } from "../../lib/firebase"
import type { Family, Child, ChildGroup } from "../../types"
import { Button } from "../ui/Button"
import { Card } from "../ui/Card"
import { Input } from "../ui/Input"
import { downloadCSV } from "../../lib/csv"
import { Download, Plus, Edit2, Trash2, X, Search } from "lucide-react"

const CHILD_GROUPS: ChildGroup[] = [
  "No Assignment",
  "Splash",
  "Pre-Team",
  "Prep",
  "Age Groupers",
  "Juniors",
  "Seniors",
  "Masters",
  "Rec Team",
  "Coaches",
  "Board Members"
]

const DIVISION_LABELS: Record<string, string> = {
  Recreation: "REC",
  Competitive: "COMP",
  Development: "DEV",
  Masters: "MTR"
}

export function FamiliesAdmin() {
  const [families, setFamilies] = useState<Family[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingFamily, setEditingFamily] = useState<Family | null>(null)

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState("")
  const [divisionFilter, setDivisionFilter] = useState<string>("ALL")

  // Form state
  const [accountName, setAccountName] = useState("")
  const [category, setCategory] = useState<Family["category"]>("Recreation")
  const [emails, setEmails] = useState("")
  const [children, setChildren] = useState<Child[]>([])
  const [generalHours, setGeneralHours] = useState("0")
  const [eventHours, setEventHours] = useState("0")

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "families"), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Family))
      setFamilies(data)
    })
    return () => unsub()
  }, [])

  const filteredFamilies = useMemo(() => {
    return families.filter(f => {
      const matchesDivision = divisionFilter === "ALL" || f.category === divisionFilter
      if (!matchesDivision) return false

      if (!searchTerm.trim()) return true
      const term = searchTerm.toLowerCase()
      const matchName = f.accountName?.toLowerCase().includes(term)
      const matchEmail = f.authorizedEmails?.some(e => e.toLowerCase().includes(term))
      const matchChild = f.children?.some(c => c.name.toLowerCase().includes(term) || c.group.toLowerCase().includes(term))
      return matchName || matchEmail || matchChild
    })
  }, [families, searchTerm, divisionFilter])

  const handleExport = () => {
    const dataToExport = families.map(f => ({
      ID: f.id,
      AccountName: f.accountName || "",
      Division: f.category,
      Children: f.children ? f.children.map(c => `${c.name} (${c.group})`).join("; ") : "",
      Emails: f.authorizedEmails.join("; "),
      GeneralPoolHoursReq: f.requirements?.generalPoolHours ?? 0,
      EventSpecificHoursReq: f.requirements?.eventSpecificHours ?? 0
    }))
    downloadCSV(dataToExport, "families_export.csv")
  }

  const openModal = (family?: Family) => {
    if (family) {
      setEditingFamily(family)
      setAccountName(family.accountName || "")
      setCategory(family.category || "Recreation")
      setEmails(family.authorizedEmails?.join(", ") || "")
      setChildren(family.children ? [...family.children] : [])
      setGeneralHours(String(family.requirements?.generalPoolHours ?? 0))
      setEventHours(String(family.requirements?.eventSpecificHours ?? 0))
    } else {
      setEditingFamily(null)
      setAccountName("")
      setCategory("Recreation")
      setEmails("")
      setChildren([])
      setGeneralHours("0")
      setEventHours("0")
    }
    setIsModalOpen(true)
  }

  const handleAddChild = () => {
    setChildren(prev => [...prev, { name: "", group: "No Assignment" }])
  }

  const handleChildChange = (index: number, field: keyof Child, value: string) => {
    setChildren(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }

  const handleRemoveChild = (index: number) => {
    setChildren(prev => prev.filter((_, i) => i !== index))
  }

  const handleNumberChange = (setter: (val: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    // Allow empty string or valid integer/decimal number
    if (val === "" || /^\d*\.?\d*$/.test(val)) {
      setter(val)
    }
  }

  const saveFamily = async (e: React.FormEvent) => {
    e.preventDefault()

    const genHoursNum = parseFloat(generalHours)
    const eventHoursNum = parseFloat(eventHours)

    if (isNaN(genHoursNum) || isNaN(eventHoursNum)) {
      alert("Please enter a valid number for General Pool Hours and Event-Specific Hours.")
      return
    }

    const authorizedEmails = emails.split(",").map(e => e.trim()).filter(e => e)
    const validChildren = children.map(c => ({
      name: c.name.trim(),
      group: c.group
    })).filter(c => c.name.length > 0)

    const familyData = {
      accountName: accountName.trim(),
      category,
      authorizedEmails,
      children: validChildren,
      requirements: {
        generalPoolHours: genHoursNum,
        eventSpecificHours: eventHoursNum
      },
      members: editingFamily?.members || []
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
      setIsModalOpen(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#13415D] tracking-tight">Family Roster</h2>
          <p className="text-sm text-slate-500 mt-1">
            Manage registered swimmer families, children, and hourly requirements ({families.length} families total).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="w-4 h-4 mr-1.5 text-slate-500" />
            Export CSV
          </Button>
          <Button variant="primary" size="sm" onClick={() => openModal()}>
            <Plus className="w-4 h-4 mr-1.5" />
            Add Family
          </Button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            type="text"
            placeholder="Search by family, child, or email..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-9 h-10 text-sm"
          />
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select
            value={divisionFilter}
            onChange={e => setDivisionFilter(e.target.value)}
            className="flex h-10 w-full sm:w-44 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-[#13415D] focus-visible:outline-none focus-visible:border-[#0A856C] focus-visible:ring-2 focus-visible:ring-[#0A856C]/20"
          >
            <option value="ALL">All Divisions ({families.length})</option>
            <option value="Competitive">Competitive</option>
            <option value="Development">Development</option>
            <option value="Recreation">Recreation</option>
            <option value="Masters">Masters</option>
          </select>
          <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">
            Showing {filteredFamilies.length} of {families.length}
          </span>
        </div>
      </div>

      {/* Families List / Table */}
      <Card className="p-0 md:p-0 overflow-hidden bg-white border border-slate-200 shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70">
                <th className="py-3.5 px-4 font-bold text-xs uppercase tracking-wider text-slate-500">Account</th>
                <th className="py-3.5 px-4 font-bold text-xs uppercase tracking-wider text-slate-500">Division</th>
                <th className="py-3.5 px-4 font-bold text-xs uppercase tracking-wider text-slate-500">Swimmers</th>
                <th className="py-3.5 px-4 font-bold text-xs uppercase tracking-wider text-slate-500">Authorized Emails</th>
                <th className="py-3.5 px-4 font-bold text-xs uppercase tracking-wider text-slate-500">Req. Hours (Gen / Event)</th>
                <th className="py-3.5 px-4 font-bold text-xs uppercase tracking-wider text-slate-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredFamilies.map(f => (
                <tr key={f.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-3.5 px-4">
                    <span className="font-bold text-sm text-[#13415D]">
                      {f.accountName || <span className="text-slate-400 font-normal italic">Unnamed Family</span>}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${f.category === 'Competitive' ? 'bg-blue-50 text-blue-700' :
                      f.category === 'Masters' ? 'bg-purple-50 text-purple-700' :
                        f.category === 'Development' ? 'bg-emerald-50 text-emerald-700' :
                          'bg-slate-100 text-slate-700'
                      }`}>
                      {DIVISION_LABELS[f.category] || f.category}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    {f.children && f.children.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {f.children.map((child, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200"
                          >
                            <span className="font-semibold text-[#13415D] mr-1">
                              {child.name ? child.name.trim().split(/\s+/)[0] : ""}
                            </span>
                            <span className="text-slate-500 text-[11px]">({child.group})</span>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-400 text-xs italic">No children</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-xs font-medium text-slate-700">
                    {f.authorizedEmails && f.authorizedEmails.length > 0 ? (
                      f.authorizedEmails.join(", ")
                    ) : (
                      <span className="text-slate-400 italic">None</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-xs font-bold text-[#13415D]">
                    <span className="text-[#0A856C]">{f.requirements?.generalPoolHours ?? 0}h Gen</span> / <span>{f.requirements?.eventSpecificHours ?? 0}h Event</span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openModal(f)}
                        className="p-1.5 text-slate-500 hover:text-[#0A856C] hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                        title="Edit Family"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredFamilies.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 px-4 text-center text-slate-400 text-sm">
                    {families.length === 0 ? "No families registered yet. Click \"Add Family\" to create one." : "No families matched your search filter."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <Card className="w-full max-w-xl max-h-[90vh] flex flex-col bg-white shadow-xl relative z-10 border border-slate-200 p-6 overflow-hidden">
            <div className="flex justify-between items-center mb-5 pb-2 border-b border-slate-100 shrink-0">
              <h3 className="text-xl font-bold text-[#13415D]">{editingFamily ? "Edit Family" : "Add New Family"}</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={saveFamily} className="space-y-4 overflow-y-auto pr-1 flex-1">
              {/* Account Name and Division on the same row, name on left */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#13415D] mb-1">Account Name</label>
                  <Input
                    required
                    value={accountName}
                    onChange={e => setAccountName(e.target.value)}
                    placeholder="e.g. Smith Family"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#13415D] mb-1">Division</label>
                  <select
                    className="flex h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-[#13415D] focus-visible:outline-none focus-visible:border-[#0A856C] focus-visible:ring-2 focus-visible:ring-[#0A856C]/20"
                    value={category}
                    onChange={e => setCategory(e.target.value as Family["category"])}
                  >
                    <option value="Recreation">Recreation</option>
                    <option value="Development">Development</option>
                    <option value="Competitive">Competitive</option>
                    <option value="Masters">Masters</option>
                  </select>
                </div>
              </div>

              {/* Authorized Emails */}
              <div>
                <label className="block text-xs font-semibold text-[#13415D] mb-1">Authorized Emails (comma-separated)</label>
                <Input
                  required
                  value={emails}
                  onChange={e => setEmails(e.target.value)}
                  placeholder="parent1@example.com, parent2@example.com"
                />
              </div>

              {/* Children Section with Add Child button */}
              <div className="space-y-2.5 pt-1">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-xs font-semibold text-[#13415D]">Swimmers</label>
                    <p className="text-[11px] text-slate-500">Add children and their assigned swim group.</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddChild}
                    className="h-8 text-xs px-2.5 text-[#0A856C] border-[#0A856C]/30 hover:bg-[#0A856C]/10"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Add Child
                  </Button>
                </div>

                {children.length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {children.map((child, index) => (
                      <div key={index} className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                        <div className="flex-1">
                          <Input
                            placeholder="Child Name"
                            value={child.name}
                            onChange={e => handleChildChange(index, "name", e.target.value)}
                            className="h-9 text-xs"
                            required
                          />
                        </div>
                        <div className="w-40 sm:w-44">
                          <select
                            value={child.group}
                            onChange={e => handleChildChange(index, "group", e.target.value as ChildGroup)}
                            className="flex h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs text-[#13415D] focus-visible:outline-none focus-visible:border-[#0A856C] focus-visible:ring-2 focus-visible:ring-[#0A856C]/20"
                          >
                            {CHILD_GROUPS.map(grp => (
                              <option key={grp} value={grp}>{grp}</option>
                            ))}
                          </select>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveChild(index)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="Remove child"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 italic bg-slate-50 border border-dashed border-slate-200 rounded-lg p-3 text-center">
                    No children added yet. Click "Add Child" to add swimmers.
                  </div>
                )}
              </div>

              {/* Numerical inputs as text inputs with validation */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-[#13415D] mb-1">General Pool Hours</label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    required
                    value={generalHours}
                    onChange={handleNumberChange(setGeneralHours)}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#13415D] mb-1">Event-Specific Hours</label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    required
                    value={eventHours}
                    onChange={handleNumberChange(setEventHours)}
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center justify-between border-t border-slate-100 shrink-0">
                {editingFamily ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => deleteFamily(editingFamily.id)}
                    className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
                  >
                    <Trash2 className="w-4 h-4 mr-1.5" />
                    Delete Family
                  </Button>
                ) : (
                  <div />
                )}
                <div className="flex items-center gap-2">
                  <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                  <Button type="submit" variant="primary">Save Family</Button>
                </div>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  )
}
