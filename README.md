# 🩸 BloodLink — Complete Setup Guide

> Real-time blood donation matching platform. Hospitals post requests → eligible donors are auto-called via Twilio voice call → donors confirm on the website → hospital sees a live "Donor Found" popup.

---

## Table of Contents

1. [Project Structure](#project-structure)
2. [Tech Stack](#tech-stack)
3. [Step 1 — Install Prerequisites](#step-1--install-prerequisites)
4. [Step 2 — Set Up Supabase](#step-2--set-up-supabase)
5. [Step 3 — Set Up Twilio](#step-3--set-up-twilio)
6. [Step 4 — Configure Environment Variables](#step-4--configure-environment-variables)
7. [Step 5 — Deploy the Edge Function](#step-5--deploy-the-edge-function)
8. [Step 6 — Run the App](#step-6--run-the-app)
9. [How the Full Flow Works](#how-the-full-flow-works)
10. [Troubleshooting](#troubleshooting)

---

## Project Structure

```
bloodlink/
├── src/
│   ├── components/
│   │   ├── donor/
│   │   │   ├── ActiveRequestsTab.jsx   # "I'm Ready" button + real-time updates
│   │   │   ├── HistoryTab.jsx          # Donor donation history + stats
│   │   │   └── ProfileTab.jsx          # Donor profile + availability toggle
│   │   ├── hospital/
│   │   │   ├── BloodRequestTab.jsx     # "Need Blood" form + Twilio call trigger
│   │   │   ├── HospitalProfileTab.jsx  # Hospital profile editor
│   │   │   └── RequestHistoryTab.jsx   # Hospital request history + call logs
│   │   ├── notifications/
│   │   │   ├── NotificationBell.jsx    # Real-time bell icon in navbar (donors)
│   │   │   ├── DonorFoundModal.jsx     # Popup when donor confirms (hospitals)
│   │   │   └── AlreadyClaimedToast.jsx # Toast when another donor got there first
│   │   ├── Navbar.jsx
│   │   └── ProtectedRoute.jsx
│   ├── context/
│   │   └── AuthContext.jsx             # Auth state, role detection
│   ├── lib/
│   │   └── supabase.js                 # Supabase client
│   ├── pages/
│   │   ├── Home.jsx
│   │   ├── Login.jsx
│   │   ├── Register.jsx
│   │   ├── DonorDashboard.jsx
│   │   └── HospitalDashboard.jsx
│   ├── App.jsx
│   └── main.jsx
├── backend/
│   ├── supabase/
│   │   └── functions/
│   │       └── trigger-calls/
│   │           └── index.ts            # Supabase Edge Function (calls Twilio)
│   ├── supabase_schema_module3_additions.sql
│   └── MODULE3_SETUP.md
├── supabase_schema.sql                 # Run this FIRST in Supabase SQL Editor
├── .env.example                        # Copy this to .env and fill in your keys
├── package.json
├── vite.config.js
└── index.html
```

---

## Tech Stack

| Layer     | Technology |
|-----------|-----------|
| Frontend  | React 18 + Vite |
| Styling   | Plain CSS with CSS variables |
| Backend   | Supabase (PostgreSQL + Auth + Realtime + Edge Functions) |
| Voice Calls | Twilio Programmable Voice |
| Routing   | React Router v6 |
| Toasts    | react-hot-toast |

---

## Step 1 — Install Prerequisites

Make sure you have these installed on your laptop:

```bash
# Check Node.js version (need 18 or higher)
node --version

# If not installed, download from https://nodejs.org
```

```bash
# Install Supabase CLI globally
npm install -g supabase

# Verify it's installed
supabase --version
```

---

## Step 2 — Set Up Supabase

### 2a. Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and sign in (free account is fine)
2. Click **New Project**
3. Fill in:
   - **Name:** BloodLink (or anything you like)
   - **Database Password:** choose a strong password (save it!)
   - **Region:** choose the closest to you (e.g. South Asia)
4. Click **Create new project** and wait ~2 minutes for it to start

### 2b. Get Your API Keys

Once your project is ready:

1. In your Supabase project, go to **Settings → API**
2. Copy these two values — you'll need them in Step 4:
   - **Project URL** (looks like `https://abcdefgh.supabase.co`)
   - **anon / public key** (a long string starting with `eyJ...`)

### 2c. Run the Database Schema

1. In your Supabase project, click **SQL Editor** in the left sidebar
2. Click **New Query**
3. Open the file `supabase_schema.sql` from this project folder
4. Copy the entire contents and paste into the SQL Editor
5. Click **Run** (green button)
6. You should see: `Success. No rows returned`

> ✅ This creates 5 tables: `donors`, `hospitals`, `blood_requests`, `call_logs`, `donation_history` — plus all security rules and realtime settings.

### 2d. Enable Email Auth (already on by default)

1. Go to **Authentication → Providers**
2. Make sure **Email** is enabled (it is by default)
3. For easy testing, go to **Authentication → Settings** and turn OFF **"Enable email confirmations"** — this lets you log in without verifying your email during the hackathon

---

## Step 3 — Set Up Twilio

Twilio is the service that makes the voice calls to donors.

### 3a. Create a Twilio Account

1. Go to [https://www.twilio.com](https://www.twilio.com) and sign up for a free account
2. Verify your phone number during signup

### 3b. Get a Twilio Phone Number

1. From the Twilio Console homepage, click **Get a trial phone number**
2. Note down this number (e.g. `+15551234567`) — this is your `TWILIO_FROM_NUMBER`

### 3c. Note Down Your Credentials

From the [Twilio Console](https://console.twilio.com):
- **Account SID** — shown on the homepage (starts with `AC...`)
- **Auth Token** — shown on the homepage (click the eye icon to reveal)

### 3d. Verify Donor Phone Numbers (Trial Accounts Only)

> ⚠️ On Twilio's free trial, you can only call phone numbers you have verified.

For every donor phone number you want to test calls with:
1. Go to **Twilio Console → Phone Numbers → Verified Caller IDs**
2. Click **Add a new Caller ID**
3. Enter the donor's phone number and verify it via SMS/call

> 💡 Once you upgrade your Twilio account (even just $10 credit), this restriction is removed and you can call any number.

---

## Step 4 — Configure Environment Variables

1. In the project folder, find the file `.env.example`
2. Make a copy of it and name it `.env`:
   ```bash
   cp .env.example .env
   ```
3. Open `.env` in any text editor and fill in your values:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5...
```

> ⚠️ The `.env` file must be in the root of the project folder (same level as `package.json`).
> ⚠️ Never share or upload your `.env` file to GitHub. It's already in `.gitignore`.

**Twilio keys do NOT go in `.env`** — they go into Supabase Secrets (next step). This keeps them secure on the server side.

---

## Step 5 — Deploy the Edge Function

The Edge Function is a server-side piece of code that receives a call request from the frontend and uses Twilio to call the donor. It runs on Supabase's servers so your Twilio keys stay private.

### 5a. Log In to Supabase CLI

```bash
supabase login
```

This opens a browser window — sign in with your Supabase account.

### 5b. Find Your Project Reference ID

1. In Supabase Dashboard, go to **Settings → General**
2. Copy your **Reference ID** (looks like `abcdefghijklmnop`)

### 5c. Link Your Project

```bash
# Run this inside the bloodlink project folder
supabase link --project-ref YOUR_REFERENCE_ID_HERE
```

### 5d. Copy the Edge Function Into Place

```bash
# Run from inside the bloodlink project folder
mkdir -p supabase/functions/trigger-calls
cp backend/supabase/functions/trigger-calls/index.ts supabase/functions/trigger-calls/index.ts
```

### 5e. Set Your Twilio Secrets

```bash
supabase secrets set TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
supabase secrets set TWILIO_AUTH_TOKEN=your_auth_token_here
supabase secrets set TWILIO_FROM_NUMBER=+15551234567
```

Replace the values with your actual Twilio credentials from Step 3.

### 5f. Deploy the Function

```bash
supabase functions deploy trigger-calls
```

You should see output ending with: `✅ Done: trigger-calls`

> If you get a Deno error, make sure you have the latest Supabase CLI: `npm install -g supabase`

---

## Step 6 — Run the App

```bash
# Install all npm packages (only needed once)
npm install

# Start the development server
npm run dev
```

Open your browser and go to: **http://localhost:5173**

---

## How the Full Flow Works

```
1. DONOR registers
   → Enters: name, DOB, blood group, phone, pincode, city

2. HOSPITAL registers
   → Enters: hospital name, phone, pincode, city

3. HOSPITAL clicks "Need Blood"
   → Selects blood group (e.g. O+) and clicks the button
   → App queries Supabase for donors matching:
       • Same blood group (O+)
       • Same pincode
       • is_available = true
       • last_donated is NULL or more than 90 days ago
   → For each matching donor: calls the Supabase Edge Function
   → Edge Function calls Twilio API
   → Twilio calls the donor's phone with a voice message:
       "Hello [Name]! [Hospital] in [City] urgently needs O+ blood.
        Please visit BloodLink and click I'm Ready to Donate."

4. DONOR receives the call and visits the website
   → Goes to Dashboard → Blood Requests tab
   → Sees the active request from the hospital
   → Clicks "I'm Ready to Donate"
   → System atomically marks the request as fulfilled (race-condition safe)
   → Donor's last_donated date is updated
   → Donation is logged in donation_history

5. HOSPITAL sees a real-time popup ("Donor Found!")
   → Shows donor's name and phone number instantly
   → No page refresh needed — powered by Supabase Realtime

6. If ANOTHER DONOR tries to click "I'm Ready" after it's taken
   → Sees a friendly toast: "Another hero stepped up! A donor already responded."

7. NOTIFICATION BELL (for donors)
   → Bell icon in the navbar shows unread count
   → Clicking it shows all recent blood requests in the area
   → Browser push notification appears if permission is granted
```

---

## Troubleshooting

### "Cannot connect to Supabase"
- Check that `.env` has the correct `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Make sure `.env` is in the root folder (same level as `package.json`)
- Restart the dev server after editing `.env`: stop it with Ctrl+C, then `npm run dev` again

### "No eligible donors found" when sending a request
- Make sure the donor's **pincode** exactly matches the hospital's **pincode** (same 6 digits)
- Make sure the donor's **blood group** matches
- Make sure the donor's **is_available** is set to true (toggle in Profile tab)
- Make sure the donor's **last_donated** is either empty or more than 90 days ago

### "Voice call not going through"
- On Twilio trial: check that the donor's number is added to **Verified Caller IDs**
- Check that `TWILIO_FROM_NUMBER` is in the correct format: `+[country code][number]` (e.g. `+919876543210` for India)
- Run `supabase functions logs trigger-calls` in your terminal to see the error details

### "Edge function not found" error
- Re-run: `supabase functions deploy trigger-calls`
- Make sure you ran `supabase link` first with the correct project reference ID

### "Registration error" or "Row level security violation"
- Make sure you ran the full `supabase_schema.sql` in the Supabase SQL Editor
- If you see an error about a policy already existing, also run `backend/supabase_schema_module3_additions.sql`

### Realtime not working (modal/bell not updating)
- Check that you ran the `ALTER PUBLICATION supabase_realtime...` lines in `supabase_schema.sql`
- Realtime requires the project to be running (not paused on the free tier after inactivity)

---

## Build for Production

```bash
npm run build
```

This creates a `dist/` folder you can deploy to Vercel, Netlify, or any static host.

For Vercel:
```bash
npm install -g vercel
vercel
```

Remember to set your environment variables (`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`) in the Vercel project settings.

---

## What Each Module Added

| Module | Features |
|--------|---------|
| Module 1 | Project setup, Supabase schema, authentication (login/register for donors & hospitals), routing, landing page |
| Module 2 | Donor dashboard — profile editor, availability toggle, eligibility countdown, blood requests view, donation history timeline |
| Module 3 | Hospital dashboard — profile editor, "Need Blood" form, Twilio voice call integration, request history with call logs |
| Module 4 | Real-time notification bell for donors, "Donor Found" live popup for hospitals, race-condition safe "I'm Ready" button, "Already Claimed" toast, browser push notifications |

---

*Built with ❤️ for the hackathon. Every drop of blood counts.*
