🎚

**DJ DASHBOARD**

Yuen House Radio - Technical Requirements

_Version 2.0 - Updated access model: admin-managed allowlist_

February 2026

# **What Changed in v2.0**

This version updates the access and permission model based on the following decisions:

| **Decision**                        | **What it means**                                                                                                                                                                        |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| No self-signup for DJs              | Any UChicago student can log in with Google but cannot do anything until Agustin adds their email to the DJ allowlist. There is no application form or approval queue for becoming a DJ. |
| Admin designates DJs directly       | Agustin adds or removes emails from the allowlist through the Admin panel. The moment an email is added, that person can log in and start booking shows.                                 |
| No open student access to dashboard | The DJ Dashboard (dj.yuenhouse.org) is not for general UChicago students. Only allowlisted DJs and admins can use it. General students use yuenhouse.org/radio to listen.                |
| Show slot approval by admin         | DJs request show slots. Agustin approves or rejects them. Nothing goes on the public schedule or gets queued in Liquidsoap until approved.                                               |
| Two roles only                      | Admin (Agustin, and anyone Agustin promotes) and DJ (anyone on the allowlist). No 'student' tier in this app.                                                                            |

# **1\. Overview**

The DJ Dashboard is a standalone Next.js application running on macServer (the dedicated MacBook). DJs access it at dj.yuenhouse.org to request show slots, upload recorded shows, and manage their programming. Agustin (admin) uses it to manage who can DJ, approve or reject show requests, and oversee broadcast operations.

| **App URL**               | dj.yuenhouse.org                                                     |
| ------------------------- | -------------------------------------------------------------------- |
| **Runs on**               | macServer - dedicated MacBook, on-premise                            |
| **Framework**             | Next.js 14+ (App Router) - TypeScript, Tailwind CSS                  |
| **Auth provider**         | Google OAuth via NextAuth.js                                         |
| **Who can access**        | Only emails on Agustin's allowlist - no open signup                  |
| **Database**              | SQLite via Prisma - stored locally on macServer                      |
| **Process manager**       | PM2 - keeps the app running 24/7                                     |
| **Listeners use instead** | yuenhouse.org/radio - separate Vercel app, open to all @uchicago.edu |

## **1.1 The Three Apps - Clarified**

| **App**                      | **Who accesses it / What it does**                                                                 |
| ---------------------------- | -------------------------------------------------------------------------------------------------- |
| yuenhouse.org (Vercel)       | Already built. The music playlist app. All UChicago students. Stays as-is.                         |
| dj.yuenhouse.org (macServer) | THIS DOCUMENT. DJ Dashboard. Only Agustin's allowlisted DJs. Manage shows, schedule, uploads.      |
| yuenhouse.org/radio (Vercel) | Listener page. All UChicago students with Google login. Audio player + schedule. Built separately. |

**→ NOTE:** The DJ Dashboard and the listener page are completely separate apps. A student visiting yuenhouse.org/radio cannot access dj.yuenhouse.org - they are different authentication contexts. The only thing they share is the public /api/schedule endpoint that the listener page reads.

# **2\. Access Model & Roles**

Access to the DJ Dashboard is entirely controlled by Agustin. There is no self-service path into this app.

## **2.1 How Access Works**

When anyone visits dj.yuenhouse.org, they see a Google sign-in button. After signing in with Google, NextAuth checks two things in order:

- Is the email a @uchicago.edu address? If not - rejected immediately with a clear message.
- Is the email in the dj_allowlist table? If not - rejected with a message telling them to contact Agustin.
- If both pass - they are logged in as a DJ (or Admin if flagged).

**→ NOTE:** This means a UChicago student who is not on the allowlist will be told they don't have DJ access yet and to reach out to Agustin. They are not silently rejected - the message is clear and actionable.

## **2.2 Roles**

