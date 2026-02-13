/**
 * MCP Tool definition following Anthropic's tool use spec.
 * Each tool has a name, description, and input schema.
 */
export interface MCPToolDefinition {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: readonly string[];
  };
}

/**
 * Request to execute an MCP tool.
 * Matches the shape Claude uses for tool_use content blocks.
 */
export interface MCPToolRequest {
  tool_name: string;
  tool_input: Record<string, unknown>;
}

/**
 * Successful tool execution result.
 */
export interface MCPToolSuccess {
  success: true;
  data: unknown;
}

/**
 * Failed tool execution result.
 */
export interface MCPToolError {
  success: false;
  error: string;
  code?: string;
}

/**
 * Combined tool result type.
 */
export type MCPToolResult = MCPToolSuccess | MCPToolError;

/**
 * Gateway request body - can list tools or execute a tool.
 */
export interface MCPGatewayRequest {
  action: 'list_tools' | 'execute_tool';
  tool_name?: string;
  tool_input?: Record<string, unknown>;
}

/**
 * Response for list_tools action.
 */
export interface MCPListToolsResponse {
  tools: MCPToolDefinition[];
}

/**
 * Handler function signature for MCP tools.
 * Takes the tool input and athlete ID, returns a result.
 */
export type MCPToolHandler = (
  input: Record<string, unknown>,
  athleteId: string
) => Promise<MCPToolResult>;

/**
 * Tool registration entry with definition and handler.
 */
export interface MCPToolEntry {
  definition: MCPToolDefinition;
  handler: MCPToolHandler;
}
