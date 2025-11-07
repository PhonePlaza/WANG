🌏 WANG — Group Trip Planning Web Application

WANG is a web application for collaborative trip planning, designed to make organizing group trips easier and more fun 🎒✈️
Users can create groups, propose and vote for trip locations, set budgets, check availability, and receive email notifications for important events.

Built with Next.js 14, Supabase, Brevo (Sendinblue), and deployed on Vercel.

🚀 Tech Stack
Category            - Technology
Frontend / Backend	- Next.js 14 (App Router)
Database & Auth	    - Supabase
Email Notification	- Brevo (Sendinblue)
Deployment	        - Vercel
Language	        - TypeScript
Styling	            - Tailwind CSS

🧩 Main Features ---------------
✅ Google Sign-In Authentication
👥 Create and Join Groups
🗓️ Plan Trips with Shared Calendar
📍 Propose & Vote for Locations
💰 Set Minimum Budget per Person
📧 Email Notifications for:
    - New trip created
    - New member joined
    - Trip deadline approaching
    - Trip start reminder

⚙️ Getting Started
1. Clone the Repository
git clone https://github.com/<your-username>/wang.git
cd wang

2. Install Dependencies
npm install
# or
yarn install

3. Environment Variables

Create a file named .env.local and add your credentials:

NEXT_PUBLIC_SUPABASE_URL=https://<PROJECT-REF>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<YOUR_ANON_KEY>
BREVO_SMTP_HOST=<YOUR_SMTP_HOST>
BREVO_SMTP_PORT=<YOUR_SMTP_PORT>
BREVO_SMTP_USER=<YOUR_SMTP_USER>
BREVO_SMTP_PASS=<YOUR_SMTP_PASS>
BREVO_FROM=<YOUR_BREVO_FROM>


💡 The .env.local file is ignored by Git for security reasons.

4. Run the Development Server
npm run dev
# or
yarn dev


Then open http://localhost:3000
 in your browser 🎉

🧱 Project Structure
src/
 ├─ app/
 │   ├─ (app)/
 │   │   ├─ home/
 │   │   ├─ group/
 │   │   ├─ create-trip/
 │   │   ├─ trip/[tripId]/summary/
 │   │   ├─ settings/
 │   │   └─ calendar/
 │   ├─ auth/
 │   └─ layout.tsx
 ├─ lib/
 │   ├─ supabase/
 │   └─ notifications.ts
 ├─ components/
 │   ├─ ui/
 │   ├─ Sidebar.tsx
 │   ├─ Topbar.tsx
 │   └─ TripDatePicker.tsx
 └─ styles/

🌐 Deployment Guide (Vercel)

Push your code to GitHub.

Go to Vercel Dashboard
.

Click New Project → Import Repository.

Set Framework Preset to Next.js.

Add environment variables (from .env.local).

Deploy 🎉

🧩 After deploy, configure Supabase Auth → URL Configuration:

https://<your-vercel-app>.vercel.app/auth/callback

🧾 Additional Config Files

.eslintignore — Excludes folders from linting

eslint.config.mjs — ESLint rules for consistent code style

vercel.json — Vercel build configuration