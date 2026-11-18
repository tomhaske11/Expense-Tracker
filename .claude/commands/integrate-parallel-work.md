---
description: Integrate features developed in parallel worktrees
---

You are tasked with integrating features that were developed in parallel worktrees.

## Input Format

The user will provide feature names as arguments. Examples:
- `/integrate-parallel-work receipt-upload budget-alerts dark-mode`
- `/integrate-parallel-work user-auth recurring-expenses`
- `/integrate-parallel-work analytics-v2 export-enhancements`

## Your Task

Safely integrate multiple features that were developed in parallel into a single integration branch, test them together, and prepare for merging to main.

---

## Step 1: Pre-Integration Checks

Before starting integration:

1. **Check current branch and status:**
   ```bash
   git status
   git branch -vv
   ```

2. **Verify all feature branches exist:**
   ```bash
   for feature in [feature-names]; do
     git show-ref --verify --quiet refs/heads/feature/$feature || echo "⚠️ Branch feature/$feature not found"
   done
   ```

3. **Check for uncommitted changes:**
   ```bash
   if [[ -n $(git status -s) ]]; then
     echo "⚠️ You have uncommitted changes. Please commit or stash them first."
     git status
     exit 1
   fi
   ```

4. **Ensure we're on main or a clean state:**
   ```bash
   git checkout main
   git pull origin main  # If remote exists
   ```

5. **List all worktrees to confirm setup:**
   ```bash
   git worktree list
   ```

---

## Step 2: Create Integration Branch

```bash
# Create integration branch from current main
git checkout -b integration/parallel-features

echo "✅ Created integration branch: integration/parallel-features"
git log --oneline -1
```

**Branch Naming:**
- Default: `integration/parallel-features`
- Alternative: `integration/[feature1]-[feature2]-[feature3]` (if specific)
- Or ask user for preference

---

## Step 3: Merge Features Sequentially

For each feature provided, merge one at a time:

### Merge Strategy

```bash
# For each feature
for feature in [feature-names]; do
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "🔀 Merging feature: $feature"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  # Attempt merge
  if git merge feature/$feature --no-edit; then
    echo "✅ Successfully merged feature/$feature"
    git log --oneline -1
  else
    echo "⚠️ MERGE CONFLICT detected in feature/$feature"
    echo "Current conflicts:"
    git status
    # Pause for conflict resolution
    break
  fi

  echo ""
done
```

### Order of Merging

**Suggested order (least to most complex):**
1. Independent utilities/helpers first
2. UI components next
3. Features with dependencies last
4. Most complex/risky features last

Ask user if they want to specify order or use alphabetical.

---

## Step 4: Handle Merge Conflicts

If conflicts occur:

### A. Identify Conflicts

```bash
echo "📋 Files with conflicts:"
git diff --name-only --diff-filter=U

echo ""
echo "📝 Detailed conflict view:"
git status
```

### B. Show Conflict Details

For each conflicted file:
```bash
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Conflicts in: [filename]"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
git diff [filename]
```

### C. Resolution Options

Present options to user:

```
Conflict Resolution Options:

1. 🔍 View conflict details
   git diff --ours --theirs [file]

2. ✏️ Manual resolution
   - Open files with <<<<<<< markers
   - Edit to resolve conflicts
   - Remove conflict markers
   - Save files

3. 🎯 Accept ours (keep integration branch version)
   git checkout --ours [file]

4. 🎯 Accept theirs (keep feature branch version)
   git checkout --theirs [file]

5. 🔧 Use merge tool
   git mergetool

After resolving:
   git add [resolved-files]
   git commit -m "Resolve merge conflicts between features"
```

### D. Conflict Analysis

For common conflict types, provide guidance:

**Package.json conflicts:**
```bash
# Both branches added dependencies
echo "Dependency conflict detected. You need to:"
echo "1. Keep all unique dependencies from both branches"
echo "2. If same dependency, use newer version"
echo "3. Run 'npm install' after resolving"
```

**Component conflicts:**
```bash
# Both branches modified same component
echo "Component conflict detected in: [component]"
echo "Analyze both implementations and:"
echo "1. Combine features if possible"
echo "2. Keep the more complete implementation"
echo "3. Add missing features from other branch manually"
```

### E. Continue After Resolution

```bash
# After all conflicts resolved
git add .
git commit -m "Resolve merge conflicts between [feature-list]"

# Continue with remaining features
# ... resume merge loop
```

---

## Step 5: Install Dependencies

After all merges complete:

```bash
echo "📦 Installing dependencies..."
npm install

# Check for dependency conflicts
if [ $? -eq 0 ]; then
  echo "✅ Dependencies installed successfully"
  echo "Installed packages:"
  npm list --depth=0 | head -20
else
  echo "⚠️ Dependency installation failed"
  echo "This may indicate conflicting dependency versions"
  exit 1
fi
```

