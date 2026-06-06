# Dakar 2026 TEC — RAID & Deliverables Dashboard

Live dashboard for the Dakar 2026 Technology Programme. Deployed on Vercel, data refreshed hourly from Smartsheet via GitHub Actions.

## Architecture

```
Smartsheet API (hourly)
      ↓
GitHub Actions (.github/workflows/sync.yml)
      ↓  writes JSON to /data/
GitHub Repository
      ↓  auto-deploy on every commit
Vercel
      ↑
Users open the dashboard URL
```

## Data sources

| File | Smartsheet Sheet |
|------|-----------------|
| `data/raid.json` | Dakar 26 TEC - RAID (7427364280553348) |
| `data/tms.json` | Technology Master Schedule (7433689576198020) |
| `data/mastersheet.json` | Mastersheet / Deliverable Tracker (2744860420296580) |
| `data/drr.json` | DRR Master Tracker (3468458757934980) |
| `data/vros.json` | All 14 SONATEL + ARTP VROS sheets |

## Setup

### 1. GitHub Secret
Go to **Settings → Secrets and variables → Actions → New repository secret**
- Name: `SMARTSHEET_TOKEN`
- Value: your Smartsheet API token

### 2. Vercel
- Connect this repository to Vercel
- Framework: **Other** (static)
- Root directory: `/`
- No build command needed
- Output directory: `/`

### 3. Trigger first sync
Go to **Actions → Sync Smartsheet Data → Run workflow** to populate data immediately.

## Local development

```bash
npm install
SMARTSHEET_TOKEN=your_token node scripts/fetch.js
# Then open index.html in a browser (use a local server for fetch() to work)
npx serve .
```

## Tabs

| Tab | Content |
|-----|---------|
| ⏱ Games Countdown | Live countdown to Opening Ceremony 31 Oct 2026 20:00 WAT |
| 📅 30-Day Gantt | Deliverables due 06 Jun – 06 Jul 2026 |
| ⚠ RAID Log | Top 5 Programme Risks · Top 5 Cyber Risks · All remaining risks · Issues/Actions/Decisions |
