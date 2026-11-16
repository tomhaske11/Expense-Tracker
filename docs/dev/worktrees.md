# Git Worktrees Setup Guide

**Created:** 2026-09-03
**Purpose:** Parallel development of multiple features without branch switching

---

## Overview

This project uses **Git worktrees** to enable simultaneous development of multiple features. Each worktree is an isolated working directory with its own branch, allowing you to work on different features in parallel without conflicts or context switching.

## Worktree Structure

```
~/
├── expense-tracker-ai/              # Main worktree (main branch)
│   ├── .git/                        # Actual Git repository
│   └── [project files]
│
├── expense-tracker-export/          # Data export worktree
│   ├── .git                         # Link to main .git
│   ├── [project files]              # Isolated copy
│   └── branch: feature/data-export
│
└── expense-tracker-analytics/       # Analytics worktree
    ├── .git                         # Link to main .git
    ├── [project files]              # Isolated copy
    └── branch: feature/analytics-dashboard
```

## Active Worktrees

| Directory | Branch | Purpose | Commit |
|-----------|--------|---------|--------|
| `/Users/thomashaskell/expense-tracker-ai` | `main` | Main development, merging features | f8d9789 |
| `/Users/thomashaskell/expense-tracker-export` | `feature/data-export` | CSV, PDF, JSON export system | f8d9789 |
| `/Users/thomashaskell/expense-tracker-analytics` | `feature/analytics-dashboard` | Charts, insights, trends | f8d9789 |

---

## What Each Worktree Contains

### 1. Main Worktree (`expense-tracker-ai/`)

**Branch:** `main`
**Purpose:** Stable codebase and integration point

**Contains:**
- Production-ready code
- Complete expense tracking app
- Documentation infrastructure
- Code analysis files
- All committed features

**Use for:**
- Merging completed features
- Creating releases
- Running production builds
- Documentation updates

---

### 2. Export Worktree (`expense-tracker-export/`)

**Branch:** `feature/data-export`
**Purpose:** Developing data export functionality

**Starting State:**
- Complete copy of main branch (f8d9789)
- All existing features and components
- Clean working directory

**Planned Features:**
- CSV export functionality
- PDF report generation
- JSON data export
- Export filtering and configuration
- Export templates
- Batch export operations

**Files to Create/Modify:**
- `components/ExportModal.tsx` (new)
- `lib/exportService.ts` (new)
- `components/Dashboard.tsx` (modify - add export CTA)
- `package.json` (add jsPDF, etc.)
- `types/export.ts` (new)

**Isolation Benefits:**
- Can install export-specific dependencies without affecting other work
- Can run dev server on different port
- Changes won't interfere with analytics work
- Can commit export progress independently

---

### 3. Analytics Worktree (`expense-tracker-analytics/`)

**Branch:** `feature/analytics-dashboard`
**Purpose:** Developing analytics and insights features

**Starting State:**
- Complete copy of main branch (f8d9789)
- All existing features and components
- Clean working directory

**Planned Features:**
- Advanced charts (line, bar, area)
- Spending trends over time
- Category insights and comparisons
- Budget vs. actual analysis
- Prediction/forecasting
- Custom date range analytics
- Export analytics as images

**Files to Create/Modify:**
- `components/AnalyticsDashboard.tsx` (new)
- `components/charts/` (new directory)
  - `TrendChart.tsx`
  - `ComparisonChart.tsx`
  - `InsightCards.tsx`
- `lib/analyticsEngine.ts` (new)
- `lib/chartUtils.ts` (new)
- `types/analytics.ts` (new)
- `app/analytics/page.tsx` (new route)

**Isolation Benefits:**
- Can install chart libraries (recharts, d3) without conflicts
- Can experiment with different chart libraries
- Changes won't affect export feature
- Can commit analytics progress independently

---

## How Worktrees Work

### What is Isolated

Each worktree has its own:
- ✅ **Working directory** - Separate file system directory
- ✅ **Index** - Separate staging area
- ✅ **HEAD** - Different branch checked out
- ✅ **Uncommitted changes** - Modifications are local to each worktree
- ✅ **node_modules** - Each worktree can have different dependencies
- ✅ **Dev server** - Can run different servers simultaneously

### What is Shared

All worktrees share:
- 🔄 **Git repository** - Same `.git` directory (in main worktree)
- 🔄 **Commits** - Commits made in any worktree are visible to all
- 🔄 **Branches** - All branches are shared
- 🔄 **Remotes** - Same remote configuration
- 🔄 **Stashes** - Git stashes are shared
- 🔄 **Tags** - Git tags are shared

### Branch Protection

**Important:** You cannot have the same branch checked out in multiple worktrees simultaneously.