| **Role** | **Capabilities**                                                                                                                                                                                                                                                                  |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Admin    | Everything. Manage the DJ allowlist (add/remove emails). Approve or reject show slot requests. Cancel any show. Upload and manage the fallback playlist. View full Icecast stats. Promote other DJs to Admin. Book shows directly without approval (admin requests auto-approve). |
| DJ       | Log in and use the dashboard. Request live show slots (pending Admin approval). Upload recorded shows (pending Admin approval before scheduling). View own show history. See full schedule. Edit own show title/description. Cancel own pending or scheduled shows.               |

## **2.3 What DJs Cannot Do**

- Access the allowlist or see other DJs' contact information
- Approve their own show requests
- Book a show that bypasses admin approval
- Access the admin panel or Icecast stats
- Upload files that go live without admin approval
- See or modify other DJs' shows

## **2.4 Admin Allowlist Management**

The admin panel has a simple allowlist manager. Agustin can:

- Add an email to the allowlist - that person can immediately log in as a DJ
- Remove an email from the allowlist - that person's session is invalidated on next page load, they cannot log back in
- Promote a DJ to Admin - they gain full admin capabilities
- Demote an Admin back to DJ

**→ NOTE:** The allowlist only requires an email address - no name, no profile, nothing else. When the DJ first logs in via Google OAuth, their display name is pulled from their Google profile and stored automatically.

# **3\. Show Request & Approval Workflow**

Nothing goes on the public schedule or into Liquidsoap's queue until Agustin approves it. This gives full editorial control over what airs on Yuen House Radio.

## **3.1 Live Show Request Flow**

| **Step**               | **What happens**                                                                                       |
| ---------------------- | ------------------------------------------------------------------------------------------------------ |
| 1 - DJ requests a slot | DJ fills out the 'Request a Show' form: title, description, preferred date/time, duration. Submits it. |
| 2 - Request created    | Show record created with status='pending_approval'. Does NOT appear on the public schedule yet.        |
| 3 - Admin notified     | Admin panel shows a badge with the number of pending approvals. Agustin sees the request.              |
| 4 - Admin reviews      | Agustin sees the request details. Can approve or reject with an optional note to the DJ.               |
| 5a - Approved          | Show status changes to 'scheduled'. Appears on public schedule. DJ is notified via email.              |
| 5b - Rejected          | Show status changes to 'rejected'. DJ is notified via email with the admin's note explaining why.      |
| 6 - Show day           | DJ opens Mixxx, hits broadcast. Liquidsoap detects the live connection and goes live.                  |

## **3.2 Recorded Show Request Flow**

| **Step**             | **What happens**                                                                                       |
| -------------------- | ------------------------------------------------------------------------------------------------------ |
| 1 - DJ uploads file  | DJ uploads an MP3/WAV file with a title and description. File is stored on macServer.                  |
| 2 - DJ requests slot | DJ picks a preferred date/time for the recorded show to air. Submits the request.                      |
| 3 - Pending approval | Show record created with status='pending_approval'. File is stored but not queued yet.                 |
| 4 - Admin reviews    | Agustin can listen to the uploaded file from the admin panel before approving.                         |
| 5a - Approved        | Show status → 'scheduled'. Appears on public schedule. Liquidsoap will be triggered at broadcast time. |
| 5b - Rejected        | Show status → 'rejected'. File is kept on macServer but not queued. DJ notified.                       |
| 6 - Broadcast time   | node-cron job detects scheduled_start within 60 seconds, sends file path to Liquidsoap queue.          |

## **3.3 Show Status State Machine**

| **Status**       | **Meaning**                                                                         |
| ---------------- | ----------------------------------------------------------------------------------- |
| pending_approval | DJ has submitted request. Waiting for admin review. Not visible on public schedule. |
| scheduled        | Admin approved. On the public schedule. Will broadcast at scheduled_start.          |
| live             | A live show is currently broadcasting (Mixxx is connected to Icecast).              |
| broadcasting     | A recorded show is currently playing via Liquidsoap.                                |
| completed        | Show has ended normally.                                                            |
| rejected         | Admin rejected the request. DJ was notified with a reason.                          |
| cancelled        | Show was cancelled after approval - by DJ (their own show) or Admin (any show).     |

# **4\. Pages & Routes**

