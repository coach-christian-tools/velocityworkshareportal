import { Timestamp } from "firebase/firestore"

export interface Family {
  id: string
  authorizedEmails: string[]
  category: "Recreation" | "Development" | "Competitive" | "Masters"
  requirements: {
    generalPoolHours: number
    eventSpecificHours: number
  }
  members: {
    fullName: string
    category: "Recreation" | "Development" | "Competitive" | "Masters"
  }[]
}

export interface Posting {
  id: string
  type: "General" | "Event-Specific"
  title: string
  date: Timestamp
  startTime?: Timestamp
  endTime?: Timestamp
  description?: string
  positions: {
    min: number
    desired: number
    max: number
  }
  pointOfContact?: string
  status: "Open" | "Filled" | "Completed"
}

export interface Registration {
  id: string
  postingId: string
  familyId: string
  assignee: {
    name: string
    isGuest: boolean
    relation?: string
  }
  status: "Pending" | "Complete" | "Incomplete"
}