---

## Step 6: Test Integration

### A. TypeScript/Build Check

```bash
echo "🔨 Building project..."
npm run build

if [ $? -eq 0 ]; then
  echo "✅ Build successful"
else
  echo "❌ Build failed. Errors must be resolved before continuing."
  exit 1
fi
```

### B. Run Tests (if available)

```bash
echo "🧪 Running tests..."

if [ -f "package.json" ] && grep -q "\"test\"" package.json; then
  npm test

  if [ $? -eq 0 ]; then
    echo "✅ All tests passed"
  else
    echo "⚠️ Some tests failed. Review output above."
  fi
else
  echo "ℹ️ No test script found. Skipping automated tests."
fi
```

### C. Manual Testing Checklist

Generate checklist for user:

```markdown
## Manual Testing Checklist

Test each integrated feature:

### Feature: [Feature 1 Name]
- [ ] Feature loads without errors
- [ ] Core functionality works
- [ ] UI renders correctly
- [ ] No console errors
- [ ] No conflicts with other features

### Feature: [Feature 2 Name]
- [ ] Feature loads without errors
- [ ] Core functionality works
- [ ] UI renders correctly
- [ ] No console errors
- [ ] No conflicts with other features

### Integration Testing
- [ ] All features work together
- [ ] No UI conflicts/overlap
- [ ] Performance is acceptable
- [ ] No regression in existing features
- [ ] Dependencies don't conflict

### Testing Instructions
```bash
# Start dev server
npm run dev

# Open http://localhost:3000
# Test each feature manually
# Check browser console for errors
```
```

---

## Step 7: Run Development Server for Manual Testing

```bash
echo "🚀 Starting development server for testing..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Kill any running servers
pkill -f "next dev" 2>/dev/null || true

# Start server in background
npm run dev &
SERVER_PID=$!

# Wait for server to start
sleep 3

echo ""
echo "✅ Server running at http://localhost:3000"
echo "Server PID: $SERVER_PID"
echo ""
echo "📋 Please test all features manually:"
echo "   1. Test each feature individually"
echo "   2. Test features working together"
echo "   3. Check for console errors"
echo "   4. Verify no UI conflicts"
echo ""
echo "When done testing, press Ctrl+C or run: kill $SERVER_PID"
```

---

## Step 8: Generate Integration Report

Create `INTEGRATION-REPORT-[date].md`:

```markdown
# Feature Integration Report

**Integration Branch:** integration/parallel-features
**Date:** [Current Date]
**Features Integrated:** [List of features]

---

## Integration Summary

### Features Merged

| Feature | Branch | Status | Conflicts |
|---------|--------|--------|-----------|
| [Name1] | feature/[name1] | ✅ Merged | None |
| [Name2] | feature/[name2] | ✅ Merged | Resolved |
| [Name3] | feature/[name3] | ✅ Merged | None |

### Merge Timeline

1. **[Time]** - Created integration branch from main
2. **[Time]** - Merged feature/[name1] (clean merge)
3. **[Time]** - Merged feature/[name2] (conflicts in [files])
4. **[Time]** - Resolved conflicts
5. **[Time]** - Merged feature/[name3] (clean merge)
6. **[Time]** - Installed dependencies
7. **[Time]** - Build successful
8. **[Time]** - Tests passed

---

## Files Changed

### Summary
- Files added: [count]
- Files modified: [count]
- Files deleted: [count]
- Total changes: +[lines] -[lines]

### Detailed Changes
[List major file changes]

---

## Conflicts Resolved

### [Feature Name] Conflicts

**Files affected:**
- [filename1]
- [filename2]

**Resolution:**
[Description of how conflicts were resolved]

---

## Dependencies Added

| Package | Version | Feature | Purpose |
|---------|---------|---------|---------|
| [pkg1] | [ver] | [feature] | [purpose] |
| [pkg2] | [ver] | [feature] | [purpose] |

---

## Testing Results

### Build Status
✅ TypeScript compilation: Passed
✅ Production build: Passed ([time])
✅ No build warnings

### Test Status
✅ Unit tests: [X/Y passed]
✅ Integration tests: [X/Y passed]
⏳ Manual testing: Pending

### Manual Testing Checklist
- [ ] Feature 1 works correctly
- [ ] Feature 2 works correctly
- [ ] Feature 3 works correctly
- [ ] Features work together
- [ ] No performance issues
- [ ] No console errors

---

## Known Issues

[List any issues discovered during integration]

---

## Next Steps

### Option 1: Merge to Main (if all tests pass)

```bash
git checkout main
git merge integration/parallel-features
git push origin main
```

### Option 2: Fix Issues (if problems found)

```bash
# Stay on integration branch
# Make fixes
git commit -m "Fix integration issues"
# Re-test
npm run build
```

### Option 3: Clean Up After Merge

```bash
# Delete integration branch
git branch -d integration/parallel-features