| **Route**        | **Who / Description**                                                                                                          |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| /                | Redirect → /dashboard if logged in, /login if not                                                                              |
| /login           | Google sign-in. Rejects non-UChicago emails and non-allowlisted users with distinct, clear messages.                           |
| /dashboard       | DJ home. Shows: pending show requests, upcoming approved shows, on-air status, quick actions.                                  |
| /shows/request   | Request a live show slot - title, description, preferred date/time, duration.                                                  |
| /shows/upload    | Upload a recorded show file and request a broadcast slot.                                                                      |
| /shows/\[id\]    | View a single show. DJ can edit title/desc or cancel if status is pending/scheduled. Admin can approve/reject/cancel any show. |
| /shows/history   | DJ's completed and cancelled shows.                                                                                            |
| /schedule        | Full weekly calendar. Shows approved/scheduled shows. Pending shows visible only to Admin and the requesting DJ.               |
| /admin           | Admin only. Tabs: Pending Approvals, DJ Allowlist, Fallback Playlist, Icecast Stats.                                           |
| /admin/allowlist | Add/remove emails. Promote/demote admins. See all DJs and their show counts.                                                   |
| /admin/approvals | Queue of all pending show requests. Approve or reject each with optional note.                                                 |

# **5\. Feature Requirements**

## **5.1 Authentication & Access Control**

| **ID**      | **Priority** | **Requirement**                                                                                                                                  |
| ----------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| **AUTH-01** | **P0**       | Google OAuth sign-in via NextAuth.js. Only Google provider - no email/password.                                                                  |
| **AUTH-02** | **P0**       | On sign-in, check email ends with @uchicago.edu. If not, reject with message: 'Yuen House Radio is a University of Chicago student platform.'    |
| **AUTH-03** | **P0**       | On sign-in, check email exists in dj_allowlist table. If not, reject with message: 'You don't have DJ access yet. Contact Agustin to be added.'  |
| **AUTH-04** | **P0**       | All routes except /login are protected. Unauthenticated requests redirect to /login.                                                             |
| **AUTH-05** | **P0**       | Admin-only routes (/admin/\*) return 403 for non-admin users. Do not redirect - show an explicit 'Access Denied' page.                           |
| **AUTH-06** | **P1**       | When an email is removed from the allowlist, the corresponding NextAuth session is invalidated. On their next page load, the user is logged out. |
| **AUTH-07** | **P1**       | Session persists for 30 days. DJs do not need to re-login every visit.                                                                           |

## **5.2 Admin - DJ Allowlist Management**

| **ID**       | **Priority** | **Requirement**                                                                                                                                             |
| ------------ | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ALLOW-01** | **P0**       | Admin can add a @uchicago.edu email to the allowlist. Input validates the email format and domain before saving.                                            |
| **ALLOW-02** | **P0**       | Admin can remove an email from the allowlist. Confirmation dialog before deletion.                                                                          |
| **ALLOW-03** | **P0**       | Admin can promote a DJ to Admin role. Admin can demote another Admin back to DJ (cannot demote themselves).                                                 |
| **ALLOW-04** | **P1**       | Allowlist page shows each DJ's display name (from their Google profile, populated on first login), email, role, date added, and total completed show count. |
| **ALLOW-05** | **P1**       | Admin can add an email before the person has ever logged in. When they first log in, their Google profile name is automatically filled in.                  |
| **ALLOW-06** | **P2**       | Bulk import - admin can paste a list of emails (comma or newline separated) to add multiple DJs at once.                                                    |

## **5.3 Admin - Show Approval Queue**

