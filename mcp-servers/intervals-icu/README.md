# Intervals.icu MCP Server Setup

This guide explains how to set up the [intervals-mcp-server](https://github.com/mvilanova/intervals-mcp-server) for use with Claude Desktop or other MCP-compatible clients.

## Prerequisites

- **Python 3.12+** - The MCP server requires Python 3.12 or later
- **uv** - Modern Python package manager (recommended)
- **Intervals.icu account** - Free account at [intervals.icu](https://intervals.icu)
- **Claude Desktop** - For testing locally

## Getting Your Intervals.icu Credentials

### Athlete ID

1. Log in to [intervals.icu](https://intervals.icu)
2. Look at the URL - it will be `https://intervals.icu/athlete/i123456/...`
3. Your Athlete ID is the `i123456` part (including the `i` prefix)

### API Key

1. Go to **Settings** (gear icon in top right)
2. Navigate to **Developer Settings** or **API**
3. Click **Create API Key**
4. Give it a descriptive name (e.g., "Khepri MCP")
5. Copy the API key immediately - it won't be shown again

## Installation

### Option 1: Using uvx (Recommended)

The simplest approach - no installation required. `uvx` runs the package directly:

```bash
# Test that it works
uvx intervals-mcp-server --help
```

### Option 2: Using pip/uv

If you prefer to install the package:

```bash
# With uv
uv pip install intervals-mcp-server

# Or with pip
pip install intervals-mcp-server
```

## Configuration

### Claude Desktop Configuration

For most users, embedding credentials directly in the Claude Desktop config file (below) is the simplest approach. The `.env` file method is only needed for command-line testing (see Method 2 in Testing section).

1. Locate your Claude Desktop config file:
   - **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
   - **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

2. Open this file in a text editor. If the file doesn't exist and you have no other MCP servers, you can create it from the example:
   ```bash
   # macOS / Linux (Warning: overwrites existing config)
   cp claude-desktop-config.json.example ~/Library/Application\ Support/Claude/claude_desktop_config.json
   ```
   ```powershell
   # Windows PowerShell (Warning: overwrites existing config)
   Copy-Item claude-desktop-config.json.example "$env:APPDATA\Claude\claude_desktop_config.json"
   ```

   If you already have other MCP servers configured, merge the `intervals-icu` entry into your existing `mcpServers` object instead of overwriting.

3. Edit the config file with your actual credentials:
   ```json
   {
     "mcpServers": {
       "intervals-icu": {
         "command": "uvx",
         "args": ["intervals-mcp-server"],
         "env": {
           "INTERVALS_ATHLETE_ID": "your-actual-athlete-id",
           "INTERVALS_API_KEY": "your-actual-api-key"
         }
       }
     }
   }
   ```

4. Restart Claude Desktop to load the new configuration

### Environment Variables (Command-Line Only)

This section is only needed if you want to test the MCP server from the command line (Method 2 below).

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```bash
INTERVALS_ATHLETE_ID=your-athlete-id
INTERVALS_API_KEY=your-api-key
```

**Important:** Never commit your `.env` file!

## Testing the Connection

### Method 1: Direct Tool Test

Once Claude Desktop is configured, you can test by asking:

> "Can you get my recent activities from Intervals.icu?"

If configured correctly, Claude will use the MCP tools to fetch your data.

### Method 2: Command Line Test

You can also test the server directly:

```bash
# Set environment variables
export INTERVALS_ATHLETE_ID="your-athlete-id"
export INTERVALS_API_KEY="your-api-key"

# Run the server (it will wait for MCP client connections)
uvx intervals-mcp-server
```

### Method 3: Verify API Access

Test your API credentials with curl:

```bash
curl -u "your-api-key:" \
  "https://intervals.icu/api/v1/athlete/your-athlete-id/activities?oldest=2025-01-01&newest=2025-12-31"
```

Replace `your-api-key` and `your-athlete-id` with your actual credentials. Adjust the date range as needed.

## Available Tools

The Intervals.icu MCP server provides these tools:

| Tool | Description |
|------|-------------|
| `get_activities` | Retrieve a list of activities within a date range |
| `get_activity_details` | Get detailed information about a specific activity |
| `get_activity_intervals` | Get interval/lap data for an activity |
| `get_wellness_data` | Fetch wellness metrics (sleep, HRV, weight, etc.) |
| `get_events` | Get upcoming events (planned workouts, races) |
| `get_event_by_id` | Get detailed information about a specific event |

## Troubleshooting

### "Connection refused" or "Server not found"

- Ensure Claude Desktop is restarted after config changes
- Check that the config file path is correct
- Verify JSON syntax in the config file

### "Authentication failed" or "401 Unauthorized"

- Double-check your Athlete ID (should include the `i` prefix)
- Verify your API key is correct
- Ensure the API key hasn't expired or been revoked

### "No activities found"

- Check the date range in your query
- Verify your account has activities in Intervals.icu
- Ensure you're querying the correct athlete ID

### Python/uv Issues

- Verify Python 3.12+ is installed: `python --version`
- Install uv if needed: `curl -LsSf https://astral.sh/uv/install.sh | sh`
- Try installing with pip instead: `pip install intervals-mcp-server`

## Resources

- [intervals-mcp-server GitHub](https://github.com/mvilanova/intervals-mcp-server)
- [Intervals.icu API Documentation](https://intervals.icu/api/doc)
- [MCP Protocol Specification](https://modelcontextprotocol.io/)
- [Claude Desktop Documentation](https://www.anthropic.com/claude-desktop)

## License

The intervals-mcp-server is licensed under GPL-3.0, which is compatible with Khepri's license.
