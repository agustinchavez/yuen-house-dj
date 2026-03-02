# Yuen House Radio DJ Dashboard — End-to-End Testing Guide

## Prerequisites

1. Run the database migration and seed:
   ```bash
   npx prisma migrate dev
   npx tsx prisma/seed.ts
   ```
2. Start the dev server:
   ```bash
   npm run dev
   ```
3. Open http://localhost:3000

The seed creates an admin account:
- **Email:** agustinchavez@uchicago.edu
- **Password:** admin123

---

## 1. Authentication & Access Control

### 1.1 Login (AUTH-01 through AUTH-04)
- [ ] Visit `/` — redirects to `/login`
- [ ] Enter invalid credentials — see error "Invalid email or password"
- [ ] Log in with `agustinchavez@uchicago.edu` / `admin123` — redirects to `/dashboard`
- [ ] Session persists: close and reopen the tab, still logged in (AUTH-07, 30-day JWT)

### 1.2 Session Invalidation (AUTH-06)
- [ ] Log in as a DJ (create one first via admin)
- [ ] In a separate browser/incognito, log in as admin and **remove** that DJ from the allowlist
- [ ] Back in the DJ's browser, refresh any page — they should be logged out / redirected to `/login`

### 1.3 Protected Routes (AUTH-04, AUTH-05)
- [ ] While logged out, visit `/dashboard` — redirects to `/login`
- [ ] Log in as a non-admin DJ, visit `/admin` — see "Access Denied" message
- [ ] Visit `/admin/allowlist` — see "Admin access required" error
- [ ] Visit `/admin/approvals` — see "Admin access required" error

---

## 2. Admin — DJ Allowlist Management

### 2.1 Add a Single DJ (ALLOW-01, ALLOW-02, ALLOW-05)
- [ ] Go to `/admin/allowlist`
- [ ] Fill in Email, Password, optional Display Name → click "Add DJ"
- [ ] New DJ appears in the list below
- [ ] Try adding the same email again — see "Email is already on the allowlist" error

### 2.2 Bulk Import (ALLOW-06)
- [ ] On `/admin/allowlist`, click "Show Bulk Import"
- [ ] Paste multiple emails (comma or newline separated), enter a shared password
- [ ] Click "Import All" — see summary "Added X, skipped Y out of Z emails"
- [ ] All new emails appear in the DJ list

### 2.3 Promote / Demote (ALLOW-03)
- [ ] Click "Promote" on a DJ → confirm dialog → DJ now shows "Admin" badge
- [ ] Click "Demote" on that DJ → confirm → badge removed
- [ ] Try to demote yourself → see "Cannot change your own admin status" error

### 2.4 Reset Password
- [ ] Click "Reset PW" on a DJ → inline input expands
- [ ] Enter a new password (min 6 chars) → click "Save"
- [ ] Input collapses, no error
- [ ] Log out, log in as that DJ with the new password — works

### 2.5 Remove DJ (ALLOW-02)
- [ ] Click "Remove" on a DJ → confirm dialog → DJ disappears from list
- [ ] Try to remove yourself → see error "Cannot remove yourself from the allowlist"

---

## 3. Show Request & Approval Workflow

### 3.1 Request a Live Show (LIVE-01 through LIVE-03)
- [ ] Go to `/shows/request`
- [ ] Fill in title, pick a date from the calendar, pick a time slot, set duration
- [ ] Click "Submit Request" → redirects to `/dashboard`
- [ ] On dashboard, the show appears under "Pending Requests" with a Pending badge
- [ ] Submit another request for the **same time slot** of an already-approved show → see conflict error

### 3.2 Recurring Weekly Request (LIVE-06)
- [ ] On `/shows/request`, select "Every week for 4 weeks" from the repeat dropdown
- [ ] Submit → redirects to dashboard
- [ ] Check `/admin/approvals` (as admin) — 4 separate pending requests appear, titled "Show Title (Week 1)" through "(Week 4)"

### 3.3 Pre-filled Request from Schedule (SCHED-05)
- [ ] Go to `/schedule`
- [ ] Click "Automated · Request slot" on an empty day
- [ ] Confirm you land on `/shows/request` with the calendar pre-filled to that date

### 3.4 Upload a Recorded Show (REC-01 through REC-05)
- [ ] Go to `/shows/upload`
- [ ] Select an audio file (MP3, WAV, etc.)
- [ ] Watch the progress bar fill up with percentage (REC-04)
- [ ] After upload completes, see "Uploaded successfully!" and detected duration (if ffprobe is installed)
- [ ] Fill in title, pick date/time, click "Submit Request"
- [ ] Redirects to dashboard

### 3.5 Admin Approves a Show (APPR-01 through APPR-06)
- [ ] Go to `/admin/approvals`
- [ ] See pending requests with DJ name, title, date/time, type badge (LIVE or RECORDED)
- [ ] For a RECORDED show, see the audio player — click play to preview (APPR-05)
- [ ] Click "Approve" → show disappears from the queue
- [ ] Check `/schedule` — the approved show now appears on the correct day

### 3.6 Admin Rejects a Show (APPR-04)
- [ ] On `/admin/approvals`, enter a rejection reason in the text field
- [ ] Click "Reject" → show disappears from the queue
- [ ] Log in as the DJ, go to `/shows/history` — rejected show appears with the admin's note