| **ID**      | **Priority** | **Requirement**                                                                                                                                    |
| ----------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| **APPR-01** | **P0**       | Admin panel shows count badge of pending approvals. Visible at all times when logged in as admin.                                                  |
| **APPR-02** | **P0**       | Approval queue shows: DJ name, show title, description, requested date/time, duration, show type (live/recorded).                                  |
| **APPR-03** | **P0**       | Admin can approve a pending show. Status → 'scheduled'. Show appears on public schedule.                                                           |
| **APPR-04** | **P0**       | Admin can reject a pending show with a required reason note. Status → 'rejected'. DJ is notified.                                                  |
| **APPR-05** | **P1**       | For recorded shows, admin can play the uploaded audio file directly from the approval queue before deciding.                                       |
| **APPR-06** | **P1**       | Admin can approve with a time change - override the DJ's requested slot with a different date/time, shown clearly to the DJ in their notification. |
| **APPR-07** | **P2**       | Email notification to DJ on approval or rejection, including the admin's note if rejected.                                                         |

## **5.4 DJ - Show Request (Live Show)**

| **ID**      | **Priority** | **Requirement**                                                                                                                                                                              |
| ----------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **LIVE-01** | **P0**       | DJ can submit a live show request: title (required), description (optional), preferred date (required), start time (required), duration in minutes (required, 30-180 min).                   |
| **LIVE-02** | **P0**       | On submit, show record created with status='pending_approval'. Confirmation message tells DJ the request is awaiting admin approval.                                                         |
| **LIVE-03** | **P0**       | Conflict check on submit: if the requested slot overlaps an already-approved show, reject with clear error before saving.                                                                    |
| **LIVE-04** | **P1**       | DJ can cancel their own pending or approved show before it airs. Admin is notified if an approved show is cancelled.                                                                         |
| **LIVE-05** | **P1**       | Once approved, DJ sees their Mixxx broadcast settings on the show detail page: server address, port, mount point, source password. These are the exact values to enter in Mixxx Preferences. |
| **LIVE-06** | **P2**       | DJ can request a recurring weekly slot (e.g. every Thursday 8-10pm). Each recurrence is created as a separate show request, all pending approval together.                                   |

## **5.5 DJ - Recorded Show Upload & Request**

| **ID**     | **Priority** | **Requirement**                                                                                                                                                                      |
| ---------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **REC-01** | **P0**       | DJ can upload an audio file (MP3, WAV, FLAC, AAC, OGG). Max size: 500MB. Upload goes to /srv/radio/uploads/ on macServer.                                                            |
| **REC-02** | **P0**       | After upload, DJ fills in: title, description, preferred broadcast date/time. Submits as a show request (status='pending_approval').                                                 |
| **REC-03** | **P0**       | File is stored on macServer regardless of approval status. Admin can play it during review. File is deleted only if show is rejected and DJ confirms deletion, or by admin manually. |
| **REC-04** | **P1**       | Upload progress bar. Files can be large - use chunked/multipart upload, not a standard form POST.                                                                                    |
| **REC-05** | **P1**       | Auto-detect audio duration from uploaded file using ffprobe. Pre-fill the duration field. Show error if file is corrupt or unreadable.                                               |
| **REC-06** | **P2**       | DJ can manage their uploaded files in a library view - see file name, duration, upload date, and which show it is attached to.                                                       |

## **5.6 Dashboard Home**

| **ID**      | **Priority** | **Requirement**                                                                                                                                                                          |
| ----------- | ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **DASH-01** | **P0**       | On Air Now panel - shows current broadcast status from Icecast: show title, DJ name, type (Live / Recorded / Automated), duration running. Updates every 30 seconds without page reload. |
| **DASH-02** | **P0**       | DJ's upcoming approved shows - next 5 scheduled shows with date, time, type badge.                                                                                                       |
| **DASH-03** | **P1**       | DJ's pending requests - shows awaiting admin approval with a 'Pending' badge. DJ can cancel from here.                                                                                   |
| **DASH-04** | **P1**       | Live listener count pulled from Icecast stats API. Refreshes every 30 seconds.                                                                                                           |
| **DASH-05** | **P1**       | Quick action buttons: 'Request a Live Show', 'Upload Recorded Show', 'View Schedule'.                                                                                                    |
| **DASH-06** | **P2**       | Admin sees the pending approval count prominently on their dashboard home as a call-to-action.                                                                                           |

## **5.7 Schedule / Calendar**

