# 🩸 BloodLink

BloodLink is a real-time blood donation coordination platform that connects hospitals needing urgent blood to eligible donors. Hospitals can trigger emergency outreach, donors can respond immediately, and both sides receive live updates through the app.

---

## 1. Architecture

BloodLink follows a simple real-time web architecture:

```text
+---------------------+        +---------------------------+
| React Client        | ----> | Supabase                  |
| (Vite + React)      |        | - PostgreSQL DB          |
| - Donor UI          |        | - Auth                   |
| - Hospital UI       |        | - Realtime subscriptions |
| - Dashboard views   |        | - Edge Functions         |
+---------------------+        +-------------+-------------+
                                             |
                                             | Trigger call
                                             v
                                 +---------------------------+
                                 | Supabase Edge Function     |
                                 | trigger-calls             |
                                 | - Receives request        |
                                 | - Calls Twilio API        |
                                 +-------------+-------------+
                                               |
                                               v
                                      +-------------------+
                                      | Twilio Voice API  |
                                      | makes donor call   |
                                      +-------------------+
```

### Core flow

1. Donor registers and sets availability and blood data.
2. Hospital submits a blood request with blood group and pincode.
3. The app checks matching donor records in Supabase.
4. The matching donors receive Twilio voice calls through the serverless edge function.
5. Donors confirm availability on the app.
6. The request is marked fulfilled and the hospital gets a live donor-found update.

---

## 2. Technology Stack

| Layer                | Technology                |
| -------------------- | ------------------------- |
| Frontend             | React 18 + Vite           |
| Routing              | React Router              |
| Styling              | CSS modules / custom CSS  |
| Backend / Database   | Supabase PostgreSQL       |
| Authentication       | Supabase Auth             |
| Realtime Updates     | Supabase Realtime         |
| Serverless Functions | Supabase Edge Functions   |
| Voice Calling        | Twilio Programmable Voice |
| Package Manager      | npm                       |

---

## 3. How the System Works

### Donor flow

1. A donor signs up with personal details, blood group, phone number, city, and pincode.
2. The donor can toggle availability in the profile section.
3. If a hospital needs matching blood, the donor receives a call from Twilio.
4. The donor visits the app and clicks “I’m Ready to Donate”.
5. The request is marked fulfilled and saved in the donation history.

### Hospital flow

1. A hospital signs up and enters profile and location information.
2. The hospital creates a blood request with blood group and units needed.
3. The app searches for eligible donors using matching blood group, pincode, availability, and donation timing rules.
4. Matching donors are called using Twilio voice notifications.
5. Once a donor responds, the hospital sees a real-time “Donor Found” notification.

### Live update logic

- Supabase Realtime listens to request and call log changes.
- Donors receive a dashboard notification bell and live request updates.
- Hospitals receive a donor-response popup without refreshing the page.

---

## 4. Main Features

### For donors

- Donor registration and profile management
- Availability toggle for donation status
- Blood group and location-based eligibility checks
- Active blood request tracking
- Voice-call response workflow
- Donation history view
- Real-time request notifications

### For hospitals

- Hospital registration and profile setup
- Blood request creation form
- Donor matching logic based on pincode and blood type
- Twilio voice call trigger for matching donors
- Request history and call logs
- Real-time donor confirmation modal

### Platform-wide

- Secure auth with Supabase
- Role-based routing for donor and hospital accounts
- Live updates through Realtime
- Secure server-side handling of Twilio secrets via Supabase functions

---

## 5. Expected Input

### Donor input

The donor registration/profile form expects:

- Full name
- Date of birth
- Gender
- Blood group: A+, A-, B+, B-, AB+, AB-, O+, O-
- Phone number
- Pincode
- City
- State
- Availability status
- Last donation date (optional)

### Hospital input

The hospital registration/profile form expects:

- Hospital name
- Registration number
- Contact person name
- Phone number
- Address
- Pincode
- City
- State

### Blood request input

The hospital request form expects:

- Blood group needed
- Units needed
- Pincode of the hospital/request area
- Optional notes

### System-matching input

The matching logic uses:

- donor blood_group
- donor pincode
- donor is_available = true
- donor last_donated date condition
- hospital request blood group and location

