import Constants from 'expo-constants';

import { supabase } from '@/lib/supabase';
import type { AIRecommendation, CheckinFormData } from '@/types/checkin';

/**
 * Athlete context for AI requests
 */
export type AIContext = {
  name?: string;
  ctl?: number;
  atl?: number;
  tsb?: number;
  recentCheckin?: {
    sleepQuality?: number;
    sleepHours?: number;
    energyLevel?: number;
    stressLevel?: number;
    overallSoreness?: number;
    availableTimeMinutes?: number;
  };
  goals?: Array<{ title: string; goalType?: string; targetDate?: string; priority?: string }>;
  constraints?: Array<{ title: string; constraintType: string; description?: string }>;
};

/**
 * Message format for chat requests
 */
export type AIMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

/**
 * Response from the AI coach Edge Function
 */
type AICoachResponse = {
  content: string;
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
};

function toError(e: unknown, fallback: string): Error {
  if (e instanceof Error) return e;
  if (typeof e === 'string') return new Error(e);
  return new Error(fallback);
}

/**
 * Generate a mock recommendation based on form data
 * Used as fallback when Supabase is not configured
 */
function generateMockRecommendation(formData: CheckinFormData): AIRecommendation {
  const {
    sleepQuality,
    energyLevel,
    stressLevel,
    overallSoreness,
    availableTimeMinutes,
    constraints,
  } = formData;

  // Calculate a simple wellness score (0-1)
  const sleepScore = (sleepQuality ?? 5) / 10;
  const energyScore = (energyLevel ?? 5) / 10;
  const stressScore = 1 - (stressLevel ?? 5) / 10; // Invert stress
  const sorenessScore = 1 - (overallSoreness ?? 5) / 10; // Invert soreness

  const wellnessScore = (sleepScore + energyScore + stressScore + sorenessScore) / 4;

  // Determine intensity based on wellness score
  let intensityLevel: AIRecommendation['intensityLevel'];
  let workoutType: string;
  let summary: string;

  if (wellnessScore < 0.35) {
    intensityLevel = 'recovery';
    workoutType = 'Light recovery session';
    summary = "Your body needs rest today. Let's focus on recovery with some light movement.";
  } else if (wellnessScore < 0.5) {
    intensityLevel = 'easy';
    workoutType = 'Easy aerobic session';
    summary =
      "You're a bit fatigued. A gentle session will help maintain fitness without adding stress.";
  } else if (wellnessScore < 0.7) {
    intensityLevel = 'moderate';
    workoutType = 'Steady state workout';
    summary = "You're feeling decent. A moderate effort session will help build fitness.";
  } else {
    intensityLevel = 'hard';
    workoutType = 'Quality training session';
    summary = "You're fresh and ready! Great day for a more challenging workout.";
  }

  // Adjust for constraints
  if (constraints.includes('feeling_unwell')) {
    intensityLevel = 'recovery';
    workoutType = 'Complete rest or very light stretching';
    summary = 'You mentioned not feeling well. Rest is the best medicine today.';
  }

  // Adjust duration based on available time
  const duration = Math.min(availableTimeMinutes ?? 60, getRecommendedDuration(intensityLevel));

  return {
    summary,
    workoutSuggestion: workoutType,
    intensityLevel,
    duration,
    notes:
      constraints.length > 0
        ? `Adjusted for: ${constraints.join(', ').replaceAll('_', ' ')}`
        : undefined,
  };
}

function getRecommendedDuration(intensity: AIRecommendation['intensityLevel']): number {
  switch (intensity) {
    case 'recovery':
      return 30;
    case 'easy':
      return 45;
    case 'moderate':
      return 60;
    case 'hard':
      return 75;
    default:
      return 60;
  }
}

/**
 * Parse AI response content into a structured recommendation
 */
function parseRecommendationFromContent(
  content: string,
  formData: CheckinFormData
): AIRecommendation {
  // Try to extract intensity level from the response
  const contentLower = content.toLowerCase();
  let intensityLevel: AIRecommendation['intensityLevel'] = 'moderate';

  if (contentLower.includes('recovery') || contentLower.includes('rest')) {
    intensityLevel = 'recovery';
  } else if (contentLower.includes('easy') || contentLower.includes('light')) {
    intensityLevel = 'easy';
  } else if (
    contentLower.includes('hard') ||
    contentLower.includes('intense') ||
    contentLower.includes('quality')
  ) {
    intensityLevel = 'hard';
  }

  // Calculate duration based on available time and intensity
  const duration = Math.min(
    formData.availableTimeMinutes ?? 60,
    getRecommendedDuration(intensityLevel)
  );

  return {
    summary: content,
    workoutSuggestion: extractWorkoutSuggestion(content),
    intensityLevel,
    duration,
    notes:
      formData.constraints.length > 0
        ? `Adjusted for: ${formData.constraints.join(', ').replaceAll('_', ' ')}`
        : undefined,
  };
}

