# Club 602 & QNW Bot Ecosystem — Monorepo & Controller Specification

A unified repository containing four distinct Discord bots and a dedicated **React/Next.js Controller App** for Rick & Admins, deployed via Docker Compose to a Raspberry Pi with a shared Firebase Firestore backend.

---

## 📂 Updated Monorepo Architecture

```plaintext
/602bot (GitHub Root)
│
├── /controller-app             <-- React Controller App Dashboard for Rick & Admins
│   ├── /src/components         
│   ├── Dockerfile              <-- Builds web dashboard on Port 3000
│   └── package.json            <-- Web app dependencies
│
├── /discord-bots               <-- The 4-Bot Suite
│   ├── /bots
│   │   ├── /commissioner       # QNW Fantasy Enforcer (Sports enforcer & trash-talker)
│   │   ├── /linemaker          # ChainLink Sportsbook (Real-time betting board alerts)
│   │   ├── /producer           # ScriptLess (Reality TV roster management)
│   │   └── /concierge          # Club 602 (Standalone server social & RSVP)
│   │
│   ├── /shared-utils           <-- Shared logic for bots AND the controller
│   │   ├── firebase-config.js  # Shared Firestore init & event listeners
│   │   ├── message-builders.js # Reusable Discord Embed functions
│   │   └── fantrax-api.js      # Native fetch functions for Fantrax JSON endpoints
│   │
│   ├── deploy-commands.js      # Discord REST API script for slash command registration
│   ├── Dockerfile              # Lightweight alpine node container for Pi
│   └── package.json            # Bot dependencies (discord.js, node-cron)
│
├── docker-compose.yml          <-- Boots 5 containers (4 bots + 1 controller app)
├── .env.example                # Template for Discord tokens, Guild IDs, and keys
└── README.md                   <-- Developer Handoff Spec & Day 1 Checklist
```

---

## 📋 Day 1 Developer Checklist

Copy this checklist into a GitHub Issue or your project tracker:

- [x] **1. Scaffold the Monorepo**: Initialize `/discord-bots` and `/controller-app` directories with their respective `package.json` and Docker manifests.
- [x] **2. Establish Firebase Connection**: Configure `/shared-utils/firebase-config.js` with Google Cloud Service Account credentials (`FIREBASE_SERVICE_ACCOUNT_PATH`) and zero-cost in-memory mock fallback for local dev.
- [x] **3. Scaffold the Controller UI**: React dashboard locked to Admin users (Rick & Admins) displaying live health and telemetry of all 4 bots.
- [x] **4. Build the Manual Overrides**: Firestore flag dispatchers in the controller app:
  - 🪓 **Trigger Guillotine Drop**: Updates `gridiron_exotics/chop_league` (Commissioner `onSnapshot` alert).
  - ⚡ **Emergency Line Freeze**: Updates `action_board/control_flags` (Linemaker `onSnapshot` halt).
  - 🎬 **Emergency Roster Lock**: Updates `scriptless/current_episode` (Producer `onSnapshot` lockout).
  - 🍸 **VIP Lounge Flash Announcement**: Updates `club602_calendar/announcements` (Concierge `onSnapshot`).
  - 🚨 **Trigger Wall of Shame Audit**: Updates `gridiron_exotics/standings` (Instant Fantrax audit).
- [x] **5. Test Local Docker Build**: Verify that `docker compose up` successfully boots 5 containers (4 bots + 1 controller app on port 3000).

---

## 🎯 The Controller App Strategy

The Controller App operates as a **Firebase-Driven Dashboard**:
* Instead of the web dashboard sending direct HTTP or WebSocket commands to each isolated bot container (which requires complex internal container routing and open ports), the Controller App simply updates specific Firestore documents.
* Because all 4 bots subscribe via real-time `onSnapshot` listeners, changing a value in the Controller App triggers the bots in Discord **instantly** without additional network latency or cloud polling costs.

---

## 🚀 Raspberry Pi Docker Deployment (5 Containers)

### 1. Configure `.env`
```bash
cp .env.example .env
nano .env
```
Provide the required Discord tokens, `HUB_GUILD_ID`, `CLUB602_GUILD_ID`, and place `firebase-service-account.json` in the root.

### 2. Deploy Slash Commands
```bash
node discord-bots/deploy-commands.js
```

### 3. Launch with Docker Compose
```bash
docker compose up -d --build
```

Verify all 5 services:
```bash
docker compose ps
# Output:
# controller    Up (port 0.0.0.0:3000->3000)
# commissioner  Up
# linemaker     Up
# producer      Up
# concierge     Up
```

---

## 🔒 Security Best Practices & Firebase API Keys

### Understanding Firebase Client API Keys
Firebase Web Client API keys (`apiKey` starting with `AIza...`) are designed as **public project identifiers** for frontend applications rather than secret credentials. Unlike GCP Service Account JSON keys or private backend secrets, client API keys are exposed to browsers by design. Real data protection is enforced via **Firebase Security Rules** and **Firebase App Check**.

### Addressing GitHub Secret Scanning Alerts
GitHub's Secret Scanner automatically flags any Google API key pattern. To secure your setup and resolve scanning alerts:

1. **Restrict Key in GCP Console**:
   - Go to [Google Cloud Console Credentials](https://console.cloud.google.com/apis/credentials).
   - Edit the API key (`AIzaSy...`).
   - Under **Application Restrictions**, restrict usage to authorized HTTP Referrers / website domains.
   - Under **API Restrictions**, restrict access exclusively to needed Firebase APIs (e.g., Firebase Authentication, Firestore API).
2. **Key Rotation**:
   - Create a new restricted API key in Google Cloud Console.
   - Update your environment variables (`VITE_FIREBASE_API_KEY="..."`).
   - Delete/revoke the old key in GCP Console and resolve the GitHub Secret Scanning alert as **Revoked** or **False Positive / Used in public web client with restrictions**.
3. **Environment Variable Configuration**:
   - You can override `firebase-applet-config.json` at build/runtime using `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_PROJECT_ID`, etc., in your `.env` file.
