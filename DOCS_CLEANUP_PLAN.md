# Documentation Cleanup Plan

## 📋 Current State Analysis

### Files by Category

#### ✅ **KEEP - Active Documentation**
1. **README_NEW.md** → Rename to **README.md** (main project documentation)
2. **.github/copilot-instructions.md** - Current copilot context
3. **LOCAL_TESTING_GUIDE.md** - Still relevant for development
4. **optimization_plan.md** - Future improvements roadmap

#### 🗂️ **ARCHIVE - Historical Issue Tracking** 
These document resolved issues. Move to `docs/archive/`:
1. **CRITICAL_SERVICE_DOWN.md** - Service outage (Oct 16)
2. **URGENT_FLOWISE_FIX.md** - Fixed Flowise URL (Oct 16)
3. **PRODUCTION_RESPONSIVENESS_ISSUE.md** - Fixed CSS issue (Oct 16)
4. **TAILWIND_V4_FIX.md** - Tailwind v4 migration (Oct 16)
5. **MCP_FIX_COMPLETE.md** - MCP setup issues (Oct 16)
6. **SUPABASE_MCP_FIX.md** - MCP port conflict (Oct 16)

#### 🔐 **KEEP GITIGNORED - Deployment Docs** 
Already ignored (contain secrets):
1. **MCP_CONFIGURED.md** - Has tokens & IPs
2. **DEPLOY_SUPABASE_SECRETS.md** - Deployment procedures
3. **MCP_SETUP_GUIDE.md** - Setup with tokens

#### 📚 **KEEP - Reference Documentation**
1. **SCHEMA_MIGRATION_SUMMARY.md** - Database schema reference
2. **SUPABASE_KEY_MIGRATION.md** - Key format migration guide

#### ❌ **DELETE - Legacy/Obsolete**
1. **README.md** - This is Supabase CLI documentation (!?), not our project

---

## 🎯 Recommended Actions

### 1. Delete Obsolete Files
```bash
# README.md is Supabase CLI docs, not ours!
rm README.md
```

### 2. Rename Main README
```bash
mv README_NEW.md README.md
git add README.md
git commit -m "docs: use project README as main documentation"
```

### 3. Create Archive Directory
```bash
mkdir -p docs/archive/2025-10-16-fixes
```

### 4. Move Historical Issues to Archive
```bash
# Move resolved issue docs
mv CRITICAL_SERVICE_DOWN.md docs/archive/2025-10-16-fixes/
mv URGENT_FLOWISE_FIX.md docs/archive/2025-10-16-fixes/
mv PRODUCTION_RESPONSIVENESS_ISSUE.md docs/archive/2025-10-16-fixes/
mv TAILWIND_V4_FIX.md docs/archive/2025-10-16-fixes/
mv MCP_FIX_COMPLETE.md docs/archive/2025-10-16-fixes/
mv SUPABASE_MCP_FIX.md docs/archive/2025-10-16-fixes/

# Add archive index
cat > docs/archive/2025-10-16-fixes/README.md << 'EOF'
# October 16, 2025 - Production Fixes

This directory contains documentation of issues resolved on October 16, 2025.

## Fixed Issues

1. **CRITICAL_SERVICE_DOWN.md** - Chat service 502 errors
2. **URGENT_FLOWISE_FIX.md** - Wrong Flowise URL (.info → .site)
3. **PRODUCTION_RESPONSIVENESS_ISSUE.md** - App not responsive in production
4. **TAILWIND_V4_FIX.md** - Missing CSS due to Tailwind v4 migration issues
5. **MCP_FIX_COMPLETE.md** - MCP server configuration in wrong location
6. **SUPABASE_MCP_FIX.md** - Port 3000 conflict with Supabase MCP

All issues resolved and deployed successfully.
EOF
```

### 5. Create docs/ Directory Structure
```bash
mkdir -p docs/{guides,reference}

# Move reference docs
mv SCHEMA_MIGRATION_SUMMARY.md docs/reference/
mv SUPABASE_KEY_MIGRATION.md docs/reference/

# Move guides
mv LOCAL_TESTING_GUIDE.md docs/guides/
mv optimization_plan.md docs/guides/future-improvements.md
```

### 6. Update .gitignore to Catch All Deployment Docs
The pattern `*MCP*.md` now catches MCP_CONFIGURED.md, MCP_SETUP_GUIDE.md, etc.
Pattern `*DEPLOY*.md` catches DEPLOY_SUPABASE_SECRETS.md.
✅ Already done!

---

## 📁 Final Directory Structure

