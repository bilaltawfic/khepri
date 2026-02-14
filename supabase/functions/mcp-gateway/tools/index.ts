import type { MCPToolDefinition, MCPToolEntry } from '../types.ts';
import { createEventTool } from './create-event.ts';
import { getActivitiesTool } from './get-activities.ts';
import { getEventsTool } from './get-events.ts';
import { getWellnessDataTool } from './get-wellness.ts';
import { searchKnowledgeTool } from './search-knowledge.ts';
import { updateEventTool } from './update-event.ts';

/**
 * Registry of all available MCP tools.
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
// Tool registrations
// ============================================================
registerTool(createEventTool);
registerTool(getActivitiesTool);
registerTool(getEventsTool);
registerTool(getWellnessDataTool);
registerTool(searchKnowledgeTool);
registerTool(updateEventTool);
