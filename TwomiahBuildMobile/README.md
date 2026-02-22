# Twomiah Build Mobile

React Native / Expo app for field crews. Items #14 + #15 from the priority list.

## What's Built

### Screens
- **Login** — JWT auth against your existing Twomiah Build backend
- **Home** — Dashboard with live clock-in timer, quick actions, sync status
- **Jobs** — Searchable list with local SQLite cache (works offline)
- **Job Detail** — Clock in/out, daily log, photos, tasks — all from one screen
- **Time Tracking** — Clock in/out with GPS, job selection, hours history
- **Daily Logs** — Weather, workers on site, work performed, delays — saved offline-first
- **Photos** — Camera capture + library picker, full-screen viewer, upload queue
- **Tasks** — Punch list with checkbox completion, synced to server

### Offline-First Architecture (#15)
- **SQLite local database** — every write goes local first, then queues to server
- **Sync queue** — all mutations stored in `sync_queue` table when offline
- **Auto-drain** — `syncEngine.ts` listens for connectivity and drains queue automatically
- **Background sync** — registered with `expo-background-fetch` for 15-min intervals
- **Conflict handling** — 409/422 responses remove item from queue without retry
- **Retry logic** — failed items retry up to 5 times, then mark as failed
- **Visual indicator** — amber banner shows pending count, clears when synced

## Setup

### Prerequisites
- Node.js 18+
- Expo CLI: `npm install -g expo-cli`
- iOS: Xcode + iOS Simulator, or Expo Go on device
- Android: Android Studio + emulator, or Expo Go on device

### Install
```bash
npm install
```

### Environment
```bash
cp .env.example .env.local
# Set EXPO_PUBLIC_API_URL to your Twomiah Build backend URL
```

**Local dev tip:** Use your machine's local IP (e.g. `http://192.168.1.50:3001`), not `localhost` — your phone/simulator can't reach localhost on your machine.

### Run
```bash
# Start dev server
npm start

# iOS simulator
npm run ios

# Android emulator  
npm run android
```

### Build for distribution
```bash
# Install EAS CLI
npm install -g eas-cli

# Configure your EAS project
eas build:configure

# Build iOS
eas build --platform ios

# Build Android
eas build --platform android
```

## File Structure

```
app/
  _layout.tsx              — Root layout, starts sync engine
  index.tsx                — Auth redirect
  (auth)/
    _layout.tsx
    login.tsx              — Login screen
  (app)/
    _layout.tsx            — Tab navigation + sync banner
    index.tsx              — Home dashboard
    jobs/
      index.tsx            — Jobs list
      [id].tsx             — Job detail + field actions
      tasks.tsx            — Punch list tasks
    time/
      index.tsx            — Clock in/out + history
    daily-logs/
      index.tsx            — Daily log form
    photos/
      index.tsx            — Photo gallery + capture

src/
  api/
    client.ts              — Offline-aware API client
    syncEngine.ts          — Queue drain + background sync
  store/
    authStore.ts           — JWT auth state
    syncStore.ts           — Pending count, syncing state
    jobsStore.ts           — Jobs with local cache
    timeStore.ts           — Clock in/out with GPS
    photosStore.ts         — Photo capture + upload queue
  hooks/
    useNetworkStatus.ts    — Online/offline detection
  utils/
    database.ts            — SQLite schema + helpers
```

## Backend API Routes Used

All routes are on your existing Twomiah Build backend:

| Method | Route | Purpose |
|--------|-------|---------|
| POST | `/api/v1/auth/login` | Login |
| GET | `/api/v1/jobs` | Fetch active jobs |
| POST | `/api/v1/time-tracking/clock-in` | Clock in |
| POST | `/api/v1/time-tracking/clock-out` | Clock out |
| POST | `/api/v1/daily-logs` | Create daily log |
| POST | `/api/v1/photos` | Upload photo |
| POST | `/api/v1/jobs/:id/tasks` | Add task |
| PATCH | `/api/v1/jobs/:id/tasks/:taskId` | Update task |

## What's Next (add when ready)

- Push notifications for job assignments (`expo-notifications` already installed)
- GPS geofencing auto clock-in (`expo-location` already installed)
- Offline maps / job site directions
- RFI creation from field
- Change order photos and signatures
- Inspection checklists
