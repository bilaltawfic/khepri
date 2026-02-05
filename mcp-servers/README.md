# MCP Servers

This directory contains configuration and documentation for Model Context Protocol (MCP) servers used by Khepri.

## What is MCP?

**Model Context Protocol (MCP)** is a standardized way to connect AI assistants like Claude to external tools and data sources. Think of it as a "USB-C port for AI" - a common interface that lets Claude interact with various services.

### How MCP Works

1. You configure MCP servers (plugins) that expose "tools" to Claude
2. When Claude needs data (e.g., your workout history), it calls the appropriate tool
3. The MCP server fetches the data and returns it to Claude
4. Claude uses that real data in its response

### Benefits

- **Standardized Interface**: One protocol for many integrations
- **Secure**: Credentials stay local, not sent to Claude's servers
- **Extensible**: Easy to add new data sources
- **Real-time Data**: Claude gets live data, not cached information

## Available MCP Servers

### intervals-icu

Integration with [Intervals.icu](https://intervals.icu) for workout data, wellness metrics, and training calendar.

**Server:** [mvilanova/intervals-mcp-server](https://github.com/mvilanova/intervals-mcp-server)

**Tools provided:**
- `get_activities` - Retrieve activity lists
- `get_activity_details` - Access specific activity information
- `get_activity_intervals` - Obtain interval-level workout data
- `get_wellness_data` - Fetch wellness metrics
- `get_events` - Retrieve upcoming workouts and races
- `get_event_by_id` - Get detailed event information

[Setup Guide](./intervals-icu/README.md)

## Security Notes

- **Never commit credentials** - Use environment variables
- **API keys are personal** - Do not share your Intervals.icu API key
- **Review permissions** - Understand what data each tool can access

## Adding New MCP Servers

To add a new MCP server integration:

1. Create a subdirectory: `mcp-servers/<server-name>/`
2. Add documentation: `README.md` with setup instructions
3. Add config templates: `.env.example` and `claude-desktop-config.json.example`
4. Update this README to list the new server
