# P4-A-01: Create AI Orchestrator Edge Function Scaffold

## Goal

Create the foundational ai-orchestrator Edge Function that will coordinate AI interactions with tool use. This function will eventually handle the full AI agentic loop: receiving user messages, deciding when to call tools, executing tools via MCP gateway, and returning coherent responses.

This initial scaffold focuses on:
- Basic request/response structure
- Authentication and authorization
- Tool call detection from Claude responses
- Foundation for streaming (to be completed in P4-A-03)

## Dependencies

None - this is the starting point for Phase 4.

## Files to Create

### New Files
- `supabase/functions/ai-orchestrator/index.ts` - Main orchestrator function
- `supabase/functions/ai-orchestrator/types.ts` - Type definitions
- `supabase/functions/ai-orchestrator/tool-executor.ts` - Tool execution helper
- `supabase/functions/ai-orchestrator/prompts.ts` - System prompts with tool instructions

## Implementation Steps

### Step 1: Define Types

Create `supabase/functions/ai-orchestrator/types.ts`:

```typescript
// Request/Response types for the orchestrator
export interface OrchestratorRequest {
  messages: ChatMessage[];
  athlete_context?: AthleteContext;
  conversation_id?: string;
  stream?: boolean; // Future: enable streaming
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AthleteContext {
  athlete_id: string;
  display_name?: string;
  ftp_watts?: number;
  weight_kg?: number;
  active_goals?: Goal[];
  active_constraints?: Constraint[];
  recent_checkin?: CheckinSummary;
}

export interface Goal {
  id: string;
  title: string;
  target_date?: string;
  priority?: 'A' | 'B' | 'C';
}

export interface Constraint {
  id: string;
  type: string;
  description: string;
  start_date?: string;
  end_date?: string;
}

export interface CheckinSummary {
  date: string;
  energy_level?: number;
  sleep_quality?: number;
  stress_level?: number;
  muscle_soreness?: number;
}

export interface OrchestratorResponse {
  content: string;
  tool_calls?: ToolCallResult[];
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

export interface ToolCallResult {
  tool_name: string;
  success: boolean;
  result?: unknown;
  error?: string;
}

// Claude API types for tool use
export interface ClaudeToolDefinition {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

export interface ClaudeToolUse {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ClaudeToolResult {
  type: 'tool_result';
  tool_use_id: string;
  content: string;
  is_error?: boolean;
}
```

### Step 2: Create Tool Executor

Create `supabase/functions/ai-orchestrator/tool-executor.ts`:

```typescript
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';
import type { ClaudeToolUse, ToolCallResult } from './types.ts';

const MCP_GATEWAY_URL = '/functions/v1/mcp-gateway';

/**
 * Execute a tool via the MCP gateway.
 */
export async function executeTool(
  tool: ClaudeToolUse,
  supabase: SupabaseClient,
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

    const response = await fetch(`${supabaseUrl}${MCP_GATEWAY_URL}`, {
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
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      return {
        tool_name: tool.name,
        success: false,
        error: error.error ?? `HTTP ${response.status}`,
      };
    }

    const result = await response.json();
    return {
      tool_name: tool.name,
      success: !result.isError,
      result: result.content,
      error: result.isError ? 'Tool execution failed' : undefined,
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
  tools: ClaudeToolUse[],
  supabase: SupabaseClient,
  authHeader: string
): Promise<ToolCallResult[]> {
  return Promise.all(
    tools.map((tool) => executeTool(tool, supabase, authHeader))
  );
}
```

### Step 3: Create System Prompts

Create `supabase/functions/ai-orchestrator/prompts.ts`:

```typescript
import type { AthleteContext, ClaudeToolDefinition } from './types.ts';

/**
 * Tool definitions for Claude to use.
 * These mirror the MCP gateway tools.
 */
export const TOOL_DEFINITIONS: ClaudeToolDefinition[] = [
  {
    name: 'get_activities',
    description: 'Fetch recent training activities from Intervals.icu',
    input_schema: {
      type: 'object',
      properties: {
        oldest: {
          type: 'string',
          description: 'ISO date string for oldest activity to fetch (YYYY-MM-DD)',
        },
        newest: {
          type: 'string',
          description: 'ISO date string for newest activity to fetch (YYYY-MM-DD)',
        },
      },
    },
  },
  {
    name: 'get_wellness_data',
    description: 'Fetch wellness/readiness data from Intervals.icu (HRV, sleep, etc.)',
    input_schema: {
      type: 'object',
      properties: {
        oldest: {
          type: 'string',
          description: 'ISO date string for oldest data point (YYYY-MM-DD)',
        },
        newest: {
          type: 'string',
          description: 'ISO date string for newest data point (YYYY-MM-DD)',
        },
      },
    },
  },
  {
    name: 'get_events',
    description: 'Fetch scheduled events and races from Intervals.icu calendar',
    input_schema: {
      type: 'object',
      properties: {
        oldest: {
          type: 'string',
          description: 'ISO date string for oldest event (YYYY-MM-DD)',
        },
        newest: {
          type: 'string',
          description: 'ISO date string for newest event (YYYY-MM-DD)',
        },
      },
    },
  },
];

/**
 * Build the system prompt with athlete context.
 */
export function buildSystemPrompt(context?: AthleteContext): string {
  const basePrompt = `You are Khepri, an AI endurance coaching assistant. You help athletes optimize their training through personalized advice based on their fitness data, goals, and daily readiness.