---

## 6. Project Structure

```text
bloodlink/
├── src/
│   ├── components/
│   │   ├── donor/
│   │   ├── hospital/
│   │   ├── notifications/
│   │   ├── Navbar.jsx
│   │   └── ProtectedRoute.jsx
│   ├── context/
│   │   └── AuthContext.jsx
│   ├── lib/
│   │   └── supabase.js
│   ├── pages/
│   │   ├── Home.jsx
│   │   ├── Login.jsx
│   │   ├── Register.jsx
│   │   ├── DonorDashboard.jsx
│   │   └── HospitalDashboard.jsx
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── backend/
│   ├── supabase/
│   │   └── functions/
│   │       └── trigger-calls/
│   │           └── index.ts
│   ├── MODULE3_SETUP.md
│   └── supabase_schema_module3_additions.sql
├── supabase_schema.sql
├── package.json
├── vite.config.js
├── index.html
├── README.md
└── .env.example
```

---

## 7. Local Setup

## 7.1 Client (Frontend) Setup

### Requirements

- Node.js 18+
- npm

### Steps

```bash
# in the project root
npm install
```

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Run the client:

```bash
npm run dev
```

Open the app in the browser:

```text
http://localhost:5173
```

### Notes

- `.env` is used only by the frontend client.
- Do not expose secrets in client-side code.
- The Supabase keys should come from your Supabase project dashboard.

---

## 7.2 Server / Backend Setup

This project uses Supabase as the backend and a Supabase Edge Function as the server-side voice trigger.

### 1. Create Supabase project

1. Go to Supabase.
2. Create a new project.
3. Copy your project URL and anon key.

### 2. Run database schema

Open the SQL editor in Supabase and run:

```sql
supabase_schema.sql
```

If you are using the later module additions, also run:

```sql
backend/supabase_schema_module3_additions.sql
```

### 3. Configure Twilio

1. Create a Twilio account.
2. Buy or get a phone number.
3. Note down:
   - Account SID
   - Auth Token
   - Twilio phone number

> For free/trial accounts, verify donor numbers before testing calls.

### 4. Install Supabase CLI

```bash
npm install -g supabase
supabase --version
```

### 5. Login and link your project

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
```

Find your project reference in the Supabase dashboard under Settings → General.

### 6. Copy edge function into the project folder

```bash
mkdir -p supabase/functions/trigger-calls
cp backend/supabase/functions/trigger-calls/index.ts supabase/functions/trigger-calls/index.ts
```

### 7. Set Twilio secrets on Supabase

```bash
supabase secrets set TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
supabase secrets set TWILIO_AUTH_TOKEN=your_auth_token_here
supabase secrets set TWILIO_FROM_NUMBER=+15551234567
```

### 8. Deploy the edge function

```bash
supabase functions deploy trigger-calls
```

If successful, you should see a message indicating the function was deployed successfully.

---

## 8. Example Flow

```text
Hospital requests O+ blood in pincode 560001
  ↓
System searches donors with:
  - blood_group = O+
  - pincode = 560001
  - is_available = true
  - last_donated older than allowed window
  ↓
Matching donors receive a Twilio call
  ↓
Donor clicks "I'm Ready to Donate"
  ↓
Request status updates to fulfilled
  ↓
Hospital gets live donor confirmation popup
```

---

## 9. Troubleshooting

### Frontend connection issues

- Check that the `.env` values are correct.
- Restart the Vite server after changing environment variables.

### No donor matches found

- Make sure blood group matches.
- Ensure pincode matches the hospital location.
- Confirm the donor is marked available.
- Make sure the donor has not donated recently.

### Twilio calls fail

- Add donor numbers to Twilio verified caller IDs for trial accounts.
- Verify `TWILIO_FROM_NUMBER` format.
- Check edge function logs with:

```bash
supabase functions logs trigger-calls
```

---

## 10. Summary

BloodLink combines modern frontend development, database-backed user management, and serverless voice automation to make blood donation coordination faster and more responsive. It is designed for urgent medical requests where speed matters and real-time communication can save lives.

Built for emergency matching, donor response, and live hospital visibility.