# Delete feature branches
git branch -d feature/[name1]
git branch -d feature/[name2]
git branch -d feature/[name3]

# Remove worktrees
git worktree remove ~/expense-tracker-[name1]
git worktree remove ~/expense-tracker-[name2]
git worktree remove ~/expense-tracker-[name3]
```

---

## Commit Graph

```
[ASCII graph showing merge structure]
```

---

## Sign-Off

- [ ] All features merged successfully
- [ ] All conflicts resolved
- [ ] Build passes
- [ ] Tests pass
- [ ] Manual testing complete
- [ ] Ready for main merge

**Integrated by:** [Name]
**Date:** [Date]
**Branch:** integration/parallel-features
```

---

## Step 9: Merge to Main (After Approval)

### A. Pre-Merge Checks

```bash
echo "📋 Pre-merge checklist:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check all tests pass
npm run build
if [ $? -ne 0 ]; then
  echo "❌ Build must pass before merging to main"
  exit 1
fi

# Verify on integration branch
current_branch=$(git branch --show-current)
if [ "$current_branch" != "integration/parallel-features" ]; then
  echo "⚠️ Not on integration branch"
  exit 1
fi

# Check for uncommitted changes
if [[ -n $(git status -s) ]]; then
  echo "⚠️ Uncommitted changes exist"
  exit 1
fi

echo "✅ All pre-merge checks passed"
```

### B. Merge to Main

```bash
echo "🔀 Merging to main..."

# Switch to main
git checkout main

# Pull latest (if remote exists)
git pull origin main 2>/dev/null || echo "No remote, proceeding..."

# Merge integration branch
git merge integration/parallel-features --no-edit

if [ $? -eq 0 ]; then
  echo "✅ Successfully merged to main"
  git log --oneline --graph -5
else
  echo "❌ Merge to main failed"
  echo "This shouldn't happen if integration branch was properly tested"
  exit 1
fi
```

### C. Push to Remote (Optional)

```bash
# Ask user if they want to push
echo ""
echo "Push to remote? (y/n)"
read -r push_response

if [ "$push_response" = "y" ]; then
  git push origin main
  echo "✅ Pushed to origin/main"
else
  echo "ℹ️ Skipped push. You can push later with: git push origin main"
fi
```

---

## Step 10: Clean Up Branches and Worktrees

### A. Clean Up Branches

```bash
echo "🧹 Cleaning up branches..."

# Delete integration branch
git branch -d integration/parallel-features
echo "✅ Deleted integration/parallel-features"

# Delete feature branches
for feature in [feature-names]; do
  git branch -d feature/$feature
  echo "✅ Deleted feature/$feature"
done
```

### B. Clean Up Worktrees

```bash
echo "🧹 Cleaning up worktrees..."

# Remove each worktree
for feature in [feature-names]; do
  worktree_path="../expense-tracker-$feature"

  if [ -d "$worktree_path" ]; then
    git worktree remove "$worktree_path"
    echo "✅ Removed worktree: $worktree_path"
  fi
done

# Prune any stale references
git worktree prune
echo "✅ Pruned stale worktree references"
```

### C. Verify Cleanup

```bash
echo ""
echo "📋 Remaining worktrees:"
git worktree list

echo ""
echo "📋 Remaining branches:"
git branch -vv
```

---

## Error Handling

### If Build Fails During Integration

```
❌ Build failed after merging features

Possible causes:
1. TypeScript errors from conflicting changes
2. Missing dependencies
3. Breaking changes in one feature affecting another

Steps to fix:
1. Review build output for specific errors
2. Check if dependencies need updating: npm install
3. Look for TypeScript errors: npm run build
4. Fix errors in integration branch
5. Re-run build
6. Continue integration process
```

### If Tests Fail

```
❌ Tests failed after integration

Steps to fix:
1. Review test output
2. Identify which feature's tests are failing
3. Check if features are conflicting
4. Update tests to work with integrated features
5. Re-run tests
6. Continue when all tests pass
```

### If Manual Testing Finds Issues

```
⚠️ Issues found during manual testing

Steps:
1. Document the issue in INTEGRATION-REPORT.md
2. Stay on integration branch
3. Make fixes
4. Commit fixes
5. Re-test (build + manual)
6. Continue when issues resolved
```

---

## Output Format

Provide clear, structured output:

### Initial Summary

