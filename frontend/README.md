# BuildPro CRM Builder

A complete CRM builder that lets you select features, customize branding, and generate configured CRM instances.

## Features

- **85+ Features** across 14 categories from the BuildPro vs Procore vs Jobber comparison
- **Preset Packages**: Service Starter, Project Pro, Contractor Suite, Enterprise
- **Custom Branding**: Company name, logo, and primary color
- **Dynamic CRM**: Only enabled features appear in navigation
- **40 source files, 4,800+ lines of code**

## Fully Functional Pages

| Module | Features |
|--------|----------|
| **Dashboard** | Stats, activity feed, today's schedule, pending items |
| **Contacts** | Full CRUD, search, filter by type, detail view |
| **Projects** | Budget tracking, progress bars, client assignment |
| **Jobs** | Status workflow, time estimates, assignees |
| **Quotes** | Create, send, approve/reject workflow |
| **Invoicing** | Create, mark paid, overdue tracking |
| **Schedule** | Calendar view, job details, day selection |
| **Team** | Team member management |
| **RFIs** | Request for Information tracking |
| **Change Orders** | Approve/reject workflow, amount tracking |
| **Punch Lists** | Priority levels, completion tracking |
| **Daily Logs** | Weather, manpower, work performed |
| **Time Tracking** | Timer, hours by job, billable flag |
| **Expenses** | Categories, vendors, receipt tracking |
| **Marketing** | Reviews, email campaigns, referrals |
| **Financials** | Revenue, expenses, profit margins |
| **Communication** | Activity feed, messages, templates |
| **Quality & Safety** | Inspections, incidents, checklists |
| **Bidding** | Bid pipeline, due dates, amounts |
| **Advanced** | AI assistant, dashboards, analytics |
| **Settings** | Company config, integrations, API |

## Quick Start

```bash
# Extract
unzip buildpro-crm-builder-complete.zip
cd buildpro-builder

# Install dependencies
npm install

# Start development server
npm run dev

# Open http://localhost:5173
```

## How It Works

1. **Configure Company** - Enter company name, upload logo, pick brand color
2. **Choose Preset** - Start with a preset package or customize from scratch  
3. **Select Features** - Toggle individual features across all categories
4. **Create CRM** - Click "Create CRM" to generate your configured instance
5. **Use CRM** - Navigate the CRM with only your enabled features visible

## Tech Stack

- React 18 + Vite
- React Router v6
- Zustand (state management with persistence)
- Tailwind CSS
- Lucide React (icons)
- date-fns

## Project Structure

```
src/
├── components/
│   ├── builder/     # CRM Builder interface (6 files)
│   ├── crm/         # CRM shell & dashboard (3 files)
│   ├── features/    # Feature module pages (21 files)
│   └── ui/          # Reusable UI components (9 files)
├── data/
│   └── features.js  # All 85+ feature definitions
├── stores/
│   └── builderStore.js  # Zustand stores with full CRUD
├── App.jsx          # Main routing
└── main.jsx         # Entry point
```

## Production Build

```bash
npm run build
# Output in dist/
```

Built for construction, field service, and contracting businesses.
