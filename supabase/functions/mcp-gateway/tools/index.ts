import type { MCPToolDefinition, MCPToolEntry } from '../types.ts';

/**
 * Registry of all available MCP tools.
 * Tools are added here as they are implemented in subsequent PRs.
 */
const toolRegistry: Map<string, MCPToolEntry> = new Map();

/**
 * Register a tool with the gateway.
 */
export function registerTool(entry: MCPToolEntry): void {
  toolRegistry.set(entry.definition.name, entry);
}

/**
 * Get all registered tool definitions (for list_tools action).
 */
export function getToolDefinitions(): MCPToolDefinition[] {
  return Array.from(toolRegistry.values()).map((entry) => entry.definition);
}

/**
 * Get a tool entry by name (for execute_tool action).
 */
export function getTool(name: string): MCPToolEntry | undefined {
  return toolRegistry.get(name);
}

// ============================================================
// Tool registrations will be added here in subsequent PRs:
// - P3-A-02: registerTool(getActivities)
// - P3-A-03: registerTool(getWellnessData)
// - P3-A-04: registerTool(getEvents)
// ============================================================