### 3.7 Admin Auto-Approve (Section 3.1 spec)
- [ ] While logged in as admin, go to `/shows/request` and submit a show
- [ ] Check `/schedule` — the show appears immediately as SCHEDULED (no pending state)

### 3.8 Email Notifications (APPR-07)
- [ ] **Only if SMTP is configured** in `.env.local`: approve or reject a show
- [ ] Check the DJ's email inbox for the notification
- [ ] If SMTP is not configured, emails are silently skipped (no errors)

---

## 4. Show Management

### 4.1 View Show Detail
- [ ] Click any show from the dashboard or schedule → lands on `/shows/[id]`
- [ ] See full show details: title, description, DJ, status, times

### 4.2 Edit Own Show (SCHED-06)
- [ ] As a DJ, click your own pending/scheduled show
- [ ] Edit title and/or description → save
- [ ] Changes reflect immediately

### 4.3 Cancel a Show (LIVE-04)
- [ ] As a DJ, cancel a pending or scheduled show from the show detail page
- [ ] Show status changes to CANCELLED
- [ ] Show no longer appears on the schedule

### 4.4 Mixxx Broadcast Settings (LIVE-05)
- [ ] As a DJ, view an approved LIVE show detail page
- [ ] See Icecast connection details: server, port, mount point, source password

---

## 5. Schedule Calendar

### 5.1 Weekly Navigation (SCHED-03)
- [ ] Go to `/schedule`
- [ ] Click "Prev" and "Next" to navigate weeks
- [ ] Date range updates in the header

### 5.2 Show Visibility (SCHED-01, SCHED-02)
- [ ] Approved shows visible to all DJs with type badges (Live = green, Recorded = blue)
- [ ] Pending shows visible only to the requesting DJ (dashed amber border) and to admins
- [ ] Other DJs do NOT see each other's pending requests

### 5.3 Automated Labels (SCHED-04)
- [ ] Days with no shows display "Automated · Request slot" in subtle styling

---

## 6. DJ File Library (REC-06)

- [ ] Go to `/shows/library` (or click "My Uploads" in the navbar)
- [ ] See all your uploaded recordings: title, status badge, duration, upload date, scheduled date
- [ ] Audio player inline — click play to listen
- [ ] Click show title → navigates to show detail page
- [ ] "Upload New" button links to `/shows/upload`

---

## 7. Dashboard (DASH-01 through DASH-06)

- [ ] **On Air Panel** (DASH-01, DASH-04): shows current Icecast status (if Icecast is running), auto-refreshes every 30 seconds. If Icecast is not running, shows "Off Air" gracefully.
- [ ] **Upcoming Shows** (DASH-02): lists next 5 scheduled shows with date, time, type badge
- [ ] **Pending Requests** (DASH-03): shows awaiting admin approval with Pending badge
- [ ] **Quick Actions** (DASH-05): buttons for "Request a Live Show", "Upload Recorded Show", "View Schedule"
- [ ] **Admin Pending Count** (DASH-06): admin sees pending approval count badge prominently

---

## 8. Settings

### 8.1 Change Password
- [ ] Go to `/settings`
- [ ] Enter current password, new password, confirm new password
- [ ] Click "Change Password" → see "Password changed successfully"
- [ ] Sign out, sign back in with the new password — works
- [ ] Try with wrong current password → see "Current password is incorrect"
- [ ] Try with mismatched new passwords → see "New passwords do not match"

---

## 9. Navigation

- [ ] NavBar shows: Dashboard, Schedule, Request Show, Upload, My Uploads, History, Settings
- [ ] Admin sees additional "Admin" link
- [ ] Active page is highlighted in the navbar
- [ ] "Sign out" button logs you out and redirects to `/login`
- [ ] "Yuen House Radio" logo links to `/dashboard`

---

## 10. Public Schedule API

- [ ] `GET /api/schedule` — **no auth required**
- [ ] Returns JSON array of approved shows for the next 14 days
- [ ] Pending/rejected/cancelled shows are NOT included
- [ ] This endpoint is consumed by the separate listener app at yuenhouse.org/radio

```bash
curl http://localhost:3000/api/schedule | jq
```

---

## 11. Icecast & Liquidsoap Integration

> These require Icecast and Liquidsoap to be running on macServer.

### 11.1 Icecast Status
- [ ] Dashboard On Air panel fetches from `/api/icecast/status`
- [ ] Shows listener count, source status, and current title

### 11.2 Liquidsoap Queue
- [ ] Admin can manually queue a file: `POST /api/liquidsoap/queue` with `{ filePath: "..." }`
- [ ] The node-cron scheduler (lib/scheduler.ts) automatically queues recorded shows within 60 seconds of their scheduled start

---

## 12. Build & Deploy Verification

```bash
# Clean build with no errors
npm run build

# Expected: 29 routes, all compile successfully
# Look for: ✓ Compiled successfully
# Look for: ✓ Generating static pages
```

---

## Quick Smoke Test Checklist

For a fast sanity check, run through these 10 steps:

1. `npm run dev` → open http://localhost:3000
2. Log in as admin
3. Add a DJ via `/admin/allowlist`
4. Log out, log in as the new DJ
5. Request a live show via `/shows/request`
6. Log out, log in as admin
7. Approve the show via `/admin/approvals`
8. Check `/schedule` — show appears
9. DJ changes password via `/settings`
10. DJ logs out, logs back in with new password