| **ID**       | **Priority** | **Requirement**                                                                                                                                |
| ------------ | ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| **SCHED-01** | **P0**       | Weekly calendar view. Approved/scheduled shows visible to all logged-in DJs. Shows: DJ name, show title, type badge (Live/Recorded/Automated). |
| **SCHED-02** | **P0**       | Pending shows visible ONLY to: the DJ who requested them (with a 'Pending' style), and Admin (with a 'Pending' badge).                         |
| **SCHED-03** | **P0**       | Week navigation - previous/next week. Default is current week.                                                                                 |
| **SCHED-04** | **P1**       | Empty time slots labeled 'Automated' so DJs know what listeners hear during unclaimed hours.                                                   |
| **SCHED-05** | **P1**       | Clicking an empty slot opens the 'Request a Show' form pre-filled with that date and time.                                                     |
| **SCHED-06** | **P1**       | DJ can click their own approved shows to edit title/description. Edits do not require re-approval.                                             |

# **6\. Database Schema**

SQLite via Prisma ORM. Database file stored at /srv/radio/db/dashboard.db on macServer. SQLite is appropriate here - this is a single-machine, low-concurrency app. Zero server setup, easy to back up (one file), no cost.

## **6.1 dj_allowlist**

The source of truth for who can access the dashboard. Admin manages this directly.

| **Column**   | **Type** | **Nullable** | **Description**                                         |
| ------------ | -------- | ------------ | ------------------------------------------------------- |
| email        | String   | NO           | Primary key. Must be @uchicago.edu. Added by admin.     |
| isAdmin      | Boolean  | NO           | Default false. True = full admin capabilities.          |
| displayName  | String   | YES          | Populated from Google profile on first login. Editable. |
| addedAt      | DateTime | NO           | When admin added this email to the list.                |
| addedByEmail | String   | NO           | Which admin added this person.                          |
| firstLoginAt | DateTime | YES          | Null until the person first logs in.                    |
| lastLoginAt  | DateTime | YES          | Updated on each login.                                  |
| showCount    | Int      | NO           | Denormalized count of completed shows.                  |

## **6.2 shows**

| **Column**          | **Type**      | **Nullable** | **Description**                                                                             |
| ------------------- | ------------- | ------------ | ------------------------------------------------------------------------------------------- |
| id                  | String (UUID) | NO           | Primary key, auto-generated.                                                                |
| djEmail             | String        | NO           | FK → dj_allowlist.email. The requesting DJ.                                                 |
| djName              | String        | NO           | Snapshot of DJ display name at request time.                                                |
| title               | String        | NO           | Show title.                                                                                 |
| description         | String        | YES          | Optional show description or episode notes.                                                 |
| showType            | Enum          | NO           | LIVE \| RECORDED \| AUTOMATED                                                               |
| status              | Enum          | NO           | PENDING_APPROVAL \| SCHEDULED \| LIVE \| BROADCASTING \| COMPLETED \| REJECTED \| CANCELLED |
| scheduledStart      | DateTime      | NO           | Requested/approved broadcast start time.                                                    |
| scheduledEnd        | DateTime      | NO           | Requested/approved broadcast end time.                                                      |
| audioFilePath       | String        | YES          | Absolute path on macServer. Null for live shows.                                            |
| audioDurationSec    | Int           | YES          | Duration in seconds, auto-detected from file.                                               |
| liquidsoapRequestId | String        | YES          | ID returned by Liquidsoap when file is queued.                                              |
| adminNote           | String        | YES          | Admin's note on approval or rejection.                                                      |
| approvedByEmail     | String        | YES          | Which admin approved/rejected this show.                                                    |
| approvedAt          | DateTime      | YES          | When admin acted on the request.                                                            |
| createdAt           | DateTime      | NO           | Auto-set on record creation.                                                                |
| updatedAt           | DateTime      | NO           | Auto-updated on any change.                                                                 |

## **6.3 Prisma Schema**

// prisma/schema.prisma

datasource db {

provider = "sqlite"

url = "file:/srv/radio/db/dashboard.db"

}

generator client {

provider = "prisma-client-js"

}