```
╔══════════════════════════════════════════════════════════════════╗
║          FEATURE INTEGRATION - STARTING                          ║
╚══════════════════════════════════════════════════════════════════╝

Features to integrate:
1. [Feature 1]
2. [Feature 2]
3. [Feature 3]

Process:
✓ Pre-integration checks
→ Create integration branch
→ Merge features sequentially
→ Resolve conflicts (if any)
→ Install dependencies
→ Run tests
→ Manual testing
→ Merge to main
→ Clean up
```

### Progress Updates

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Step 3/9: Merging Features
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔀 Merging feature/receipt-upload...
✅ Merged successfully (no conflicts)
   +245 lines, -12 lines

🔀 Merging feature/budget-alerts...
⚠️ CONFLICTS DETECTED
   Files: components/Dashboard.tsx
   [Conflict resolution instructions]
```

### Final Summary

```
╔══════════════════════════════════════════════════════════════════╗
║          FEATURE INTEGRATION - COMPLETE ✅                       ║
╚══════════════════════════════════════════════════════════════════╝

Integration Summary:
✅ 3 features merged successfully
✅ 2 conflicts resolved
✅ Dependencies installed (0 vulnerabilities)
✅ Build passed (4.2s)
✅ Tests passed (12/12)
⏳ Manual testing required

Integration branch: integration/parallel-features
Ready to merge to main: [Yes/No - pending manual testing]

Next steps:
1. Test at http://localhost:3000
2. Complete manual testing checklist
3. Run: /integrate-parallel-work --finalize (to merge to main)
```

---

## Advanced Options

### Option: --finalize

If user runs `/integrate-parallel-work --finalize`:
- Skip integration (already done)
- Go directly to merge to main
- Clean up branches and worktrees

### Option: --rollback

If user runs `/integrate-parallel-work --rollback`:
- Delete integration branch
- Return to main
- Keep feature branches intact
- Keep worktrees intact

### Option: --continue

If integration was interrupted (conflicts):
- Resume from current state
- Continue with remaining features
- Skip completed merges

---

## Best Practices Reminders

**Before Integration:**
- ✅ Commit all changes in feature branches
- ✅ Test each feature individually
- ✅ Update documentation
- ✅ Sync with latest main

**During Integration:**
- ✅ Merge one feature at a time
- ✅ Test after each merge
- ✅ Document conflict resolutions
- ✅ Keep integration branch clean

**After Integration:**
- ✅ Thorough manual testing
- ✅ Update CHANGELOG
- ✅ Clean up branches
- ✅ Remove worktrees
- ✅ Tag release (optional)

---

## Example Usage

### Example 1: Simple Integration (No Conflicts)

```
/integrate-parallel-work receipt-upload dark-mode

Output:
✅ Created integration/parallel-features
✅ Merged feature/receipt-upload (clean)
✅ Merged feature/dark-mode (clean)
✅ Build passed
✅ Tests passed
⏳ Manual testing required
```

### Example 2: Integration with Conflicts

```
/integrate-parallel-work feature-a feature-b feature-c

Output:
✅ Created integration/parallel-features
✅ Merged feature/feature-a (clean)
⚠️ Conflicts in feature/feature-b
   Files: Dashboard.tsx, package.json
   [Resolution instructions provided]
   [User resolves conflicts]
✅ Conflicts resolved
✅ Merged feature/feature-c (clean)
✅ Build passed
```

### Example 3: Full Workflow with Finalization

```
# Step 1: Integrate
/integrate-parallel-work auth-system dashboard-v2

# [Integration completes, manual testing done]

# Step 2: Finalize
/integrate-parallel-work --finalize

Output:
✅ Merged to main
✅ Cleaned up 2 feature branches
✅ Removed 2 worktrees
✅ Integration complete
```

---

## TodoWrite Integration

Use TodoWrite to track progress:

```typescript
[
  { content: "Pre-integration checks", status: "completed" },
  { content: "Create integration branch", status: "completed" },
  { content: "Merge feature 1", status: "completed" },
  { content: "Merge feature 2", status: "in_progress" },
  { content: "Merge feature 3", status: "pending" },
  { content: "Resolve conflicts", status: "pending" },
  { content: "Install dependencies", status: "pending" },
  { content: "Run build", status: "pending" },
  { content: "Run tests", status: "pending" },
  { content: "Manual testing", status: "pending" },
  { content: "Merge to main", status: "pending" },
  { content: "Clean up", status: "pending" }
]
```

---

## Final Notes

- Always create integration branch (never merge directly to main)
- Test thoroughly before merging to main
- Document all conflict resolutions
- Keep integration report for future reference
- Clean up only after successful main merge
- Consider creating a git tag for the integrated release
