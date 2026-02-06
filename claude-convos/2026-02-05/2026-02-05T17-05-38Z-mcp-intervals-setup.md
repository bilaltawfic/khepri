# Session: MCP Intervals.icu Server Setup

**Date:** 2026-02-05T17:05:38Z
**Duration:** ~15 minutes
**Agent(s) Used:** Claude Code (Opus 4.5)

## Goal

Set up Workstream D for the Khepri project - configure MCP server integration for Intervals.icu workout data access.

## Key Prompts & Responses

### Initial Request

**User prompt:**
> Set up the MCP server integration. Create a new branch `feat/mcp-setup` from main.

Requirements included:
- Directory structure for mcp-servers/intervals-icu/
- Documentation explaining MCP and setup instructions
- Environment variable templates
- Claude Desktop configuration example
- .gitignore updates for sensitive files

### Approach Taken

1. Created branch `feat/mcp-setup` from main
2. Created directory structure: `mcp-servers/intervals-icu/`
3. Created main `mcp-servers/README.md` explaining:
   - What MCP is ("USB-C port for AI")
   - How MCP works
   - Available servers and tools
4. Created detailed `intervals-icu/README.md` with:
   - Prerequisites (Python 3.12+, uv)
   - How to find Athlete ID and API Key
   - Installation options (uvx recommended)
   - Configuration steps for Claude Desktop
   - Testing methods (direct tool test, CLI, curl)
   - Troubleshooting guide
5. Created `.env.example` with placeholder credentials
6. Created `claude-desktop-config.json.example` with uvx configuration
7. Updated `.gitignore` to exclude:
   - `mcp-servers/**/.env`
   - `mcp-servers/**/claude-desktop-config.json`

### Key Decision: Use External Package

Rather than forking or copying the mvilanova/intervals-mcp-server code, we reference it as an external dependency:
- Users install via `uvx intervals-mcp-server` (no local installation needed)
- This keeps our repo clean and respects the original maintainer's work
- Updates to the MCP server are automatically available

## Outcome

Created the following files:
- `mcp-servers/README.md` - MCP overview and server listing
- `mcp-servers/intervals-icu/README.md` - Detailed setup guide
- `mcp-servers/intervals-icu/.env.example` - Environment template
- `mcp-servers/intervals-icu/claude-desktop-config.json.example` - Claude Desktop config

Updated:
- `.gitignore` - Added MCP-specific exclusions

## Learnings

1. **uvx is ideal for MCP servers** - No need to install globally, just run directly
2. **Config file locations vary by OS** - Document both macOS and Windows paths
3. **Testing instructions matter** - Multiple verification methods help users debug
4. **Keep credentials separate** - .env.example pattern works well for API keys

## Files Created/Modified

- `mcp-servers/README.md` (new)
- `mcp-servers/intervals-icu/README.md` (new)
- `mcp-servers/intervals-icu/.env.example` (new)
- `mcp-servers/intervals-icu/claude-desktop-config.json.example` (new)
- `.gitignore` (modified)
