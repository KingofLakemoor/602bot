# Club 602 & QNW Bot Ecosystem — Monorepo & Controller Specification

A unified repository containing four distinct Discord bots and a dedicated **React Controller App** for Rick & Admins, powered by Firebase Apps (Firebase Hosting, Firestore Cloud Database, & Auth) for decentralized cloud deployment.

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

## 🎯 The Controller App & No-Code Custom Actions Studio

The Controller App operates as a **Firebase-Driven Control Dashboard**:
* **Custom Bot Actions & Triggers Studio**: Admins can visually create, edit, pause, and delete custom bot actions (`/commands`, keywords, or cron schedules) directly from the Control App.
* **Live Discord Embed Preview**: Visual side-by-side preview component shows exact response embeds before publishing.
* **1-Click Preset Templates**: Quick-start templates for hot take roasts, sharp money flow alerts, confessional leaks, and VIP lounge passes.
* **Real-time Synchronization**: Changes in the Control App update `bot_custom_actions` in Firestore, instantly updating bot responses across all connected Discord servers without requiring Pi redeployments or server restarts.

---

## ☁️ Hybrid Architecture: Firebase App Hosting & Raspberry Pi Bot Fleet

This ecosystem uses a **Hybrid Architecture** combining cloud web hosting with edge bot execution:

1. **Control App (Firebase App Hosting)**:
   - The React Control App dashboard is hosted on **Firebase App Hosting / Firebase Hosting** for easy, secure, decentralized access from any browser or device.
   - Admins can design custom actions, view telemetry, and toggle overrides without hosting a web server locally or opening Pi ports.

2. **Bot Fleet (Raspberry Pi)**:
   - The 4 Discord bots (`commissioner`, `linemaker`, `producer`, `concierge`) run on the **Raspberry Pi** as Docker containers, maintaining persistent real-time WebSocket connections to Discord's Gateway API.

3. **Shared Firestore Data Bridge**:
   - Both the cloud-hosted web app and the locally-hosted Pi bots read and write to the same shared cloud Firestore database (`onSnapshot` listeners and `bot_custom_actions` collection).
   - Clicking a manual override or updating a custom action on your phone anywhere in the world instantly triggers the bots running on the Raspberry Pi.

---

## 🔧 Firebase App Hosting Monorepo Setup & Deployment

Firebase App Hosting natively supports monorepos. Follow these steps to configure deployment:

1. **Configure Firebase App Hosting**:
   - Navigate to **App Hosting** in the Firebase Console and click **Get started**.
   - Authorize your GitHub account and select the `KingofLakemoor/602bot` repository.
   - **Critical Monorepo Step**: Set the **Root Directory** option to `/controller-app` (or `/` if deploying from the root directory) so Firebase builds only the web dashboard and ignores bot code.
   - Select your deployment branch (`main`).

2. **Split Environment Variables**:
   - **In Firebase App Hosting (Web App)**: Add public Firebase client configuration keys (e.g. `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_PROJECT_ID`). Do **not** place Discord bot tokens here.
   - **On the Raspberry Pi (Bot Fleet)**: Keep `.env` containing private bot tokens (`COMMISSIONER_TOKEN`, `LINEMAKER_TOKEN`, `PRODUCER_TOKEN`, `CONCIERGE_TOKEN`), `HUB_GUILD_ID`, `CLUB602_GUILD_ID`, and `FIREBASE_SERVICE_ACCOUNT_PATH`.

---

## 🚀 Raspberry Pi Docker Deployment (4 Bots)

Since the Control App is hosted on Firebase, the Raspberry Pi `docker-compose.yml` runs only the 4 Discord bot containers:

### 1. Configure `.env` on the Pi
```bash
cp .env.example .env
nano .env
```
Provide the required Discord tokens, `HUB_GUILD_ID`, `CLUB602_GUILD_ID`, and place `firebase-service-account.json` in the root.

### 2. Deploy Slash Commands
```bash
node discord-bots/deploy-commands.js
```

### 3. Launch Bot Fleet with Docker Compose
```bash
docker compose up -d --build
```

Verify the 4 bot services:
```bash
docker compose ps
# Output:
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
