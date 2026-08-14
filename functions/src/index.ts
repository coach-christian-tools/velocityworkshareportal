import { onSchedule } from "firebase-functions/v2/scheduler"
import * as admin from "firebase-admin"
import { getFirestore } from "firebase-admin/firestore"

admin.initializeApp()
const db = getFirestore()

export const sendShiftReminders = onSchedule("every day 00:00", async (event) => {
  const now = new Date()
  
  // Looking for jobs starting exactly in 48 hours
  const targetDate = new Date(now)
  targetDate.setDate(now.getDate() + 2)
  
  const startOfDay = new Date(targetDate)
  startOfDay.setHours(0, 0, 0, 0)
  
  const endOfDay = new Date(targetDate)
  endOfDay.setHours(23, 59, 59, 999)

  console.log(`Checking for shifts between ${startOfDay} and ${endOfDay}`)

  const postingsRef = db.collection("postings")
  const snapshot = await postingsRef
    .where("date", ">=", admin.firestore.Timestamp.fromDate(startOfDay))
    .where("date", "<=", admin.firestore.Timestamp.fromDate(endOfDay))
    .get()

  if (snapshot.empty) {
    console.log("No shifts in 48 hours.")
    return
  }

  const jobIds = snapshot.docs.map(d => d.id)
  console.log(`Found ${jobIds.length} upcoming shifts. Checking registrations...`)

  for (const doc of snapshot.docs) {
    const job = doc.data()
    
    // Find all registrations for this job
    const regsRef = db.collection("registrations")
    const regsSnap = await regsRef
      .where("postingId", "==", doc.id)
      .where("status", "==", "Pending")
      .get()

    for (const regDoc of regsSnap.docs) {
      const reg = regDoc.data()
      const familyDoc = await db.collection("families").doc(reg.familyId).get()
      
      if (familyDoc.exists) {
        const familyData = familyDoc.data()
        const emails = familyData?.authorizedEmails || []
        
        // Pseudo-code for sending email. 
        // In a real app, you would integrate Resend, SendGrid, or the Firebase Trigger Email Extension here.
        console.log(`[EMAIL SENT] To: ${emails.join(", ")} | Subject: Reminder: Upcoming Shift for ${job.title} | Assignee: ${reg.assignee.name}`)
      }
    }
  }

  console.log("Reminders checked.")
})
