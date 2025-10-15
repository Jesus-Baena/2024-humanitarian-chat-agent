# Supabase MCP Fix - Port 3000 EADDRINUSE Error

## Problem Identified

When VS Code tried to load the Supabase MCP server, it failed with:
```
Error: listen EADDRINUSE: address already in use ::1:3000
```

This happened because the wrong entry point was used in the MCP configuration.

## Root Cause

The `supabase-mcp` npm package (v1.5.0) provides **two different entry points**:

1. **`supabase-mcp`** (default) - HTTP server mode
   - Starts an HTTP server on port 3000
   - Designed for remote MCP access
   - NOT compatible with VS Code's stdio-based MCP integration

2. **`supabase-mcp-claude`** - stdio mode
   - Uses stdin/stdout for communication (JSON-RPC over stdio)
   - Compatible with VS Code, Claude Desktop, and other stdio-based MCP clients
   - THIS is the correct one for VS Code

## Solution Applied

Updated `~/.config/Code/User/mcp.json` to use the **stdio-compatible entry point**:

### Before (INCORRECT):
```json
{
  "supabase": {
    "type": "stdio",
    "command": "/usr/bin/supabase-mcp",  // ❌ HTTP mode entry point
    "args": [],
    "env": { ... }
  }
}
```

### After (CORRECT):
```json
{
  "supabase": {
    "type": "stdio",
    "command": "/usr/bin/supabase-mcp-claude",  // ✅ stdio mode entry point
    "args": [],
    "env": {
      "SUPABASE_URL": "https://qecdwuwkxgwkpopmdewl.supabase.co",
      "SUPABASE_ANON_KEY": "eyJhbGc...",
      "SUPABASE_SERVICE_ROLE_KEY": "eyJhbGc...",
      "MCP_API_KEY": "humanitarian-chat-mcp-key-2025"
    }
  }
}
```

## Verification

Tested the stdio mode directly:
```bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | \
  SUPABASE_URL="..." \
  SUPABASE_ANON_KEY="..." \
  SUPABASE_SERVICE_ROLE_KEY="..." \
  MCP_API_KEY="..." \
  /usr/bin/supabase-mcp-claude
```

**Result**: ✅ Successfully returned 5 tools without trying to bind to port 3000:
- `queryDatabase` - Query tables with filters
- `insertData` - Insert records
- `updateData` - Update existing records
- `deleteData` - Delete records
- `listTables` - List all tables

## Additional Actions Taken

1. **Killed orphaned process**: Found PID 78418 using port 3000 from previous failed attempt and killed it
2. **Created backup**: `~/.config/Code/User/mcp.json.backup.TIMESTAMP`
3. **Verified JSON validity**: Used `jq` to ensure proper syntax

## Next Steps

1. **Restart VS Code** - Close all windows and restart to load the new configuration
2. **Test in Copilot Chat**:
   - "List tables in Supabase"
   - "Query the chats table from Supabase"
   - "Show me the profiles table schema"

## Key Learnings

- The `supabase-mcp` package has two binaries with different transport modes
- Always check package.json's `bin` field to see available entry points
- stdio-based MCP servers communicate via stdin/stdout (JSON-RPC)
- HTTP-based MCP servers start network listeners (incompatible with VS Code's stdio integration)
- Entry point names like `-claude` often indicate stdio compatibility for Claude Desktop/MCP clients

## References

- Supabase MCP package location: `/usr/lib/node_modules/supabase-mcp/`
- Entry points: `dist/esm/index.js` (HTTP) vs `dist/esm/claude-entry.js` (stdio)
- VS Code MCP config: `~/.config/Code/User/mcp.json`
- Documentation: Previous fix in `MCP_FIX_COMPLETE.md`