If you try:
```bash
cd expense-tracker-export
git checkout feature/analytics-dashboard  # ERROR!
```

Git will prevent this to avoid conflicts.

---

## Common Workflows

### Working on Export Feature

```bash
# Navigate to export worktree
cd ~/expense-tracker-export

# Install dependencies (if needed)
npm install jspdf jspdf-autotable

# Start development server
npm run dev  # Runs on port 3000

# Make changes
# ... edit files ...

# Stage and commit
git add components/ExportModal.tsx lib/exportService.ts
git commit -m "Add CSV export functionality"

# Push feature branch
git push -u origin feature/data-export
```

### Working on Analytics Feature

```bash
# Navigate to analytics worktree
cd ~/expense-tracker-analytics

# Install dependencies (if needed)
npm install d3 react-chartjs-2

# Start development server on different port
PORT=3001 npm run dev  # Runs on port 3001

# Make changes
# ... edit files ...

# Stage and commit
git add components/AnalyticsDashboard.tsx
git commit -m "Add trend analysis charts"

# Push feature branch
git push -u origin feature/analytics-dashboard
```

### Switching Between Features

**No need to switch branches!** Just change directories:

```bash
# Work on export
cd ~/expense-tracker-export
code .  # Open in VS Code

# Work on analytics (in a new terminal/window)
cd ~/expense-tracker-analytics
code .  # Open in another VS Code window
```

### Merging Features to Main

**Option 1: Merge via main worktree**
```bash
cd ~/expense-tracker-ai

# Merge export feature
git merge feature/data-export

# Merge analytics feature
git merge feature/analytics-dashboard

# Push to remote
git push origin main
```

**Option 2: Merge via Pull Requests**
```bash
# From either worktree
cd ~/expense-tracker-export
git push -u origin feature/data-export

# Then create PR on GitHub
gh pr create --title "Add data export system" --base main
```

### Syncing Worktrees

If main gets updated, sync your feature branches:

```bash
# In export worktree
cd ~/expense-tracker-export
git fetch origin
git merge origin/main  # Or git rebase origin/main

# In analytics worktree
cd ~/expense-tracker-analytics
git fetch origin
git merge origin/main  # Or git rebase origin/main
```

---

## Development Server Management

### Running Both Features Simultaneously

**Terminal 1: Export Feature**
```bash
cd ~/expense-tracker-export
npm run dev
# Server running at http://localhost:3000
```

**Terminal 2: Analytics Feature**
```bash
cd ~/expense-tracker-analytics
PORT=3001 npm run dev
# Server running at http://localhost:3001
```

**Terminal 3: Main Branch**
```bash
cd ~/expense-tracker-ai
PORT=3002 npm run dev
# Server running at http://localhost:3002
```

Now you can test all three versions at once!

### Avoiding Port Conflicts

**Option 1: Use different ports**
```bash
PORT=3001 npm run dev
```

**Option 2: Create port config in each worktree**
```bash
# In expense-tracker-export/
echo "PORT=3000" > .env.local

# In expense-tracker-analytics/
echo "PORT=3001" > .env.local
```

---

## Best Practices

### ✅ DO

1. **Commit Regularly**
   - Each worktree can commit independently
   - Small, focused commits per feature

2. **Keep Features Isolated**
   - Export worktree: Only export-related changes
   - Analytics worktree: Only analytics-related changes

3. **Use Descriptive Commits**
   - Feature-specific commit messages
   - Reference issue numbers

4. **Sync with Main Periodically**
   - Pull main updates into feature branches
   - Resolve conflicts early

5. **Install Dependencies per Worktree**
   - Each worktree can have different `node_modules`
   - Run `npm install` in each worktree as needed

### ❌ DON'T

1. **Don't Checkout Same Branch**
   - Never checkout a branch that's already checked out in another worktree

2. **Don't Forget Which Worktree You're In**
   - Use `git branch -vv` to see current branch
   - Configure your shell prompt to show worktree/branch

3. **Don't Modify Main Directly**
   - Always work in feature branches
   - Merge to main when features are complete

4. **Don't Share node_modules**
   - Each worktree should have its own dependencies
   - Don't symlink `node_modules` between worktrees

---

## Useful Commands

### List All Worktrees
```bash
git worktree list
```

### Check Current Worktree Info
```bash
git worktree list --porcelain
```

### See Which Branch is Checked Out Where
```bash
git branch -vv
```

### Remove a Worktree (When Feature is Done)
```bash
# First, merge the feature
cd ~/expense-tracker-ai
git merge feature/data-export

# Then remove the worktree
git worktree remove ~/expense-tracker-export

# Delete the branch (optional)
git branch -d feature/data-export
```

### Prune Deleted Worktrees
```bash
git worktree prune
```

