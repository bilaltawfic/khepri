// Khepri AI Orchestrator Edge Function
// Coordinates AI interactions with tool use for intelligent coaching responses.
// This is the agentic version of ai-coach: it can call MCP gateway tools
// in a loop until it has enough data to answer the user's question.
//
// Environment variables required:
// - ANTHROPIC_API_KEY: Claude API key
// - SUPABASE_URL: Supabase project URL (auto-provided)
// - SUPABASE_ANON_KEY: Supabase anon key for JWT verification (auto-provided)

import Anthropic from 'npm:@anthropic-ai/sdk@0.36';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

import { fetchAthleteContext } from './context-builder.ts';
import { TOOL_DEFINITIONS, buildSystemPrompt } from './prompts.ts';
import { createSSEResponse } from './stream.ts';
import { executeTools } from './tool-executor.ts';
import type {
  ClaudeToolUse,
  OrchestratorRequest,
  OrchestratorResponse,
  ToolCallResult,
} from './types.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

/** Maximum number of tool-use round trips to prevent infinite loops. */
const MAX_TOOL_ITERATIONS = 5;

/** Allowed roles in incoming chat messages. */
const ALLOWED_ROLES = new Set(['user', 'assistant']);

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function errorResponse(error: string, status: number): Response {
  return jsonResponse({ error }, status);
}

/**
 * Validate incoming request body at runtime.
 * Returns a descriptive error string, or null if valid.
 */
function validateRequest(body: unknown): string | null {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return 'Request body must be a JSON object';
  }

  const obj = body as Record<string, unknown>;

  if (!Array.isArray(obj.messages)) {
    return 'messages array required';
  }

  if (obj.messages.length === 0) {
    return 'messages array must not be empty';
  }

  for (const [index, msg] of obj.messages.entries()) {
    if (typeof msg !== 'object' || msg === null || Array.isArray(msg)) {
      return `Invalid message at index ${index}`;
    }
    const m = msg as Record<string, unknown>;
    if (typeof m.role !== 'string' || !ALLOWED_ROLES.has(m.role)) {
      return `Invalid role at message index ${index}: must be "user" or "assistant"`;
    }
    if (typeof m.content !== 'string') {
      return `Invalid content at message index ${index}: must be a string`;
    }
  }

  // First message must be from user (Anthropic requirement)
  const firstMsg = obj.messages[0] as Record<string, unknown>;
  if (firstMsg.role !== 'user') {
    return 'First message must be from user';
  }

  return null;
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

    // Parse and validate request
    let requestBody: unknown;
    try {
      requestBody = await req.json();
    } catch {
      return errorResponse('Invalid JSON in request body', 400);
    }

    const validationError = validateRequest(requestBody);
    if (validationError != null) {
      return errorResponse(validationError, 400);
    }

    const request = requestBody as OrchestratorRequest;
    const { messages } = request;

    // Resolve athlete context: use provided context, or auto-fetch by athlete_id
    let athleteContext = request.athlete_context;

    if (athleteContext == null && request.athlete_id != null) {
      try {
        athleteContext = await fetchAthleteContext(supabase, request.athlete_id);
      } catch (err) {
        return errorResponse(
          `Failed to fetch athlete context: ${err instanceof Error ? err.message : 'Unknown error'}`,
          500
        );
      }
    }

    // Get Anthropic API key
    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!anthropicApiKey) {
      return errorResponse('AI service not configured', 503);
    }

    const anthropic = new Anthropic({ apiKey: anthropicApiKey });
    const systemPrompt = buildSystemPrompt(athleteContext);

    // Convert to Anthropic message format
    let anthropicMessages: Anthropic.MessageParam[] = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    const allToolCalls: ToolCallResult[] = [];

    // Map tool definitions once, reused across all iterations
    const tools = TOOL_DEFINITIONS.map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: t.input_schema as Anthropic.Tool['input_schema'],
    }));

    // Agentic loop: continue until Claude doesn't request any tools
    for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        system: systemPrompt,
        tools,
        messages: anthropicMessages,
      });

      totalInputTokens += response.usage.input_tokens;
      totalOutputTokens += response.usage.output_tokens;

      // Check if Claude wants to use tools
      const toolUseBlocks = response.content.filter(
        (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
      );

      // If no tool use or end of turn, return final response
      if (toolUseBlocks.length === 0 || response.stop_reason === 'end_turn') {
        const textContent = response.content
          .filter((block): block is Anthropic.TextBlock => block.type === 'text')
          .map((block) => block.text)
          .join('\n\n');

        // Streaming: emit the buffered response as SSE events
        if (request.stream === true) {
          return createSSEResponse(
            textContent,
            allToolCalls,
            totalInputTokens,
            totalOutputTokens,
            corsHeaders
          );
        }

        // Non-streaming: return buffered JSON as before
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

      const toolResults = await executeTools(toolUses, authHeader);

      // Track tool calls for response
      allToolCalls.push(...toolResults);

      // Build tool result messages for Claude
      const toolResultContent = toolUseBlocks.map((block, idx) => ({
        type: 'tool_result' as const,
        tool_use_id: block.id,
        content: toolResults[idx].success
          ? JSON.stringify(toolResults[idx].result)
          : `Error: ${toolResults[idx].error}`,
        is_error: !toolResults[idx].success,
      }));

      // Add assistant's response and tool results to conversation
      anthropicMessages = [
        ...anthropicMessages,
        { role: 'assistant' as const, content: response.content },
        { role: 'user' as const, content: toolResultContent },
      ];
    }

    // If we hit max iterations, return what we have with an indication
    return jsonResponse({
      content:
        'I gathered data from multiple sources but reached my processing limit. Here is what I found so far. Please try rephrasing your question if you need more specific information.',
      tool_calls: allToolCalls.length > 0 ? allToolCalls : undefined,
      usage: {
        input_tokens: totalInputTokens,
        output_tokens: totalOutputTokens,
      },
    } satisfies OrchestratorResponse);
  } catch (error) {
    console.error('AI Orchestrator Error:', error);

    if (error instanceof Anthropic.APIError) {
      return errorResponse('AI service error', error.status ?? 500);
    }

    return errorResponse('Internal server error', 500);
  }
});
