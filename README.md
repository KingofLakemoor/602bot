# Club 602 & QNW Bot Ecosystem — Raspberry Pi Deployment Guide

A suite of four distinct Discord bots sharing a unified Node.js (v18+) codebase, deployed via Docker Compose to a Raspberry Pi with a shared Firebase Firestore backend and native Fantrax API polling.

---

## 📂 Architecture Overview

```
/discord-bots-monorepo
│
├── /shared-utils
│   ├── firebase-config.js      # Shared Firestore init & event listeners
│   ├── fantrax-api.js          # Native fetch functions for Fantrax JSON endpoints
│   └── message-builders.js     # Reusable Discord Embed functions
│
├── /bots
│   ├── /commissioner           # QNW / Gridiron Exotics (Sports enforcer & trash-talker)
│   ├── /linemaker              # ChainLink (Real-time betting board alerts)
│   ├── /producer               # ScriptLess (Reality TV roster management)
│   └── /concierge              # Club 602 (Standalone server hospitality & calendar)
│
├── deploy-commands.js          # REST API script to register slash commands
├── docker-compose.yml          # Boots all 4 containers independently
├── Dockerfile                  # Multi-arch alpine node container for Pi
├── .env                        # Environment variables (Tokens, Guild IDs)
└── package.json                # Shared dependencies
```

---

## 🚀 Raspberry Pi Quickstart (Step-by-Step)

### 1. Prerequisites on Raspberry Pi
Ensure Docker and Docker Compose are installed on your Raspberry Pi:
```bash
# Update and install Docker
curl -sSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Install Docker Compose plugin (if not already included)
sudo apt-get install -y docker-compose-plugin
```

### 2. Clone or Copy Monorepo
```bash
mkdir -p ~/discord-bots-monorepo
cd ~/discord-bots-monorepo
# Transfer files or git clone here
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env` and populate your Discord tokens and Guild IDs:
```bash
cp .env.example .env
nano .env
```

Variables required:
* `COMMISSIONER_TOKEN` & `COMMISSIONER_CLIENT_ID`
* `LINEMAKER_TOKEN` & `LINEMAKER_CLIENT_ID`
* `PRODUCER_TOKEN` & `PRODUCER_CLIENT_ID`
* `CONCIERGE_TOKEN` & `CONCIERGE_CLIENT_ID`
* `HUB_GUILD_ID` (Merged server for Commissioner, Linemaker, Producer)
* `CLUB602_GUILD_ID` (Standalone Club 602 server)
* `FIREBASE_SERVICE_ACCOUNT_PATH` (`./firebase-service-account.json`)
* `FANTRAX_LEAGUE_IDS` (e.g. `gridiron_exotics_2026`)

Place your Firebase service account JSON key in the root directory:
```bash
# Place your key at:
~/discord-bots-monorepo/firebase-service-account.json
```

### 4. Deploy Slash Commands to Discord
Run the deployment script once before or after starting containers:
```bash
npm install
node deploy-commands.js
```
*(This uses the Discord REST API to register the commands to their respective Guilds instantly).*

### 5. Launch with Docker Compose
```bash
docker compose up -d --build
```

Verify that all 4 containers are running:
```bash
docker compose ps
```

Monitor live logs for any bot:
```bash
# View all logs
docker compose logs -f

# Or follow a specific persona
docker compose logs -f commissioner
docker compose logs -f linemaker
docker compose logs -f producer
docker compose logs -f concierge
```

---

## 🛡️ Slash Command Matrix & Privacy Rules

The Commissioner, Linemaker, and Producer coexist in the unified **Hub Guild** without command collisions. Strict Ephemeral flags (`ephemeral: true`) prevent megachannel spam.

| Bot | Command | Reply Visibility | Purpose |
| :--- | :--- | :--- | :--- |
| **Commissioner** | `/matchup` | **Public** | Pulls head-to-head records & Commissioner roasts |
| **Commissioner** | `/shame` | **Public** | Audits rosters for injured/bye players via Fantrax |
| **Commissioner** | `/guillotine-check` | **Public** | Checks current Chop league block & cut line |
| **Linemaker** | `/board` | 🔒 **Ephemeral** | Displays open ChainLink windows & lines |
| **Linemaker** | `/my-action` | 🔒 **Ephemeral** | Displays user's personal pending picks & slips |
| **Linemaker** | `/pro-claim` | 🔒 **Ephemeral** | Claims daily login bonus & streak multiplier |
| **Producer** | `/cast-tea` | **Public** | Shows top drama scorers & confessional metrics |
| **Producer** | `/green-room` | 🔒 **Ephemeral** | Displays user's locked-in cast roster |
| **Producer** | `/spill` | **Public** | Reality draft rumors & cutting-room intel |
| **Producer** | `/eliminated` | **Public** | Reality stars sent home this week |
| **Concierge** | `/events` | **Public** | Club 602 gatherings & private screenings |
| **Concierge** | `/rsvp` | 🔒 **Ephemeral** | Private guestlist booking & confirmation |
| **Concierge** | `/schedule` | **Public** | Weekly operating hours & member perks |

---

## ⚡ Memory & Raspberry Pi Optimization
* Base image: `node:20-alpine` (~180MB footprint).
* Combined RAM usage for all 4 containers is approximately **180MB - 300MB**, leaving ample headroom on a Raspberry Pi 4 (2GB/4GB/8GB) or Pi 5.
* Event-driven `onSnapshot` listeners eliminate expensive periodic polling for Firebase.
* Fantrax API calls use native `fetch` with 8s timeouts and a scheduled `node-cron` frequency.
