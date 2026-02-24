// Khepri AI Coach Edge Function
// Handles chat interactions with Claude API for personalized coaching responses
//
// Environment variables required:
// - ANTHROPIC_API_KEY: Claude API key
// - SUPABASE_URL: Supabase project URL (auto-provided by Supabase)
// - SUPABASE_ANON_KEY: Supabase publishable key for JWT verification (auto-provided as SUPABASE_ANON_KEY)

import Anthropic from 'npm:@anthropic-ai/sdk@0.36';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

import { type AthleteContext, buildSystemPrompt } from './prompts.ts';

// CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Message type for API requests
interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// Request body structure
interface AICoachRequest {
  messages: ChatMessage[];
  context?: AthleteContext;
}

// Response structure
interface AICoachResponse {
  content: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // Verify authorization header exists
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify the JWT token using Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !supabaseAnonKey) {
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    // Verify the user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse request body with error handling
    let requestBody: AICoachRequest;
    try {
      requestBody = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON in request body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { messages, context } = requestBody;

    // Validate messages array
    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: 'Invalid request: messages array required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate each message object has correct shape and types
    const allowedRoles = new Set<ChatMessage['role']>(['user', 'assistant', 'system']);
    for (const [index, message] of messages.entries()) {
      const isObject = message !== null && typeof message === 'object' && !Array.isArray(message);
      const role = isObject && 'role' in message ? (message as { role: unknown }).role : undefined;
      const content =
        isObject && 'content' in message ? (message as { content: unknown }).content : undefined;

      if (
        !isObject ||
        typeof role !== 'string' ||
        !allowedRoles.has(role as ChatMessage['role']) ||
        typeof content !== 'string'
      ) {
        return new Response(JSON.stringify({ error: `Invalid message at index ${index}` }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Get Anthropic API key
    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!anthropicApiKey) {
      return new Response(JSON.stringify({ error: 'AI service not configured' }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Initialize Anthropic client
    const anthropic = new Anthropic({
      apiKey: anthropicApiKey,
    });

    // Build system prompt with athlete context
    const systemPrompt = buildSystemPrompt(context);

    // Separate system messages from chat messages
    // Anthropic API only accepts 'user'/'assistant' roles in messages array
    // System content should be in the top-level system field
    const systemMessages = messages.filter((m) => m.role === 'system');
    const chatMessages = messages.filter((m) => m.role !== 'system');

    // Append any stored system messages to the system prompt
    const additionalSystemContent = systemMessages
      .map((m) => m.content)
      .filter((c) => c?.trim())
      .join('\n\n');

    const finalSystemPrompt = additionalSystemContent
      ? `${systemPrompt}\n\n${additionalSystemContent}`
      : systemPrompt;

    // Validate we have at least one user message and it starts with user
    const hasUserMessage = chatMessages.some((m) => m.role === 'user');
    if (!hasUserMessage) {
      return new Response(JSON.stringify({ error: 'At least one user message required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Anthropic requires first message to be from user
    if (chatMessages.length > 0 && chatMessages[0].role !== 'user') {
      return new Response(JSON.stringify({ error: 'First message must be from user' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Call Claude API
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: finalSystemPrompt,
      messages: chatMessages.map((m) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      })),
    });

    // Extract and concatenate all text content blocks from response
    const responseText = response.content
      .filter((block) => block.type === 'text')
      .map((block) => (block as { type: 'text'; text: string }).text)
      .join('\n\n');

    // Build response
    const result: AICoachResponse = {
      content: responseText,
      usage: {
        input_tokens: response.usage.input_tokens,
        output_tokens: response.usage.output_tokens,
      },
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    // Log full error details server-side for debugging
    console.error('AI Coach Error:', error);

    // Handle specific error types
    if (error instanceof Anthropic.APIError) {
      const status = error.status ?? 500;
      // Return generic message to client, don't leak API error details
      return new Response(JSON.stringify({ error: 'AI service error' }), {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generic error response - don't leak internal details to client
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