model DJAllowlist {

email String @id

isAdmin Boolean @default(false)

displayName String?

addedAt DateTime @default(now())

addedByEmail String

firstLoginAt DateTime?

lastLoginAt DateTime?

showCount Int @default(0)

shows Show\[\] @relation("DJShows")

}

model Show {

id String @id @default(uuid())

djEmail String

djName String

title String

description String?

showType ShowType

status ShowStatus @default(PENDING_APPROVAL)

scheduledStart DateTime

scheduledEnd DateTime

audioFilePath String?

audioDurationSec Int?

liquidsoapRequestId String?

adminNote String?

approvedByEmail String?

approvedAt DateTime?

createdAt DateTime @default(now())

updatedAt DateTime @updatedAt

dj DJAllowlist @relation("DJShows", fields: \[djEmail\], references: \[email\])

}

enum ShowType {

LIVE

RECORDED

AUTOMATED

}

enum ShowStatus {

PENDING_APPROVAL

SCHEDULED

LIVE

BROADCASTING

COMPLETED

REJECTED

CANCELLED

}

# **7\. NextAuth Configuration**

The signIn callback enforces both checks - domain and allowlist - before granting access.

// lib/auth.ts

import NextAuth from 'next-auth'

import Google from 'next-auth/providers/google'

import { prisma } from './prisma'

export const { handlers, signIn, signOut, auth } = NextAuth({

providers: \[Google\],

callbacks: {

async signIn({ profile }) {

const email = profile?.email ?? ''

// Check 1: must be UChicago email

if (!email.endsWith('@uchicago.edu')) return false

// Check 2: must be on the allowlist

const dj = await prisma.dJAllowlist.findUnique({

where: { email }

})

if (!dj) return '/login?error=not_allowlisted'

// Update login timestamps and display name

await prisma.dJAllowlist.update({

where: { email },

data: {

lastLoginAt: new Date(),

firstLoginAt: dj.firstLoginAt ?? new Date(),

displayName: dj.displayName ?? profile?.name ?? email,

}

})

return true

},

async session({ session }) {

// Attach isAdmin to the session so UI can gate admin routes

const dj = await prisma.dJAllowlist.findUnique({

where: { email: session.user.email }

})

session.user.isAdmin = dj?.isAdmin ?? false

return session

}

}

})

Login page error handling - distinct messages for each rejection reason:

// app/login/page.tsx - read the error query param

// ?error=OAuthCallback (default NextAuth error when signIn returns false)

// → 'This platform is for University of Chicago students only.'

// ?error=not_allowlisted (our custom redirect)

// → 'You don't have DJ access yet. Reach out to Agustin to be added.'

# **8\. API Routes**

All routes require authentication unless marked PUBLIC. Admin-only routes return 403 for non-admin authenticated users.

| **Method** | **Route**                           | **Description**                                                                                      |
| ---------- | ----------------------------------- | ---------------------------------------------------------------------------------------------------- |
| **GET**    | /api/shows                          | DJ: their own shows. Admin: all shows. Supports ?status= filter.                                     |
| **POST**   | /api/shows                          | Create a show request. Status auto-set to PENDING_APPROVAL.                                          |
| **GET**    | /api/shows/\[id\]                   | Single show. DJ can only fetch their own. Admin can fetch any.                                       |
| **PATCH**  | /api/shows/\[id\]                   | Edit title/description (DJ, own shows). Or approve/reject/cancel (Admin, any show).                  |
| **DELETE** | /api/shows/\[id\]                   | Cancel a show. DJ can cancel pending/scheduled own shows. Admin can cancel any.                      |
| **POST**   | /api/shows/upload                   | Multipart file upload. Saves to /srv/radio/uploads/. Returns path + duration.                        |
| **GET**    | /api/schedule                       | PUBLIC - no auth. Returns approved/scheduled shows for next 14 days. Used by yuenhouse.org/radio.    |
| **GET**    | /api/admin/allowlist                | Admin only. Returns full DJ allowlist with stats.                                                    |
| **POST**   | /api/admin/allowlist                | Admin only. Add an email to the allowlist.                                                           |
| **DELETE** | /api/admin/allowlist/\[email\]      | Admin only. Remove an email. Invalidates their session.                                              |
| **PATCH**  | /api/admin/allowlist/\[email\]      | Admin only. Toggle isAdmin for a DJ.                                                                 |
| **GET**    | /api/admin/approvals                | Admin only. Returns all PENDING_APPROVAL shows.                                                      |
| **POST**   | /api/admin/approvals/\[id\]/approve | Admin only. Approve a show. Optional body: { scheduledStart, scheduledEnd, note }.                   |
| **POST**   | /api/admin/approvals/\[id\]/reject  | Admin only. Reject a show. Required body: { note }.                                                  |
| **GET**    | /api/icecast/status                 | Fetches Icecast stats from localhost:8000. Returns: listener_count, source_connected, current_title. |
| **POST**   | /api/liquidsoap/queue               | Admin only. Manually queue a show file in Liquidsoap immediately.                                    |

