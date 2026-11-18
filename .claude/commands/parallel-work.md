---
description: Set up Git worktrees for parallel feature development
---

You are tasked with setting up Git worktrees for parallel feature development.

## Input Format

The user will provide feature names as arguments. Examples:
- `/parallel-work receipt-upload budget-alerts dark-mode`
- `/parallel-work user-auth recurring-expenses`
- `/parallel-work analytics-v2 export-enhancements`

## Your Task

For each feature mentioned, create a complete worktree environment for parallel development.

### Step 1: Analyze Feature List

Parse the provided features and:
1. Clean up feature names (convert to kebab-case)
2. Identify if features are clearly explained or need division
3. Suggest feature breakdown if too broad
4. Confirm with user if unclear

### Step 2: Create Worktrees

For each feature:

```bash
# Create worktree at ../expense-tracker-[feature-name]
git worktree add -b feature/[feature-name] ../expense-tracker-[feature-name]
```

**Naming Convention:**
- Directory: `../expense-tracker-[feature-name]`
- Branch: `feature/[feature-name]`
- Use kebab-case (e.g., `receipt-upload`, `budget-alerts`)

### Step 3: Set Up Development Environment

For each worktree created:

1. **Navigate to worktree:**
   ```bash
   cd ../expense-tracker-[feature-name]
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Verify setup:**
   ```bash
   git status
   git branch -vv
   ```

4. **Create initial README (optional):**
   ```bash
   echo "# Feature: [Feature Name]" > FEATURE.md
   echo "" >> FEATURE.md
   echo "## Overview" >> FEATURE.md
   echo "[Description of feature]" >> FEATURE.md
   ```

### Step 4: List All Worktrees

```bash
git worktree list
```

Display in a formatted table showing:
- Directory path
- Branch name
- Current commit
- Purpose

### Step 5: Explain Isolation

For each worktree, explain:

**What's Isolated:**
- Working directory (separate file system location)
- Index/staging area
- HEAD (different branch checked out)
- Uncommitted changes
- node_modules (can install different dependencies)
- Dev server (can run on different ports)
- .env files (can have different configurations)

**What's Shared:**
- Git repository (.git directory)
- All commits (visible across worktrees)
- All branches
- Remote configuration
- Tags and stashes

### Step 6: Create Port Configuration

Assign ports to avoid conflicts:
- Main: 3000
- Feature 1: 3001
- Feature 2: 3002
- Feature 3: 3003
- etc.

Create `.env.local` in each worktree with assigned port.

### Step 7: Generate Workflow Documentation

Create a markdown file: `PARALLEL-WORKFLOW.md` with:

```markdown
# Parallel Feature Development

## Active Worktrees

| Feature | Directory | Branch | Port |
|---------|-----------|--------|------|
| [Name] | [Path] | feature/[name] | [Port] |

## Quick Start

### [Feature Name 1]
```bash
cd ~/expense-tracker-[feature-1]
npm run dev  # Port [PORT]
```

### [Feature Name 2]
```bash
cd ~/expense-tracker-[feature-2]
PORT=[PORT] npm run dev
```

## Development Workflow

1. **Choose a feature to work on**
2. **Navigate to its worktree**
3. **Start dev server**
4. **Make changes and commit**
5. **Repeat for other features**

## Integration

When features are ready:
```bash
cd ~/expense-tracker-ai
git checkout -b integration/[combined-features]
git merge feature/[feature-1]
git merge feature/[feature-2]
npm run build
```

## Cleanup

After merging:
```bash
git worktree remove ~/expense-tracker-[feature-name]
git branch -d feature/[feature-name]
```
```

### Step 8: Create Shell Aliases (Optional)

Suggest useful aliases for ~/.zshrc or ~/.bashrc:

```bash
# Navigation aliases
alias expense-[feature-1]='cd ~/expense-tracker-[feature-1]'
alias expense-[feature-2]='cd ~/expense-tracker-[feature-2]'

# Dev server aliases
alias dev-[feature-1]='cd ~/expense-tracker-[feature-1] && npm run dev'
alias dev-[feature-2]='cd ~/expense-tracker-[feature-2] && PORT=[PORT] npm run dev'
```

## Error Handling

### If Feature Names Are Unclear

Ask the user for clarification:
```
I see you want to work on "[broad-feature]". This could mean:
1. [Specific sub-feature A]
2. [Specific sub-feature B]
3. [Specific sub-feature C]

