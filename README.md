# 🗺️ WANG — Group Trip Planning

> **Plan your next adventure together.**  
> The easiest way to organize trips with friends.

� **Live Demo:** [wang-nine-gamma.vercel.app](https://wang-nine-gamma.vercel.app/)

---

## ✨ Features

- 🔐 **Google Sign-In** — Easy authentication via Supabase
- 👥 **Create & Join Groups** — Collaborate with friends
- 🗓️ **Shared Calendar** — Plan trips with availability checking
- 📍 **Propose & Vote** — Vote on trip locations
- 💰 **Budget Tracking** — Set minimum budget per person
- 📧 **Email Notifications** — Get notified for trip events

---

## 🚀 Tech Stack

| Category | Technology |
|----------|------------|
| Framework | Next.js 16 (App Router) |
| Database & Auth | Supabase |
| Email | Brevo (Sendinblue) |
| Styling | Tailwind CSS |
| Deployment | Vercel |

---

## ⚡ Getting Started

### 1. Clone & Install

```bash
git clone https://github.com/<your-username>/wang.git
cd wang
npm install
```

### 2. Environment Variables

Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<PROJECT-REF>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<YOUR_ANON_KEY>
BREVO_SMTP_HOST=<YOUR_SMTP_HOST>
BREVO_SMTP_PORT=<YOUR_SMTP_PORT>
BREVO_SMTP_USER=<YOUR_SMTP_USER>
BREVO_SMTP_PASS=<YOUR_SMTP_PASS>
BREVO_FROM=<YOUR_BREVO_FROM>
```

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) 🎉

---

## 📁 Project Structure

```
src/
├── app/
│   ├── (app)/          # Protected routes
│   │   ├── home/
│   │   ├── group/
│   │   ├── create-trip/
│   │   └── trip/[tripId]/
│   └── auth/           # Authentication pages
├── components/         # UI components
├── lib/                # Utilities & Supabase client
└── proxy.ts            # Auth middleware
```

---

## 🌐 Deploy to Vercel

1. Push to GitHub
2. Import project on [Vercel](https://vercel.com)
3. Add environment variables
4. Deploy! 🚀

> **Note:** Configure Supabase Auth URL to:  
> `https://<your-app>.vercel.app/auth/callback`

---

## 📄 License

MIT