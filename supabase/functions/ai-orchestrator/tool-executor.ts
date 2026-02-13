// Tool executor for the AI Orchestrator
// Routes tool calls to the MCP Gateway and returns results

import type { ClaudeToolUse, ToolCallResult } from './types.ts';

const MCP_GATEWAY_PATH = '/functions/v1/mcp-gateway';

/**
 * MCP Gateway success response shape.
 */
interface MCPSuccessResponse {
  success: true;
  data: unknown;
}

/**
 * MCP Gateway error response shape.
 */
interface MCPErrorResponse {
  success: false;
  error: string;
  code?: string;
}

type MCPGatewayResponse = MCPSuccessResponse | MCPErrorResponse;

/**
 * Type guard for MCP gateway response.
 */
function isMCPGatewayResponse(value: unknown): value is MCPGatewayResponse {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  if (typeof obj.success !== 'boolean') return false;
  if (!obj.success && typeof obj.error !== 'string') return false;
  return true;
}

/**
 * Execute a single tool via the MCP gateway.
 */
export async function executeTool(
  tool: ClaudeToolUse,
  authHeader: string
): Promise<ToolCallResult> {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    if (!supabaseUrl) {
      return {
        tool_name: tool.name,
        success: false,
        error: 'Server configuration error',
      };
    }

    const response = await fetch(`${supabaseUrl}${MCP_GATEWAY_PATH}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
      body: JSON.stringify({
        action: 'execute_tool',
        tool_name: tool.name,
        tool_input: tool.input,
      }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({ error: 'Unknown error' }));
      const errorMsg =
        typeof body === 'object' &&
        body !== null &&
        typeof (body as Record<string, unknown>).error === 'string'
          ? (body as Record<string, string>).error
          : `HTTP ${response.status}`;
      return {
        tool_name: tool.name,
        success: false,
        error: errorMsg,
      };
    }

    const result: unknown = await response.json();

    if (!isMCPGatewayResponse(result)) {
      return {
        tool_name: tool.name,
        success: false,
        error: 'Unexpected gateway response format',
      };
    }

    if (result.success) {
      return {
        tool_name: tool.name,
        success: true,
        result: result.data,
      };
    }

    return {
      tool_name: tool.name,
      success: false,
      error: result.error,
    };
  } catch (error) {
    return {
      tool_name: tool.name,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Execute multiple tools in parallel.
 */
export async function executeTools(
  tools: readonly ClaudeToolUse[],
  authHeader: string
): Promise<ToolCallResult[]> {
  return Promise.all(tools.map((tool) => executeTool(tool, authHeader)));
}