```
chat-humanitarian-agent/
├── README.md                          # Main project documentation (was README_NEW.md)
├── .github/
│   └── copilot-instructions.md       # Copilot context
├── docs/
│   ├── guides/
│   │   ├── local-testing.md         # Was LOCAL_TESTING_GUIDE.md
│   │   └── future-improvements.md   # Was optimization_plan.md
│   ├── reference/
│   │   ├── schema-migration.md      # Was SCHEMA_MIGRATION_SUMMARY.md
│   │   └── key-migration.md         # Was SUPABASE_KEY_MIGRATION.md
│   └── archive/
│       └── 2025-10-16-fixes/
│           ├── README.md             # Archive index
│           ├── CRITICAL_SERVICE_DOWN.md
│           ├── URGENT_FLOWISE_FIX.md
│           ├── PRODUCTION_RESPONSIVENESS_ISSUE.md
│           ├── TAILWIND_V4_FIX.md
│           ├── MCP_FIX_COMPLETE.md
│           └── SUPABASE_MCP_FIX.md
└── [gitignored deployment docs]
    ├── MCP_CONFIGURED.md
    ├── MCP_SETUP_GUIDE.md
    └── DEPLOY_SUPABASE_SECRETS.md
```

---

## 🚀 Execute Full Cleanup

Run all commands:
```bash
# Execute the full cleanup
bash << 'SCRIPT'
set -e

echo "🧹 Starting documentation cleanup..."

# 1. Delete obsolete Supabase CLI README
echo "📝 Removing Supabase CLI README..."
rm README.md

# 2. Rename main README
echo "📝 Setting up main README..."
mv README_NEW.md README.md

# 3. Create directory structure
echo "📁 Creating docs structure..."
mkdir -p docs/{guides,reference,archive/2025-10-16-fixes}

# 4. Move historical issues to archive
echo "🗂️  Archiving resolved issues..."
mv CRITICAL_SERVICE_DOWN.md docs/archive/2025-10-16-fixes/
mv URGENT_FLOWISE_FIX.md docs/archive/2025-10-16-fixes/
mv PRODUCTION_RESPONSIVENESS_ISSUE.md docs/archive/2025-10-16-fixes/
mv TAILWIND_V4_FIX.md docs/archive/2025-10-16-fixes/
mv MCP_FIX_COMPLETE.md docs/archive/2025-10-16-fixes/
mv SUPABASE_MCP_FIX.md docs/archive/2025-10-16-fixes/

# 5. Move reference docs
echo "📚 Organizing reference documentation..."
mv SCHEMA_MIGRATION_SUMMARY.md docs/reference/schema-migration.md
mv SUPABASE_KEY_MIGRATION.md docs/reference/key-migration.md

# 6. Move guides
echo "📖 Organizing guides..."
mv LOCAL_TESTING_GUIDE.md docs/guides/local-testing.md
mv optimization_plan.md docs/guides/future-improvements.md

# 7. Create archive index
echo "📋 Creating archive index..."
cat > docs/archive/2025-10-16-fixes/README.md << 'EOF'
# October 16, 2025 - Production Fixes

This directory contains documentation of issues resolved on October 16, 2025.

## Fixed Issues

1. **CRITICAL_SERVICE_DOWN.md** - Chat service 502 errors
   - Root cause: Environment variable issues
   - Resolution: Service restart and configuration fix

2. **URGENT_FLOWISE_FIX.md** - Wrong Flowise URL
   - Root cause: Using .info instead of .site domain
   - Resolution: Updated service environment variables

3. **PRODUCTION_RESPONSIVENESS_ISSUE.md** - App not responsive in production
   - Root cause: Missing CSS in production build
   - Resolution: Tailwind v4 configuration fix

4. **TAILWIND_V4_FIX.md** - Missing CSS due to Tailwind v4 migration
   - Root cause: tailwindcss in devDependencies instead of dependencies
   - Resolution: Moved to dependencies and updated configuration

5. **MCP_FIX_COMPLETE.md** - MCP server configuration issues
   - Root cause: MCP servers in settings.json instead of mcp.json
   - Resolution: Moved configuration to correct file

6. **SUPABASE_MCP_FIX.md** - Port 3000 conflict with Supabase MCP
   - Root cause: Using HTTP server mode instead of stdio mode
   - Resolution: Switch to supabase-mcp-claude entry point

All issues resolved and deployed successfully.
EOF

echo "✅ Documentation cleanup complete!"
echo ""
echo "📊 Summary:"
echo "  - Deleted: 1 obsolete file (Supabase CLI README)"
echo "  - Renamed: README_NEW.md → README.md"
echo "  - Archived: 6 historical issue docs"
echo "  - Organized: 4 reference/guide docs"
echo ""
echo "Next: Review changes and commit"
SCRIPT
```

---

## ⚠️ Important Notes

1. **MCP_CONFIGURED.md, MCP_SETUP_GUIDE.md, DEPLOY_SUPABASE_SECRETS.md** remain gitignored because they contain:
   - Portainer tokens
   - Server IPs
   - Deployment procedures with secrets

2. **copilot-instructions.md** stays in `.github/` - it's the copilot context file

3. All archived issues are from **October 16, 2025** - a very productive troubleshooting day!

4. The weird **README.md** (Supabase CLI docs) was probably copied accidentally during setup

---

## 🔍 Validation

After cleanup, verify:
```bash
# Check file structure
tree docs/

# Check no secrets in tracked files
git grep -i "ptr_" README.md docs/

# Verify gitignore working
git status
```