Would you like me to:
- Create separate worktrees for each sub-feature?
- Create one worktree for the broader feature?
- Help you divide it into smaller features?
```

### If Worktree Already Exists

```bash
# Check if directory exists
if [ -d "../expense-tracker-[feature-name]" ]; then
  echo "Worktree already exists. Options:"
  echo "1. Remove and recreate: git worktree remove [path]"
  echo "2. Use existing worktree"
  echo "3. Choose different name"
fi
```

### If Branch Already Exists

```bash
# If branch exists but not checked out
git worktree add ../expense-tracker-[feature-name] feature/[feature-name]

# If branch is checked out elsewhere
echo "Branch is already checked out in another worktree."
echo "Use: git worktree list to see where"
```

## Output Format

Provide the user with:

1. **Summary of what was created:**
   ```
   ✅ Created 3 worktrees for parallel development:

   1. Receipt Upload
      - Path: /Users/[user]/expense-tracker-receipt-upload
      - Branch: feature/receipt-upload
      - Port: 3001

   2. Budget Alerts
      - Path: /Users/[user]/expense-tracker-budget-alerts
      - Branch: feature/budget-alerts
      - Port: 3002

   3. Dark Mode
      - Path: /Users/[user]/expense-tracker-dark-mode
      - Branch: feature/dark-mode
      - Port: 3003
   ```

2. **Quick start commands for each feature**

3. **Explanation of isolation**

4. **Reference to PARALLEL-WORKFLOW.md**

5. **Suggested next steps**

## Best Practices

### Feature Division Guidelines

**Good Feature Sizes (Parallel-Friendly):**
- Small, focused features (1-3 days work)
- Independent features (minimal overlap)
- Clear scope and boundaries
- Can be tested independently

**Features to Subdivide:**
- "Improve UI" → Split into specific components
- "Add backend" → Split by API endpoints
- "Refactor" → Split by module/component

**Features That Work Well in Parallel:**
- UI components (different components)
- Different API endpoints
- Different pages/routes
- Feature additions (not refactors)
- Independent utilities

**Features That Don't Work Well in Parallel:**
- Major refactors affecting same files
- Database schema changes
- Core architecture changes
- Overlapping file modifications

### Recommended Feature Combinations

**Good Parallel Combinations:**
- Frontend + Backend (different files)
- Component A + Component B (different components)
- Feature X + Feature Y (independent features)

**Avoid Parallel Work On:**
- Same component from different angles
- Shared utility files
- Global state management
- Configuration files

## Example Usage

### Example 1: Three Features
```
User: /parallel-work receipt-upload budget-alerts dark-mode

Output:
- Creates 3 worktrees
- Assigns ports 3001-3003
- Generates workflow guide
- Provides quick start commands
```

### Example 2: Broad Feature Needs Division
```
User: /parallel-work improve-dashboard

Response:
"I see you want to improve the dashboard. This is quite broad.
Would you like me to split this into:
1. Dashboard charts enhancement
2. Dashboard filters upgrade
3. Dashboard performance optimization

Or would you prefer to work on the entire dashboard in one worktree?"
```

### Example 3: Related Features
```
User: /parallel-work user-login user-signup user-profile

Response:
"These features are related (authentication system). Recommendations:
- Option A: Create 3 separate worktrees (if they can be independent)
- Option B: Create 1 worktree called 'authentication-system'
- Option C: Create 2 worktrees (auth-flow + user-profile)

Which approach would you prefer?"
```

## Important Notes

- Always check current branch and commit changes before creating worktrees
- Suggest committing or stashing uncommitted changes first
- Warn if disk space might be an issue (multiple node_modules)
- Provide cleanup instructions
- Document port assignments to avoid conflicts

## After Creation

Remind the user:

1. **Each worktree is independent** - changes in one don't affect others
2. **Install dependencies in each worktree** - they may diverge
3. **Use different ports** - avoid server conflicts
4. **Commit regularly** - commits are shared across worktrees
5. **Integration branch** - use when combining features
6. **Clean up when done** - remove worktrees after merging

## Follow-up Actions

After setting up worktrees, offer to:
- Create feature-specific documentation for each
- Set up integration testing workflow
- Configure VS Code workspace file
- Create GitHub PR templates for each feature
- Set up feature flags (if applicable)
