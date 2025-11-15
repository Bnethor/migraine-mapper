# Database Schema Git Workflow

## How It Works

### For the First Developer (You - Creating the Schema)

1. **Create schema files** - These ARE committed to git:
   ```bash
   git add migraine-tracker-api/db/init.sql
   git add migraine-tracker-api/db/migration_*.sql
   git commit -m "feat: add database schema"
   git push
   ```

2. **Schema files are now in the repository** - Other developers can clone them

### For Other Developers (Setting Up Their Environment)

1. **Clone the repository:**
   ```bash
   git clone <your-repo>
   cd Junction2025
   ```

2. **Run the setup script:**
   ```bash
   ./setup-db.sh
   ```

3. **What happens automatically:**
   - ✅ PostgreSQL starts in Docker
   - ✅ Schema files (init.sql, migrations) are executed
   - ✅ Database is initialized
   - 🔧 **THEN:** Schema files are marked as "locally ignored"
   ```bash
   git update-index --assume-unchanged db/init.sql
   git update-index --assume-unchanged db/migration_*.sql
   ```

4. **Result:** 
   - Schema files still exist in the repo
   - But local changes to them won't show in `git status`
   - Each developer can modify their local database schema independently

## Why This Approach?

### ✅ Benefits

- **Team shares initial schema** - Everyone starts with the same database structure
- **Local freedom** - Developers can experiment with schema changes locally
- **No accidental commits** - Local DB tweaks won't pollute git history
- **Clean git status** - `git status` won't show schema files as modified

### 📋 Example Workflow

**Initial state (repo):**
```bash
git clone repo
ls migraine-tracker-api/db/
# init.sql ✅ (tracked)
# migration_001_*.sql ✅ (tracked)
```

**After running setup-db.sh:**
```bash
./setup-db.sh
# ... setup completes ...
# 🔧 Configuring git to ignore local database file changes...
# ✅ Database files marked as locally ignored

# Now if you modify the schema locally:
echo "-- local change" >> migraine-tracker-api/db/init.sql

git status
# (no changes shown) ✅
```

## Managing Schema Files

### Check Which Files Are Locally Ignored

```bash
cd migraine-tracker-api
git ls-files -v | grep "^h"
# h db/init.sql
# h db/migration_001_add_clinical_fields.sql
# h db/migration_002_user_profile.sql
```

### Re-enable Tracking (If You Want to Commit Schema Changes)

```bash
cd migraine-tracker-api
git update-index --no-assume-unchanged db/init.sql
git update-index --no-assume-unchanged db/migration_*.sql

# Now changes will show in git status
git status
# modified: db/init.sql ✅
```

### Re-disable Tracking (After Committing)

```bash
git add db/init.sql
git commit -m "feat: update database schema"
git push

# Mark as locally ignored again
git update-index --assume-unchanged db/init.sql
```

## Creating New Migrations

When you need to create a new migration that the WHOLE TEAM should use:

```bash
# 1. Create the migration file
cd migraine-tracker-api
touch db/migration_003_new_feature.sql

# 2. Write your SQL
nano db/migration_003_new_feature.sql

# 3. Commit it (it's a NEW file, so it's automatically tracked)
git add db/migration_003_new_feature.sql
git commit -m "feat: add migration for new feature"
git push

# 4. Update setup-db.sh to include this migration in the auto-ignore list
nano setup-db.sh
# Add: git update-index --assume-unchanged db/migration_003_new_feature.sql
```

## Troubleshooting

### I want to see my local schema changes in git status

```bash
cd migraine-tracker-api
git update-index --no-assume-unchanged db/init.sql
git status
# Now shows: modified: db/init.sql
```

### I accidentally committed local schema changes

```bash
# Undo the commit (keep changes)
git reset HEAD~1

# Mark files as locally ignored again
git update-index --assume-unchanged db/init.sql
```

### Setup script didn't mark files as ignored

```bash
# Manually mark them
cd migraine-tracker-api
git update-index --assume-unchanged db/init.sql
git update-index --assume-unchanged db/migration_001_add_clinical_fields.sql
git update-index --assume-unchanged db/migration_002_user_profile.sql
```

### New developer wants to reset to original schema

```bash
# 1. Remove local ignore flag
git update-index --no-assume-unchanged db/init.sql

# 2. Reset to repo version
git checkout HEAD -- db/init.sql

# 3. Re-mark as locally ignored
git update-index --assume-unchanged db/init.sql

# 4. Re-run migrations
docker exec -i migraine-tracker-db psql -U migraineuser -d migrainetracker < db/init.sql
```

## Summary

| Stage | Schema Files Status | Git Behavior |
|-------|-------------------|--------------|
| **Initial Commit** | ✅ Tracked in repo | Changes show in `git status` |
| **After `setup-db.sh`** | 🔒 Locally ignored | Changes DON'T show in `git status` |
| **Create new migration** | ✅ Tracked (new file) | Shows in `git status` until added to ignore list |

## Commands Quick Reference

```bash
# Mark file as locally ignored (after setup)
git update-index --assume-unchanged <file>

# Re-enable tracking for a file
git update-index --no-assume-unchanged <file>

# List all locally ignored files
git ls-files -v | grep "^h"

# Reset locally ignored file to repo version
git update-index --no-assume-unchanged <file>
git checkout HEAD -- <file>
git update-index --assume-unchanged <file>
```

## Best Practices

1. ✅ **Commit schema files initially** - Team needs them
2. ✅ **Run setup-db.sh** - Automatically handles local ignore
3. ✅ **Experiment locally** - Your changes won't affect git
4. ✅ **New migrations = new files** - Commit them for the team
5. ❌ **Don't modify original files** - Create new migrations instead
6. ✅ **Document breaking changes** - In the migration file or README

This workflow gives you the best of both worlds: shared initial schema + local freedom! 🎯

