// Type definitions for the AI Orchestrator Edge Function

// ====================================================================
// Request/Response types
// ====================================================================

export interface OrchestratorRequest {
  messages: ChatMessage[];
  athlete_context?: AthleteContext;
  conversation_id?: string;
  stream?: boolean;
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
  active_goals?: readonly Goal[];
  active_constraints?: readonly Constraint[];
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

// ====================================================================
// Claude API types for tool use
// ====================================================================

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

// ====================================================================
// SSE streaming types
// ====================================================================

export const STREAM_EVENT_TYPES = [
  'content_delta',
  'tool_calls',
  'usage',
  'done',
  'error',
] as const;

export type StreamEventType = (typeof STREAM_EVENT_TYPES)[number];

export interface StreamContentDelta {
  type: 'content_delta';
  text: string;
}

export interface StreamToolCalls {
  type: 'tool_calls';
  tool_calls: ToolCallResult[];
}

export interface StreamUsage {
  type: 'usage';
  input_tokens: number;
  output_tokens: number;
}

export interface StreamDone {
  type: 'done';
}

export interface StreamError {
  type: 'error';
  error: string;
}

export type StreamEventData =
  | StreamContentDelta
  | StreamToolCalls
  | StreamUsage
  | StreamDone
  | StreamError;

export interface StreamEvent {
  event: StreamEventType;
  data: StreamEventData;
}