/**
 * Extract workout suggestion from AI response
 */
function extractWorkoutSuggestion(content: string): string {
  // Try to find a sentence that mentions workout type
  const sentences = content.split(/[.!?]+/);
  for (const sentence of sentences) {
    const lower = sentence.toLowerCase();
    if (
      lower.includes('workout') ||
      lower.includes('session') ||
      lower.includes('training') ||
      lower.includes('run') ||
      lower.includes('swim') ||
      lower.includes('bike') ||
      lower.includes('ride')
    ) {
      return sentence.trim();
    }
  }
  // Fallback to first sentence
  return sentences[0]?.trim() || 'Training session';
}

/**
 * Get a workout recommendation based on check-in data
 */
export async function getCheckinRecommendation(
  formData: CheckinFormData,
  context?: AIContext
): Promise<{ data: AIRecommendation | null; error: Error | null }> {
  if (!supabase) {
    // Return mock recommendation when Supabase is not configured
    return { data: generateMockRecommendation(formData), error: null };
  }

  try {
    // Build the check-in message
    const checkinSummary = buildCheckinSummary(formData);

    const messages: AIMessage[] = [
      {
        role: 'user',
        content: `Here's my check-in for today:\n${checkinSummary}\n\nBased on how I'm feeling, what type of workout should I do today? Please provide a brief recommendation.`,
      },
    ];

    // Add context from form data
    const enhancedContext: AIContext = {
      ...context,
      recentCheckin: {
        sleepQuality: formData.sleepQuality ?? undefined,
        sleepHours: formData.sleepHours ?? undefined,
        energyLevel: formData.energyLevel ?? undefined,
        stressLevel: formData.stressLevel ?? undefined,
        overallSoreness: formData.overallSoreness ?? undefined,
        availableTimeMinutes: formData.availableTimeMinutes ?? undefined,
      },
    };

    const { data, error } = await supabase.functions.invoke<AICoachResponse>('ai-coach', {
      body: {
        messages,
        context: enhancedContext,
      },
    });

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    if (!data?.content) {
      return { data: null, error: new Error('No response from AI') };
    }

    // Parse the AI response into a structured recommendation
    const recommendation = parseRecommendationFromContent(data.content, formData);
    return { data: recommendation, error: null };
  } catch (e: unknown) {
    return { data: null, error: toError(e, 'Unknown error getting recommendation') };
  }
}

/**
 * Build a text summary of the check-in data
 */
function buildCheckinSummary(formData: CheckinFormData): string {
  const parts: string[] = [];

  if (formData.sleepHours != null) {
    let qualitySuffix = '';
    if (formData.sleepQuality != null) {
      qualitySuffix = ` (quality ${formData.sleepQuality}/10)`;
    }
    parts.push(`- Sleep: ${formData.sleepHours} hours${qualitySuffix}`);
  }
  if (formData.energyLevel != null) {
    parts.push(`- Energy level: ${formData.energyLevel}/10`);
  }
  if (formData.stressLevel != null) {
    parts.push(`- Stress level: ${formData.stressLevel}/10`);
  }
  if (formData.overallSoreness != null) {
    parts.push(`- Overall soreness: ${formData.overallSoreness}/10`);
  }
  if (formData.availableTimeMinutes != null) {
    parts.push(`- Available time: ${formData.availableTimeMinutes} minutes`);
  }
  if (formData.constraints.length > 0) {
    parts.push(`- Constraints: ${formData.constraints.join(', ').replaceAll('_', ' ')}`);
  }
  if (formData.notes) {
    parts.push(`- Notes: ${formData.notes}`);
  }

  return parts.join('\n');
}

/**
 * Send a chat message and get AI response
 */
export async function sendChatMessage(
  messages: AIMessage[],
  context?: AIContext
): Promise<{ data: string | null; error: Error | null }> {
  if (!supabase) {
    // Return mock response when Supabase is not configured
    return {
      data: "I'm your AI coach. I'd be happy to help you with your training! (Mock response - Supabase not configured)",
      error: null,
    };
  }

  try {
    const { data, error } = await supabase.functions.invoke<AICoachResponse>('ai-coach', {
      body: {
        messages,
        context,
      },
    });

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    if (!data?.content) {
      return { data: null, error: new Error('No response from AI') };
    }

    return { data: data.content, error: null };
  } catch (e: unknown) {
    return { data: null, error: toError(e, 'Unknown error sending message') };
  }
}

// ====================================================================
// SSE Streaming
// ====================================================================