## Your Capabilities
You have access to tools that let you fetch real training data from the athlete's Intervals.icu account:
- get_activities: Fetch recent workouts (rides, runs, etc.)
- get_wellness_data: Fetch wellness metrics (HRV, sleep quality, readiness)
- get_events: Fetch scheduled events and races

## Guidelines
1. **Use data to inform advice**: When discussing training load or recovery, fetch relevant data first.
2. **Respect constraints**: Never recommend training that violates athlete's stated constraints (injuries, time limits).
3. **Be specific**: Give concrete recommendations (e.g., "30-minute easy spin" not "light exercise").
4. **Explain your reasoning**: Help athletes understand why you're making specific recommendations.
5. **Prioritize safety**: If unsure about injury implications, recommend consulting a professional.

## Response Style
- Be conversational but concise
- Use bullet points for multi-part recommendations
- Include relevant metrics when discussing training load`;

  if (!context) return basePrompt;

  const contextParts: string[] = [basePrompt, '\n## Athlete Context'];

  if (context.display_name) {
    contextParts.push(`Athlete: ${context.display_name}`);
  }

  if (context.ftp_watts) {
    contextParts.push(`FTP: ${context.ftp_watts}W`);
  }

  if (context.weight_kg) {
    contextParts.push(`Weight: ${context.weight_kg}kg`);
  }

  if (context.active_goals?.length) {
    contextParts.push('\n### Active Goals');
    for (const goal of context.active_goals) {
      const priority = goal.priority ? ` (Priority ${goal.priority})` : '';
      const date = goal.target_date ? ` - Target: ${goal.target_date}` : '';
      contextParts.push(`- ${goal.title}${priority}${date}`);
    }
  }

  if (context.active_constraints?.length) {
    contextParts.push('\n### Active Constraints (MUST RESPECT)');
    for (const constraint of context.active_constraints) {
      const dates =
        constraint.start_date || constraint.end_date
          ? ` (${constraint.start_date ?? '?'} to ${constraint.end_date ?? 'ongoing'})`
          : '';
      contextParts.push(`- [${constraint.type}] ${constraint.description}${dates}`);
    }
  }

  if (context.recent_checkin) {
    const c = context.recent_checkin;
    contextParts.push('\n### Today\'s Check-in');
    if (c.energy_level != null) contextParts.push(`- Energy: ${c.energy_level}/10`);
    if (c.sleep_quality != null) contextParts.push(`- Sleep: ${c.sleep_quality}/10`);
    if (c.stress_level != null) contextParts.push(`- Stress: ${c.stress_level}/10`);
    if (c.muscle_soreness != null) contextParts.push(`- Soreness: ${c.muscle_soreness}/10`);
  }

  return contextParts.join('\n');
}
```

### Step 4: Create Main Orchestrator Function

Create `supabase/functions/ai-orchestrator/index.ts`:

```typescript
// Khepri AI Orchestrator Edge Function
// Coordinates AI interactions with tool use for intelligent coaching responses
//
// Environment variables required:
// - ANTHROPIC_API_KEY: Claude API key
// - SUPABASE_URL: Supabase project URL (auto-provided)
// - SUPABASE_ANON_KEY: Supabase anon key for JWT verification (auto-provided)

import Anthropic from 'npm:@anthropic-ai/sdk@0.36';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

import { buildSystemPrompt, TOOL_DEFINITIONS } from './prompts.ts';
import { executeTools } from './tool-executor.ts';
import type {
  ClaudeToolResult,
  ClaudeToolUse,
  OrchestratorRequest,
  OrchestratorResponse,
} from './types.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const MAX_TOOL_ITERATIONS = 5; // Prevent infinite tool loops

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function errorResponse(error: string, status: number): Response {
  return jsonResponse({ error }, status);
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  try {
    // Verify authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return errorResponse('Missing authorization header', 401);
    }

    // Verify JWT
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !supabaseAnonKey) {
      return errorResponse('Server configuration error', 500);
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return errorResponse('Unauthorized', 401);
    }

    // Parse request
    let request: OrchestratorRequest;
    try {
      request = await req.json();
    } catch {
      return errorResponse('Invalid JSON in request body', 400);
    }

    const { messages, athlete_context } = request;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return errorResponse('messages array required', 400);
    }

    // Get Anthropic API key
    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!anthropicApiKey) {
      return errorResponse('AI service not configured', 503);
    }

    const anthropic = new Anthropic({ apiKey: anthropicApiKey });
    const systemPrompt = buildSystemPrompt(athlete_context);

    // Convert to Anthropic message format
    let anthropicMessages: Anthropic.MessageParam[] = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    const allToolCalls: OrchestratorResponse['tool_calls'] = [];

    // Agentic loop: continue until Claude doesn't request any tools
    for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        system: systemPrompt,
        tools: TOOL_DEFINITIONS.map((t) => ({
          name: t.name,
          description: t.description,
          input_schema: t.input_schema as Anthropic.Tool['input_schema'],
        })),
        messages: anthropicMessages,
      });

      totalInputTokens += response.usage.input_tokens;
      totalOutputTokens += response.usage.output_tokens;

      // Check if Claude wants to use tools
      const toolUseBlocks = response.content.filter(
        (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
      );

      // If no tool use, we're done
      if (toolUseBlocks.length === 0 || response.stop_reason === 'end_turn') {
        const textContent = response.content
          .filter((block): block is Anthropic.TextBlock => block.type === 'text')
          .map((block) => block.text)
          .join('\n\n');

        return jsonResponse({
          content: textContent,
          tool_calls: allToolCalls.length > 0 ? allToolCalls : undefined,
          usage: {
            input_tokens: totalInputTokens,
            output_tokens: totalOutputTokens,
          },
        } satisfies OrchestratorResponse);
      }

      // Execute all requested tools
      const toolUses: ClaudeToolUse[] = toolUseBlocks.map((block) => ({
        type: 'tool_use' as const,
        id: block.id,
        name: block.name,
        input: block.input as Record<string, unknown>,
      }));

      const toolResults = await executeTools(toolUses, supabase, authHeader);

      // Track tool calls for response
      allToolCalls.push(...toolResults);

      // Add assistant's response with tool calls to messages
      anthropicMessages = [
        ...anthropicMessages,
        { role: 'assistant', content: response.content },
        {
          role: 'user',
          content: toolResults.map((result, idx) => ({
            type: 'tool_result' as const,
            tool_use_id: toolUseBlocks[idx].id,
            content: result.success
              ? JSON.stringify(result.result)
              : `Error: ${result.error}`,
            is_error: !result.success,
          })),
        },
      ];
    }

    // If we hit max iterations, return what we have
    return errorResponse('Max tool iterations reached', 500);
  } catch (error) {
    console.error('AI Orchestrator Error:', error);

    if (error instanceof Anthropic.APIError) {
      return errorResponse('AI service error', error.status ?? 500);
    }

    return errorResponse('Internal server error', 500);
  }
});
```

## Testing Requirements

### Unit Tests

Testing Edge Functions requires manual testing via the Supabase CLI:

```bash
# Start local Supabase
supabase start

# Deploy function locally
supabase functions serve ai-orchestrator --env-file .env.local

# Test with curl
curl -X POST http://localhost:54321/functions/v1/ai-orchestrator \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "What was my training load this week?"}],
    "athlete_context": {"athlete_id": "test", "ftp_watts": 250}
  }'
```

### Verification Scenarios

1. **Basic chat without tools**: Simple greeting should respond without tool calls
2. **Training data query**: "What did I do this week?" should trigger get_activities
3. **Wellness query**: "How am I recovering?" should trigger get_wellness_data
4. **Multi-tool query**: "How should I train today?" might use multiple tools
5. **Auth failure**: Request without token returns 401
6. **Invalid request**: Missing messages returns 400

## Verification Checklist

- [ ] Function deploys without errors
- [ ] Authentication works (401 for missing/invalid token)
- [ ] Basic messages work without tool use
- [ ] Tool calls are detected and executed
- [ ] Tool results are incorporated into response
- [ ] Max iterations prevents infinite loops
- [ ] Error responses are clean (no leaked secrets)
- [ ] Usage tracking is accurate

## PR Checklist

- [ ] Add conversation log to `claude-convos/`
- [ ] Test locally with `supabase functions serve`
- [ ] Run `pnpm lint`
- [ ] Keep PR focused on scaffold (streaming is P4-A-03)
