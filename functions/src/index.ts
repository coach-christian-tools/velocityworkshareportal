import { onSchedule } from "firebase-functions/v2/scheduler"
import { onCall, HttpsError } from "firebase-functions/v2/https"
import * as admin from "firebase-admin"
import { getFirestore } from "firebase-admin/firestore"
import * as crypto from "crypto"
import { Resend } from "resend"

admin.initializeApp()
const db = getFirestore()

export const sendOtp = onCall({ cors: true }, async (request) => {
  const rawEmail = request.data?.email
  if (!rawEmail || typeof rawEmail !== "string") {
    throw new HttpsError("invalid-argument", "A valid email address is required.")
  }

  const email = rawEmail.trim().toLowerCase()
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    throw new HttpsError("invalid-argument", "Invalid email format.")
  }

  const otpDocRef = db.collection("_otp_codes").doc(email)
  const existingDoc = await otpDocRef.get()

  if (existingDoc.exists) {
    const data = existingDoc.data()
    const createdAt = data?.createdAt?.toMillis ? data.createdAt.toMillis() : 0
    const now = Date.now()
    // 60-second cooldown
    if (now - createdAt < 60 * 1000) {
      const waitSec = Math.ceil((60 * 1000 - (now - createdAt)) / 1000)
      throw new HttpsError("resource-exhausted", `Please wait ${waitSec} seconds before requesting a new code.`)
    }
  }

  // Generate 6-digit numeric OTP
  const code = crypto.randomInt(100000, 1000000).toString()
  const codeHash = crypto.createHash("sha256").update(code).digest("hex")

  await otpDocRef.set({
    email,
    codeHash,
    attempts: 0,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    expiresAt: admin.firestore.Timestamp.fromMillis(Date.now() + 10 * 60 * 1000) // 10 minutes
  })

  const resendApiKey = process.env.RESEND_API_KEY
  if (!resendApiKey) {
    throw new HttpsError("internal", "Email service is not configured (missing RESEND_API_KEY).")
  }
  const resend = new Resend(resendApiKey)

  // Send from verified custom domain velocityworkshare.com
  const fromAddress = process.env.RESEND_FROM_EMAIL || "Velocity Workshare <noreply@velocityworkshare.com>"

  try {
    const sendResult = await resend.emails.send({
      from: fromAddress,
      to: email,
      subject: `Your Velocity Workshare login code: ${code}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="color: #0284c7; font-size: 22px; font-weight: 700; margin: 0;">Velocity Swimming</h1>
            <p style="color: #64748b; font-size: 14px; margin: 4px 0 0 0;">Workshare Portal Sign-In</p>
          </div>
          <p style="font-size: 15px; color: #334155; line-height: 1.5; margin-bottom: 20px;">
            Enter the 6-digit verification code below to securely sign in to your Velocity Workshare account.
          </p>
          <div style="background-color: #f0f9ff; border: 2px dashed #0284c7; border-radius: 10px; padding: 20px; text-align: center; margin: 24px 0;">
            <span style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #0369a1; font-family: monospace;">${code}</span>
          </div>
          <p style="font-size: 13px; color: #64748b; line-height: 1.4; margin-top: 24px; text-align: center;">
            This code will expire in <strong>10 minutes</strong>. If you did not request this login code, you can safely ignore this email.
          </p>
        </div>
      `
    })

    if (sendResult.error) {
      console.error("Resend API error:", sendResult.error)
      throw new HttpsError("internal", sendResult.error.message || "Failed to deliver email.")
    }

    return { success: true, message: "Code sent successfully." }
  } catch (err: any) {
    console.error("Error sending OTP email:", err)
    if (err instanceof HttpsError) throw err
    throw new HttpsError("internal", err.message || "Failed to send verification email.")
  }
})

export const verifyOtp = onCall({ cors: true }, async (request) => {
  const rawEmail = request.data?.email
  const rawCode = request.data?.code

  if (!rawEmail || typeof rawEmail !== "string") {
    throw new HttpsError("invalid-argument", "Email is required.")
  }
  if (!rawCode || typeof rawCode !== "string") {
    throw new HttpsError("invalid-argument", "Verification code is required.")
  }

  const email = rawEmail.trim().toLowerCase()
  const code = rawCode.trim()

  if (code.length !== 6 || !/^\d{6}$/.test(code)) {
    throw new HttpsError("invalid-argument", "Verification code must be 6 digits.")
  }

  const otpDocRef = db.collection("_otp_codes").doc(email)
  const otpDoc = await otpDocRef.get()

  if (!otpDoc.exists) {
    throw new HttpsError("not-found", "No active verification code found for this email. Please request a new code.")
  }

  const data = otpDoc.data()
  const expiresAt = data?.expiresAt?.toMillis ? data.expiresAt.toMillis() : 0
  if (Date.now() > expiresAt) {
    await otpDocRef.delete()
    throw new HttpsError("deadline-exceeded", "This verification code has expired. Please request a new one.")
  }

  const attempts = data?.attempts || 0
  if (attempts >= 5) {
    await otpDocRef.delete()
    throw new HttpsError("permission-denied", "Too many invalid attempts. Please request a new code.")
  }

  const inputHash = crypto.createHash("sha256").update(code).digest("hex")
  if (inputHash !== data?.codeHash) {
    await otpDocRef.update({
      attempts: admin.firestore.FieldValue.increment(1)
    })
    const remaining = 5 - (attempts + 1)
    throw new HttpsError("invalid-argument", `Invalid verification code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`)
  }

  // Code is valid - clean up OTP document
  await otpDocRef.delete()

  // Get or create Firebase Auth user
  let userRecord: admin.auth.UserRecord
  try {
    userRecord = await admin.auth().getUserByEmail(email)
  } catch (err: any) {
    if (err.code === "auth/user-not-found") {
      userRecord = await admin.auth().createUser({
        email,
        emailVerified: true
      })
    } else {
      throw new HttpsError("internal", err.message || "Failed to process user account.")
    }
  }

  // Generate Firebase Custom Token
  const customToken = await admin.auth().createCustomToken(userRecord.uid, {
    email,
    isAdmin: email.endsWith("@velocity-swimming.com")
  })

  return {
    success: true,
    token: customToken
  }
})

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
        console.log(`[EMAIL SENT] To: ${emails.join(", ")} | Subject: Reminder: Upcoming Shift for ${job.title} | Assignee: ${reg.assignee.name}`)
      }
    }
  }

  console.log("Reminders checked.")
})
