<div align="center">

# 📱 QR‑ATT

**QR‑code attendance tracking for students and teachers, built with Expo + Supabase**

[![Expo](https://img.shields.io/badge/Expo-~54.0.0-000020?logo=expo&logoColor=white)](https://expo.dev)
[![React Native](https://img.shields.io/badge/React%20Native-0.81.5-61DAFB?logo=react&logoColor=white)](https://reactnative.dev)
[![Supabase](https://img.shields.io/badge/Supabase-Backend-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)

</div>

---

## About

**QR‑ATT** is a cross‑platform mobile app (iOS, Android, and Web via Expo Router) that replaces paper sign‑in sheets with QR‑code check‑ins. Teachers generate a QR code for a class or event; students scan it with their phone camera to record their attendance instantly. All data is stored in Supabase (Postgres + Auth).

## ✨ Features

| Role | What they can do |
|---|---|
| 🎓 **Student** | Sign up / log in, scan an event QR code, get instant success/error feedback, view a personal attendance history |
| 🧑‍🏫 **Teacher** | Create events, generate a QR code per event, see a live attendee list and summary counts per event |

**Under the hood:**
- 📷 In‑app camera scanning via `expo-camera`
- 🔐 Email/password auth with session persistence (`expo-secure-store` on native)
- 🗄️ Supabase Postgres backend for `profiles`, `events`, and `attendance` tables
- ⏱️ Event QR codes are time‑boxed — attendance is only accepted between an event's start and end time
- 🚫 Duplicate‑scan protection (a student can't check in twice for the same event)
- 🌐 Runs on iOS, Android, and Web from a single codebase (Expo Router)

## 🗂️ Tech Stack

- **Framework:** [Expo](https://expo.dev) 54 / React Native 0.81 / Expo Router
- **Language:** TypeScript
- **Backend:** [Supabase](https://supabase.com) (Postgres, Auth)
- **QR:** `react-native-qrcode-svg` (generate) + `expo-camera` (scan)
- **Navigation:** React Navigation (bottom tabs)

## 📁 Project Structure

```
QR-ATT/
├── app/                    # Expo Router screens
│   ├── (tabs)/
│   │   ├── index.tsx       # Home
│   │   ├── scan.tsx        # QR scanner (student)
│   │   ├── history.tsx     # Attendance history (student)
│   │   ├── teacher.tsx     # Event creation & attendee view (teacher)
│   │   └── _layout.tsx     # Tab bar layout
│   ├── login.tsx
│   ├── register.tsx
│   └── _layout.tsx
├── lib/                    # App logic, decoupled from UI
│   ├── auth.ts             # Sign up / sign in / session state
│   ├── attendance.ts       # Register + fetch attendance records
│   ├── events.ts           # Event CRUD helpers
│   ├── profiles.ts         # Profile helpers
│   ├── qr.ts               # QR payload build/parse
│   └── supabase.ts         # Supabase client setup
├── components/             # Shared UI components
├── constants/colors.ts     # Theme colors
├── supabase/schema.sql     # Database schema
├── scripts/                # DB setup/check utilities
└── android/                # Native Android project (EAS/Gradle)
```

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org) 18+
- A free [Supabase](https://supabase.com) project
- Expo Go app (for quick device testing) or an Android/iOS emulator

### 1. Clone & install
```bash
git clone https://github.com/aurielfritz27/glowing-bassoonQR-ATT.git
cd glowing-bassoonQR-ATT
npm install
```

### 2. Configure environment variables
Create a `.env` file in the project root:
```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```
> Find these under **Project Settings → API** in your Supabase dashboard.

### 3. Set up the database
Apply the schema in `supabase/schema.sql` — either paste it into the Supabase SQL editor, or run:
```bash
npm run db:apply -- --dry-run   # preview the statements first
npm run db:apply                # requires SUPABASE_ACCESS_TOKEN env var
npm run db:check                # verify the tables exist
```

### 4. Run the app
```bash
npm start          # Expo dev server — scan the QR with Expo Go
npm run android    # Android emulator/device
npm run ios        # iOS simulator/device
npm run web        # Web browser
```

## 🔒 Security Notes
- Keep your `.env` file **out of version control** (never commit access tokens or service keys).
- Only the Supabase **anon key** belongs in the app — it's safe for client use when paired with Row Level Security policies on your tables.

## 📄 License
No license specified yet — all rights reserved by default until one is added.

---
<div align="center">
Made by <a href="https://github.com/aurielfritz27">aurielfritz27</a>
</div>