const VALID_SSE_EVENT_TYPES = ['content_delta', 'tool_calls', 'usage', 'done', 'error'] as const;
type SSEEventType = (typeof VALID_SSE_EVENT_TYPES)[number];

export type SSEEvent = {
  readonly type: SSEEventType;
  readonly [key: string]: unknown;
};

function isValidSSEEventType(type: unknown): type is SSEEventType {
  return typeof type === 'string' && VALID_SSE_EVENT_TYPES.includes(type as SSEEventType);
}

/**
 * Parse a single SSE data line into an event object.
 * Returns null for non-data lines or malformed JSON.
 */
export function parseSSELine(line: string): SSEEvent | null {
  if (!line.startsWith('data: ')) return null;
  const json = line.slice(6);
  try {
    const parsed: unknown = JSON.parse(json);
    if (typeof parsed !== 'object' || parsed == null) return null;
    const obj = parsed as Record<string, unknown>;
    if (!isValidSSEEventType(obj.type)) return null;
    return obj as unknown as SSEEvent;
  } catch {
    return null;
  }
}

function getSupabaseUrl(): string | undefined {
  return Constants.expoConfig?.extra?.supabaseUrl ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
}

/**
 * Callbacks for streaming chat responses
 */
export type StreamCallbacks = {
  readonly onDelta: (accumulatedText: string) => void;
  readonly onDone: (fullContent: string) => void;
  readonly onError: (error: Error) => void;
};

type StreamResult =
  | { readonly status: 'delta'; readonly fullContent: string }
  | { readonly status: 'done'; readonly fullContent: string }
  | { readonly status: 'error'; readonly message: string };

/**
 * Read SSE events from a ReadableStream, yielding results for each event.
 */
async function readSSEStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  onResult: (result: StreamResult) => void
): Promise<void> {
  const decoder = new TextDecoder();
  let fullContent = '';
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      const event = parseSSELine(line);
      if (!event) continue;

      if (event.type === 'content_delta') {
        const text = typeof event.text === 'string' ? event.text : '';
        fullContent += text;
        onResult({ status: 'delta', fullContent });
      } else if (event.type === 'error') {
        const errorMsg = typeof event.error === 'string' ? event.error : 'Stream error';
        onResult({ status: 'error', message: errorMsg });
        return;
      } else if (event.type === 'done') {
        onResult({ status: 'done', fullContent });
        return;
      }
    }
  }

  // Stream ended without a done event — still deliver what we have
  onResult({ status: 'done', fullContent });
}

/**
 * Authenticate and fetch a streaming response from the AI orchestrator.
 * Returns the response body reader or an error message.
 */
async function fetchStreamResponse(
  messages: AIMessage[],
  context: AIContext | undefined
): Promise<{ reader: ReadableStreamDefaultReader<Uint8Array> } | { error: string }> {
  if (!supabase) return { error: 'Supabase not configured' };

  const supabaseUrl = getSupabaseUrl();
  if (!supabaseUrl) return { error: 'Supabase URL not configured' };

  const session = await supabase.auth.getSession();
  const token = session.data.session?.access_token;
  if (!token) return { error: 'Not authenticated' };

  const response = await fetch(`${supabaseUrl}/functions/v1/ai-orchestrator`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ messages, athlete_context: context, stream: true }),
  });

  if (!response.ok) return { error: `Stream request failed: ${response.status}` };
  if (!response.body) return { error: 'Response body is not readable' };

  return { reader: response.body.getReader() };
}

function dispatchStreamResult(result: StreamResult, callbacks: StreamCallbacks) {
  if (result.status === 'delta') {
    callbacks.onDelta(result.fullContent);
  } else if (result.status === 'done') {
    callbacks.onDone(result.fullContent);
  } else {
    callbacks.onError(new Error(result.message));
  }
}

/**
 * Send a chat message and stream the AI response via SSE.
 * Calls onDelta with accumulated text as each content_delta arrives,
 * onDone with the final full content, or onError if something fails.
 */
export async function sendChatMessageStream(
  messages: AIMessage[],
  context: AIContext | undefined,
  callbacks: StreamCallbacks
): Promise<void> {
  if (!supabase) {
    const mockContent =
      "I'm your AI coach. I'd be happy to help you with your training! (Mock response - Supabase not configured)";
    callbacks.onDelta(mockContent);
    callbacks.onDone(mockContent);
    return;
  }

  try {
    const result = await fetchStreamResponse(messages, context);
    if ('error' in result) {
      callbacks.onError(new Error(result.error));
      return;
    }

    await readSSEStream(result.reader, (streamResult) =>
      dispatchStreamResult(streamResult, callbacks)
    );
  } catch (e: unknown) {
    callbacks.onError(toError(e, 'Unknown error during streaming'));
  }
}
