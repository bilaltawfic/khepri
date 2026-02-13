// MCP Gateway Edge Function
// Routes MCP tool requests for Intervals.icu integration
//
// Environment variables required:
// - SUPABASE_URL: Supabase project URL (auto-provided)
// - SUPABASE_ANON_KEY: Supabase anon key for JWT verification (auto-provided)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

import { getTool, getToolDefinitions } from './tools/index.ts';
import type { MCPGatewayRequest, MCPListToolsResponse, MCPToolResult } from './types.ts';

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

const VALID_ACTIONS = new Set(['list_tools', 'execute_tool']);

/**
 * Validate the request body shape at runtime.
 */
function isValidRequest(body: unknown): body is MCPGatewayRequest {
  if (typeof body !== 'object' || body === null) return false;
  const obj = body as Record<string, unknown>;

  if (typeof obj.action !== 'string' || !VALID_ACTIONS.has(obj.action)) {
    return false;
  }

  if (obj.action === 'execute_tool') {
    if (typeof obj.tool_name !== 'string' || !obj.tool_name) {
      return false;
    }
    if (
      obj.tool_input !== undefined &&
      (typeof obj.tool_input !== 'object' ||
        obj.tool_input === null ||
        Array.isArray(obj.tool_input))
    ) {
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

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

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
      return errorResponse('Invalid request: action must be "list_tools" or "execute_tool"', 400);
    }

    // Handle list_tools action
    if (requestBody.action === 'list_tools') {
      const response: MCPListToolsResponse = {
        tools: getToolDefinitions(),
      };
      return jsonResponse(response);
    }

    // Handle execute_tool action
    const toolName = requestBody.tool_name;
    const toolInput = requestBody.tool_input ?? {};

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
  } catch (error) {
    console.error('MCP Gateway Error:', error);
    return errorResponse('Internal server error', 500);
  }
});
