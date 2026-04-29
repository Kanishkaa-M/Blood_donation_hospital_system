# 🏥 Module 3 Setup Guide — Hospital Dashboard + Voice Calls

## What's New in Module 3
- Full Hospital Dashboard (Profile, Need Blood, Request History tabs)
- "Need Blood" button finds all eligible donors and calls them via Twilio
- Real-time request status tracking
- Call log per request showing who was called and their response

---

## Step 1 — Run the SQL (only if needed)

If you already ran `supabase_schema.sql` in Module 1, run only the **additions** file:

```
backend/supabase_schema_module3_additions.sql
```

Go to: **Supabase Dashboard → SQL Editor → New Query → paste the file → Run**

---

## Step 2 — Set up Twilio (5 minutes)

1. Go to [https://www.twilio.com](https://www.twilio.com) and create a free account
2. From the Twilio Console, note down:
   - **Account SID** (starts with `AC...`)
   - **Auth Token**
3. Get a free phone number: **Twilio Console → Phone Numbers → Buy a Number**
   - ✅ Enable "Voice" capability
   - Note down the number (e.g. `+15551234567`)
4. **Important for trial accounts:** Go to **Verified Caller IDs** and add each donor's phone number you want to call during testing

> 💡 On the free trial, Twilio can only call numbers you've verified. Upgrade to call any number.

---

## Step 3 — Deploy the Supabase Edge Function

The Edge Function lives at: `backend/supabase/functions/trigger-calls/index.ts`

### Install Supabase CLI (if not installed)
```bash
npm install -g supabase
```

### Login and link your project
```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
# Find YOUR_PROJECT_REF in: Supabase Dashboard → Settings → General
```

### Copy the function to your project
```bash
mkdir -p supabase/functions/trigger-calls
cp backend/supabase/functions/trigger-calls/index.ts supabase/functions/trigger-calls/index.ts
```

### Set your secrets (Twilio credentials)
```bash
supabase secrets set TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
supabase secrets set TWILIO_AUTH_TOKEN=your_auth_token_here
supabase secrets set TWILIO_FROM_NUMBER=+15551234567
```

### Deploy the function
```bash
supabase functions deploy trigger-calls
```

You should see: `✅ Done: trigger-calls`

---

## Step 4 — Update .env (if needed)

Your `.env` should already have these from Module 1. No changes needed for Module 3.

---

## Step 5 — Run the app

```bash
npm install
npm run dev
```

Log in as a **Hospital** account and go to the **"Need Blood"** tab to test!

---

## How the Voice Call Works

1. Hospital selects blood group → clicks "Need Blood — Call Donors Now"
2. App queries Supabase for donors matching: same **blood group** + same **pincode** + **available** + **not donated in last 3 months**
3. For each matching donor, a `call_logs` record is created and the Edge Function is invoked
4. Edge Function calls Twilio API → Twilio calls the donor's phone
5. Donor hears: *"Hello [Name]! [Hospital] urgently needs [Blood Group] blood. Please visit BloodLink and click I'm Ready to Donate."*
6. Donor visits the site, goes to **Active Requests** tab, and clicks **"I'm Ready to Donate"**
7. Request status updates to "fulfilled" — hospital sees **"✅ Donor Found"** in real-time

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Call not going through | Check Twilio verified numbers (trial accounts only call verified numbers) |
| Edge function error | Run `supabase functions logs trigger-calls` to see the error |
| "No eligible donors found" | Make sure donor's pincode matches hospital's pincode exactly |
| Function not found | Re-run `supabase functions deploy trigger-calls` |

