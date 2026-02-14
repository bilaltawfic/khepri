// Khepri Embedding Generation Edge Function
// Generates vector embeddings from text content using OpenAI's text-embedding-3-small
// model and stores them in the embeddings table for RAG-based AI coaching.
//
// Environment variables required:
// - OPENAI_API_KEY: OpenAI API key for embeddings
// - SUPABASE_URL: Supabase project URL (auto-provided)
// - SUPABASE_ANON_KEY: Supabase anon key for JWT verification (auto-provided)
// - SUPABASE_SERVICE_ROLE_KEY: Supabase service role key for inserts (auto-provided)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

import {
  EMBEDDING_DIMENSIONS,
  EMBEDDING_MODEL,
  type GenerateEmbeddingRequest,
  type GenerateEmbeddingResponse,
  type OpenAIEmbeddingResponse,
} from './types.ts';
import { validateRequest } from './validate.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function errorResponse(error: string, status: number): Response {
  return jsonResponse({ error }, status);
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  // Verify environment variables
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (openaiApiKey == null) {
    return errorResponse('OPENAI_API_KEY not configured', 500);
  }
  if (supabaseUrl == null || supabaseAnonKey == null) {
    return errorResponse('Supabase configuration missing', 500);
  }
  if (supabaseServiceRoleKey == null) {
    return errorResponse('Supabase service role key not configured', 500);
  }

  // Authenticate request
  const authHeader = req.headers.get('Authorization');
  if (authHeader == null) {
    return errorResponse('Missing authorization header', 401);
  }

  const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error: authError,
  } = await supabaseAnon.auth.getUser();

  if (authError != null || user == null) {
    return errorResponse('Unauthorized', 401);
  }

  // Parse and validate request body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse('Invalid JSON in request body', 400);
  }

  const validationError = validateRequest(body);
  if (validationError != null) {
    return errorResponse(validationError, 400);
  }

  const request = body as GenerateEmbeddingRequest;

  // Validate athlete_id ownership (if personal embedding)
  if (request.athlete_id != null) {
    const { data: athlete, error: athleteError } = await supabaseAnon
      .from('athletes')
      .select('id')
      .eq('id', request.athlete_id)
      .eq('auth_user_id', user.id)
      .single();

    if (athleteError != null) {
      console.error('Athlete ownership lookup failed:', athleteError.message);
      return errorResponse('Failed to verify athlete ownership', 500);
    }

    if (athlete == null) {
      return errorResponse('athlete_id does not belong to authenticated user', 403);
    }
  }

  // Call OpenAI Embeddings API
  let embeddingVector: number[];
  let tokensUsed: number;
  try {
    const openaiResponse = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: request.content,
        encoding_format: 'float',
      }),
    });

    if (!openaiResponse.ok) {
      const errorBody = await openaiResponse.text();
      console.error(`OpenAI API error (${openaiResponse.status}):`, errorBody);
      return errorResponse('Embedding service error', 502);
    }

    const openaiData: OpenAIEmbeddingResponse = await openaiResponse.json();

    if (openaiData.data.length === 0) {
      return errorResponse('OpenAI returned no embeddings', 502);
    }

    embeddingVector = openaiData.data[0].embedding;
    tokensUsed = openaiData.usage.total_tokens;

    if (embeddingVector.length !== EMBEDDING_DIMENSIONS) {
      return errorResponse(
        `Unexpected embedding dimensions: ${embeddingVector.length} (expected ${EMBEDDING_DIMENSIONS})`,
        500
      );
    }
  } catch (err) {
    return errorResponse(
      `Failed to generate embedding: ${err instanceof Error ? err.message : 'Unknown error'}`,
      502
    );
  }

  // Use service role only for shared knowledge (no athlete_id); use anon client
  // for personal embeddings so RLS enforces ownership.
  const insertClient =
    request.athlete_id == null ? createClient(supabaseUrl, supabaseServiceRoleKey) : supabaseAnon;
  const embeddingString = `[${embeddingVector.join(',')}]`;

  const { data: inserted, error: insertError } = await insertClient
    .from('embeddings')
    .insert({
      content_type: request.content_type,
      source_id: request.source_id ?? null,
      chunk_index: request.chunk_index ?? 0,
      title: request.title,
      content: request.content,
      metadata: request.metadata ?? {},
      embedding: embeddingString,
      athlete_id: request.athlete_id ?? null,
    })
    .select('id')
    .single();

  if (insertError != null || inserted == null) {
    return errorResponse(
      `Failed to store embedding: ${insertError?.message ?? 'No data returned'}`,
      500
    );
  }

  const response: GenerateEmbeddingResponse = {
    embedding_id: inserted.id,
    dimensions: EMBEDDING_DIMENSIONS,
    model: EMBEDDING_MODEL,
    tokens_used: tokensUsed,
  };

  return jsonResponse(response, 201);
});