# **9\. Tech Stack**

| **Framework**            | Next.js 14+ App Router - TypeScript throughout                                 |
| ------------------------ | ------------------------------------------------------------------------------ |
| **Auth**                 | NextAuth.js v5 - Google OAuth provider only                                    |
| **Database**             | SQLite via Prisma ORM - /srv/radio/db/dashboard.db on macServer                |
| **Styling**              | Tailwind CSS - consistent with yuenhouse.org aesthetic                         |
| **File storage**         | Local macServer filesystem - /srv/radio/uploads/ and /srv/radio/archive/       |
| **Background scheduler** | node-cron - checks every minute for shows starting within 60 seconds           |
| **Liquidsoap bridge**    | Node.js net.Socket - connects to Liquidsoap telnet on localhost:1234           |
| **Audio detection**      | ffprobe (via ffmpeg) - detects duration of uploaded audio files on macServer   |
| **Process manager**      | PM2 - 24/7 uptime, auto-restart on crash, boot auto-start                      |
| **Reverse proxy**        | Caddy - HTTPS via auto Let's Encrypt, routes dj.yuenhouse.org → localhost:3001 |

## **9.1 Project File Structure**

yuen-house-dj/ ← built on your laptop, deployed to macServer

├── app/

│ ├── login/ ← /login with custom error messages

│ ├── dashboard/ ← DJ home

│ ├── schedule/ ← weekly calendar

│ ├── shows/

│ │ ├── request/ ← request a live show slot

│ │ ├── upload/ ← upload recorded show

│ │ ├── history/ ← completed shows

│ │ └── \[id\]/ ← show detail / edit

│ ├── admin/

│ │ ├── allowlist/ ← manage DJ access

│ │ ├── approvals/ ← pending show requests

│ │ └── stats/ ← Icecast stats

│ └── api/

│ ├── auth/\[...nextauth\]/

│ ├── shows/

│ │ ├── route.ts

│ │ ├── upload/route.ts

│ │ └── \[id\]/route.ts

│ ├── schedule/route.ts ← PUBLIC endpoint for Vercel listener app

│ ├── admin/

│ │ ├── allowlist/

│ │ └── approvals/

│ └── icecast/status/route.ts

├── components/

│ ├── OnAirPanel.tsx

│ ├── ScheduleCalendar.tsx

│ ├── ShowRequestForm.tsx

│ ├── UploadProgress.tsx

│ ├── AllowlistManager.tsx

│ └── ApprovalQueue.tsx

├── lib/

│ ├── auth.ts ← NextAuth config with allowlist check

│ ├── prisma.ts ← Prisma client singleton

│ ├── icecast.ts ← Icecast stats fetcher

│ ├── liquidsoap.ts ← Liquidsoap socket bridge

│ └── scheduler.ts ← node-cron broadcast trigger

├── prisma/schema.prisma

├── .env.local ← never commit

└── package.json

## **9.2 Environment Variables**

\# .env.local - do NOT commit this file

NEXTAUTH_URL=<https://dj.yuenhouse.org>

NEXTAUTH_SECRET=your_random_32_char_secret_here