### Move a Worktree
```bash
git worktree move ~/expense-tracker-export ~/new-location/export
```

---

## Troubleshooting

### Problem: "fatal: 'feature/data-export' is already checked out"

**Cause:** Trying to checkout a branch that's active in another worktree

**Solution:**
```bash
# Find where it's checked out
git worktree list

# Either work in that worktree, or create a new branch
git checkout -b feature/data-export-v2
```

### Problem: Can't delete worktree

**Cause:** Worktree directory was manually deleted

**Solution:**
```bash
# Prune stale worktree references
git worktree prune

# Or force remove
git worktree remove --force ~/expense-tracker-export
```

### Problem: Changes appear in wrong worktree

**Cause:** You're in the wrong directory

**Solution:**
```bash
# Always check where you are
pwd
git branch

# Navigate to correct worktree
cd ~/expense-tracker-export
```

### Problem: Merge conflicts when syncing

**Cause:** Main branch has conflicting changes

**Solution:**
```bash
# In feature worktree
git fetch origin
git merge origin/main

# Resolve conflicts
# ... edit files ...

git add .
git commit -m "Merge main into feature"
```

---

## VS Code Setup

### Opening Multiple Worktrees

**Option 1: Multiple Windows**
```bash
# Open export in one window
cd ~/expense-tracker-export
code .

# Open analytics in another window
cd ~/expense-tracker-analytics
code .
```

**Option 2: Workspace File**

Create `expense-tracker.code-workspace`:
```json
{
  "folders": [
    {
      "name": "Main",
      "path": "/Users/thomashaskell/expense-tracker-ai"
    },
    {
      "name": "Export Feature",
      "path": "/Users/thomashaskell/expense-tracker-export"
    },
    {
      "name": "Analytics Feature",
      "path": "/Users/thomashaskell/expense-tracker-analytics"
    }
  ],
  "settings": {
    "git.enabled": true,
    "git.showInlineOpenFileAction": true
  }
}
```

Then: `code expense-tracker.code-workspace`

---

## Feature Development Timeline

### Phase 1: Data Export Feature (Week 1-2)

**Location:** `~/expense-tracker-export`
**Branch:** `feature/data-export`

**Tasks:**
- [ ] Design export UI/UX
- [ ] Implement CSV export
- [ ] Implement PDF export with jsPDF
- [ ] Implement JSON export
- [ ] Add filtering options
- [ ] Create export templates
- [ ] Add export preview
- [ ] Write tests
- [ ] Update documentation
- [ ] Create PR

### Phase 2: Analytics Dashboard (Week 1-2, Parallel)

**Location:** `~/expense-tracker-analytics`
**Branch:** `feature/analytics-dashboard`

**Tasks:**
- [ ] Design analytics layout
- [ ] Implement trend charts
- [ ] Add comparison charts
- [ ] Create insight cards
- [ ] Add date range selector
- [ ] Implement prediction engine
- [ ] Add chart export
- [ ] Write tests
- [ ] Update documentation
- [ ] Create PR

### Phase 3: Integration (Week 3)

**Location:** `~/expense-tracker-ai`
**Branch:** `main`

**Tasks:**
- [ ] Merge export feature
- [ ] Merge analytics feature
- [ ] Resolve any conflicts
- [ ] Integration testing
- [ ] Update main documentation
- [ ] Create release

---

## Quick Reference

### Commands Cheat Sheet

```bash
# List all worktrees
git worktree list

# Create new worktree
git worktree add -b <branch-name> <path>

# Remove worktree
git worktree remove <path>

# Check current status
git status
git branch -vv

# Switch to worktree (just cd)
cd ~/expense-tracker-export

# Merge feature to main
cd ~/expense-tracker-ai
git merge feature/data-export
```

### Directory Structure

```
~/expense-tracker-ai/        → main branch
~/expense-tracker-export/    → feature/data-export
~/expense-tracker-analytics/ → feature/analytics-dashboard
```

### Port Assignments

- Main: `http://localhost:3000` (or 3002)
- Export: `http://localhost:3000` (default)
- Analytics: `http://localhost:3001`

---

## Cleanup (When Features are Complete)

After both features are merged:

```bash
# Navigate to main
cd ~/expense-tracker-ai

# Verify features are merged
git log --oneline --graph

# Remove export worktree
git worktree remove ~/expense-tracker-export
git branch -d feature/data-export

# Remove analytics worktree
git worktree remove ~/expense-tracker-analytics
git branch -d feature/analytics-dashboard

# Verify cleanup
git worktree list
# Should only show: ~/expense-tracker-ai [main]
```

---

**Questions or Issues?**

- See Git worktree documentation: `git help worktree`
- Check this guide for common workflows
- Use `git worktree list` to see current state

**Last Updated:** 2026-09-03
