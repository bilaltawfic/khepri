# P3-A-01: Create MCP Gateway Edge Function Scaffold

## Branch
```bash
git checkout feat/p3-a-01-mcp-gateway-scaffold
```

## Goal

Create a new Supabase Edge Function that will serve as the MCP (Model Context Protocol) gateway for Intervals.icu integration. This scaffold establishes the function structure, authentication, and request/response patterns without implementing specific tool handlers yet.

The MCP gateway will allow Claude to call tools that fetch data from Intervals.icu (activities, wellness data, calendar events) on behalf of authenticated users.

## Files to Create

```
supabase/functions/mcp-gateway/
├── index.ts           # Main entry point with request routing
├── types.ts           # TypeScript interfaces for MCP protocol
└── tools/
    └── index.ts       # Tool registry (exports available tools)
```

## Implementation Steps

### 1. Create types.ts - MCP Protocol Types

```typescript
// supabase/functions/mcp-gateway/types.ts

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
```

### 2. Create tools/index.ts - Tool Registry

```typescript
// supabase/functions/mcp-gateway/tools/index.ts

import type { MCPToolEntry, MCPToolDefinition } from '../types.ts';

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
```

### 3. Create index.ts - Main Entry Point

```typescript
// supabase/functions/mcp-gateway/index.ts

// MCP Gateway Edge Function
// Routes MCP tool requests for Intervals.icu integration
//
// Environment variables required:
// - SUPABASE_URL: Supabase project URL (auto-provided)
// - SUPABASE_ANON_KEY: Supabase anon key for JWT verification (auto-provided)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

import { getToolDefinitions, getTool } from './tools/index.ts';
import type {
  MCPGatewayRequest,
  MCPListToolsResponse,
  MCPToolResult,
} from './types.ts';

// CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

/**
 * Create a JSON response with CORS headers.
 */
function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/**
 * Create an error response.
 */
function errorResponse(error: string, status: number, code?: string): Response {
  return jsonResponse({ error, code }, status);
}

/**
 * Validate the request body shape at runtime.
 */
function isValidRequest(body: unknown): body is MCPGatewayRequest {
  if (typeof body !== 'object' || body === null) return false;
  const obj = body as Record<string, unknown>;

  if (obj.action !== 'list_tools' && obj.action !== 'execute_tool') {
    return false;
  }

  if (obj.action === 'execute_tool') {
    if (typeof obj.tool_name !== 'string' || !obj.tool_name) {
      return false;
    }
    if (obj.tool_input !== undefined && typeof obj.tool_input !== 'object') {
      return false;
    }
  }

  return true;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  try {
    // Verify authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return errorResponse('Missing authorization header', 401);
    }

    // Verify JWT and get user
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !supabaseAnonKey) {
      return errorResponse('Server configuration error', 500);
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return errorResponse('Unauthorized', 401);
    }

    // Get athlete ID from auth user
    // Athletes are linked to auth users via auth_user_id column
    const { data: athlete, error: athleteError } = await supabase
      .from('athletes')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (athleteError || !athlete) {
      return errorResponse('Athlete profile not found', 404);
    }

    // Parse request body
    let requestBody: unknown;
    try {
      requestBody = await req.json();
    } catch {
      return errorResponse('Invalid JSON in request body', 400);
    }

    // Validate request shape
    if (!isValidRequest(requestBody)) {
      return errorResponse(
        'Invalid request: action must be "list_tools" or "execute_tool"',
        400
      );
    }

    // Handle list_tools action
    if (requestBody.action === 'list_tools') {
      const response: MCPListToolsResponse = {
        tools: getToolDefinitions(),
      };
      return jsonResponse(response);
    }

    // Handle execute_tool action
    if (requestBody.action === 'execute_tool') {
      const toolName = requestBody.tool_name;
      const toolInput = requestBody.tool_input ?? {};

      // Validate tool_name is a string (runtime check for safety)
      if (typeof toolName !== 'string') {
        return errorResponse('tool_name must be a string', 400);
      }

      const tool = getTool(toolName);
      if (!tool) {
        return errorResponse(`Unknown tool: ${toolName}`, 404, 'TOOL_NOT_FOUND');
      }

      // Execute the tool handler
      const result: MCPToolResult = await tool.handler(toolInput, athlete.id);
      return jsonResponse(result);
    }

    // Should never reach here due to validation above
    return errorResponse('Invalid action', 400);
  } catch (error) {
    console.error('MCP Gateway Error:', error);
    return errorResponse('Internal server error', 500);
  }
});
```

### 4. Add to deno.json (if needed)

Check if `supabase/functions/deno.json` exists and add any needed imports.

## Testing Requirements

Create test file `supabase/functions/mcp-gateway/__tests__/index.test.ts`:

```typescript
// Tests will need to mock:
// - Supabase client and auth
// - The serve function from Deno

// Test cases:
// 1. OPTIONS request returns CORS headers
// 2. Non-POST request returns 405
// 3. Missing auth header returns 401
// 4. Invalid JWT returns 401
// 5. User without athlete profile returns 404
// 6. Invalid JSON body returns 400
// 7. Invalid action returns 400
// 8. list_tools returns empty array (no tools registered yet)
// 9. execute_tool with unknown tool returns 404
```

Note: Edge Function tests require Deno test infrastructure. For now, manual testing via `supabase functions serve` is acceptable, with unit tests added when test infrastructure is set up.

## Verification

1. Deploy locally: `supabase functions serve mcp-gateway`
2. Test list_tools:
   ```bash
   curl -X POST http://localhost:54321/functions/v1/mcp-gateway \
     -H "Authorization: Bearer <jwt>" \
     -H "Content-Type: application/json" \
     -d '{"action": "list_tools"}'
   ```
   Should return: `{"tools": []}`

3. Test execute_tool with unknown tool:
   ```bash
   curl -X POST http://localhost:54321/functions/v1/mcp-gateway \
     -H "Authorization: Bearer <jwt>" \
     -H "Content-Type: application/json" \
     -d '{"action": "execute_tool", "tool_name": "unknown"}'
   ```
   Should return: `{"error": "Unknown tool: unknown", "code": "TOOL_NOT_FOUND"}`

## PR Guidelines

- Commit: `feat(supabase): add MCP gateway Edge Function scaffold`
- This PR creates the foundation; tool handlers added in P3-A-02, P3-A-03, P3-A-04
- Keep PR focused on scaffold only - no tool implementations yet

## Dependencies

- None (first task in Phase 3)

## Enables

- P3-A-02: Add get_activities tool handler
- P3-A-03: Add get_wellness_data tool handler
- P3-A-04: Add get_events tool handler