GOOGLE_CLIENT_ID=from_google_cloud_console

GOOGLE_CLIENT_SECRET=from_google_cloud_console

ICECAST_HOST=localhost

ICECAST_PORT=8000

ICECAST_ADMIN_PASSWORD=your_icecast_admin_password

ICECAST_SOURCE_PASSWORD=your_icecast_source_password

LIQUIDSOAP_HOST=localhost

LIQUIDSOAP_PORT=1234

UPLOADS_DIR=/srv/radio/uploads

ARCHIVE_DIR=/srv/radio/archive

FALLBACK_DIR=/srv/radio/fallback

# **10\. Deployment to macServer**

## **10.1 One-Time Setup on macServer**

\# Install Homebrew

/bin/bash -c "\$(curl -fsSL <https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh>)"

\# Install dependencies

brew install node icecast liquidsoap ffmpeg caddy git

npm install -g pm2

\# Create directory structure

sudo mkdir -p /srv/radio/db /srv/radio/uploads /srv/radio/archive /srv/radio/fallback

sudo chown -R \$(whoami) /srv/radio

## **10.2 First Deploy**

cd /srv/radio

git clone <https://github.com/your-org/yuen-house-dj.git> app

cd app

cp .env.example .env.local # fill in all values

npm install

npx prisma db push # creates the SQLite database

npm run build

\# Seed the database: add yourself as the first admin

npx prisma studio # use the GUI, or run a seed script

\# INSERT INTO DJAllowlist (email, isAdmin, addedByEmail)

\# VALUES ('<your@uchicago.edu>', true, '<your@uchicago.edu>')

\# Start the Next.js app on port 3001

pm2 start npm --name 'radio-dj' -- start -- -p 3001

pm2 save

pm2 startup # follow the printed command to enable boot auto-start

## **10.3 Caddy Config**

\# /etc/caddy/Caddyfile

dj.yuenhouse.org {

reverse_proxy localhost:3001

}

radio.yuenhouse.org {

reverse_proxy localhost:8000

}

\# Caddy provisions SSL via Let's Encrypt automatically.

\# MacBook must be reachable on ports 80 and 443 from the internet.

\# Set up router port forwarding before first deploy.

## **10.4 Subsequent Deploys**

cd /srv/radio/app

git pull origin main

npm install

npx prisma db push # only if schema changed

npm run build

pm2 restart radio-dj

# **11\. Acceptance Criteria Checklist**

| **Feature**          | **Done when...**                                                                                              |
| -------------------- | ------------------------------------------------------------------------------------------------------------- |
| UChicago-only gate   | A gmail.com login is rejected. A @uchicago.edu login not on allowlist gets the 'contact Agustin' message.     |
| Allowlist gate       | Only emails Agustin has added can log in. Removing an email blocks that person on next page load.             |
| Admin adds DJ        | Agustin adds an email from /admin/allowlist. That person can now log in.                                      |
| DJ requests show     | DJ submits a show request. It appears in Agustin's approval queue. It does NOT appear on the public schedule. |
| Admin approves show  | Agustin approves the request. Show appears on public /api/schedule. DJ is notified.                           |
| Admin rejects show   | Agustin rejects with a note. Show status → rejected. DJ sees the reason.                                      |
| Conflict detection   | Two shows cannot occupy overlapping slots. Conflict caught at request submission.                             |
| Recorded show upload | DJ uploads an MP3. File saved to /srv/radio/uploads/. Admin can play it before approving.                     |
| Liquidsoap queue     | At scheduled time (±1 min), cron job queues the recorded file. Liquidsoap plays it.                           |
| Public schedule API  | GET /api/schedule (no auth) returns upcoming approved shows. Consumed by yuenhouse.org/radio.                 |
| On Air panel         | Dashboard shows live Icecast status updating every 30 seconds.                                                |
| macServer deploy     | App runs on macServer via PM2. dj.yuenhouse.org accessible over HTTPS.                                        |

_DJ Dashboard Technical Requirements v2.0 - Yuen House Radio - February 2026_
