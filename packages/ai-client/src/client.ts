/**
 * Claude API Client
 *
 * Typed wrapper around the Anthropic SDK for coaching interactions.
 * Supports streaming responses, tool use, and error handling with retries.
 */

import Anthropic from '@anthropic-ai/sdk';
import type { Message, MessageParam } from '@anthropic-ai/sdk/resources/messages';

import type {
  CoachingContext,
  CoachingRequestOptions,
  CoachingResponse,
  CoachingScenario,
  CoachingStreamChunk,
  WorkoutRecommendation,
} from './types.js';

import { serializeContextForPrompt } from './context-builder.js';
import { getCoachingSystemPrompt } from './prompts/coaching-system.js';
import { buildDailyCheckinPrompt } from './prompts/daily-checkin.js';
import { buildPlanAdjustmentPrompt } from './prompts/plan-adjustment.js';
import { buildWorkoutRecommendationPrompt } from './prompts/workout-recommendation.js';

// =============================================================================
// CLIENT CONFIGURATION
// =============================================================================

/**
 * Configuration options for the coaching client
 */
export interface CoachingClientConfig {
  /** Anthropic API key (defaults to ANTHROPIC_API_KEY env var) */
  apiKey?: string;

  /** Model to use (defaults to claude-sonnet-4-20250514) */
  model?: string;

  /** Maximum tokens in response (defaults to 4096) */
  maxTokens?: number;

  /** Custom base URL for API (optional) */
  baseURL?: string;

  /** Request timeout in milliseconds (defaults to 60000) */
  timeout?: number;

  /** Maximum retry attempts (defaults to 3) */
  maxRetries?: number;
}

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: Required<Omit<CoachingClientConfig, 'apiKey' | 'baseURL'>> = {
  model: 'claude-sonnet-4-20250514',
  maxTokens: 4096,
  timeout: 60000,
  maxRetries: 3,
};

// =============================================================================
// COACHING CLIENT
// =============================================================================

/**
 * AI Coaching Client for triathlon training recommendations
 *
 * @example
 * ```typescript
 * const client = new CoachingClient({ apiKey: 'your-api-key' });
 *
 * const response = await client.getCoachingResponse({
 *   scenario: 'daily-checkin',
 *   context: coachingContext,
 * });
 *
 * console.log(response.message);
 * ```
 */
export class CoachingClient {
  private static idCounter = 0;
  private client: Anthropic;
  private config: Required<Omit<CoachingClientConfig, 'apiKey' | 'baseURL'>>;

  constructor(config: CoachingClientConfig = {}) {
    this.client = new Anthropic({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
      timeout: config.timeout ?? DEFAULT_CONFIG.timeout,
      maxRetries: config.maxRetries ?? DEFAULT_CONFIG.maxRetries,
    });

    this.config = {
      model: config.model ?? DEFAULT_CONFIG.model,
      maxTokens: config.maxTokens ?? DEFAULT_CONFIG.maxTokens,
      timeout: config.timeout ?? DEFAULT_CONFIG.timeout,
      maxRetries: config.maxRetries ?? DEFAULT_CONFIG.maxRetries,
    };
  }

  /**
   * Get a coaching response for a given scenario
   */
  async getCoachingResponse(options: CoachingRequestOptions): Promise<CoachingResponse> {
    const { scenario, context, userMessage } = options;

    const systemPrompt = this.buildSystemPrompt(context);
    const userPrompt = this.buildUserPrompt(scenario, context, userMessage);

    const messages: MessageParam[] = [
      {
        role: 'user',
        content: userPrompt,
      },
    ];

    const response = await this.client.messages.create({
      model: this.config.model,
      max_tokens: this.config.maxTokens,
      system: systemPrompt,
      messages,
    });

    return this.parseResponse(response);
  }

  /**
   * Get a streaming coaching response
   */
  async *getCoachingResponseStream(
    options: CoachingRequestOptions
  ): AsyncGenerator<CoachingStreamChunk> {
    const { scenario, context, userMessage } = options;

    const systemPrompt = this.buildSystemPrompt(context);
    const userPrompt = this.buildUserPrompt(scenario, context, userMessage);

    const messages: MessageParam[] = [
      {
        role: 'user',
        content: userPrompt,
      },
    ];

    const stream = this.client.messages.stream({
      model: this.config.model,
      max_tokens: this.config.maxTokens,
      system: systemPrompt,
      messages,
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta') {
        const delta = event.delta;
        if ('text' in delta) {
          yield {
            type: 'text',
            content: delta.text,
          };
        }
      }
    }

    yield { type: 'done' };
  }

  /**
   * Send a follow-up message in a conversation
   */
  async sendFollowUp(
    previousMessages: MessageParam[],
    userMessage: string,
    context: CoachingContext
  ): Promise<CoachingResponse> {
    const systemPrompt = this.buildSystemPrompt(context);

    const messages: MessageParam[] = [
      ...previousMessages,
      {
        role: 'user',
        content: userMessage,
      },
    ];

    const response = await this.client.messages.create({
      model: this.config.model,
      max_tokens: this.config.maxTokens,
      system: systemPrompt,
      messages,
    });

    return this.parseResponse(response);
  }

  /**
   * Build the system prompt with athlete context
   */
  private buildSystemPrompt(context: CoachingContext): string {
    return getCoachingSystemPrompt({
      athleteName: context.athlete.displayName,
    });
  }

  /**
   * Build the user prompt based on scenario
   */
  private buildUserPrompt(
    scenario: CoachingScenario,
    context: CoachingContext,
    userMessage?: string
  ): string {
    switch (scenario) {
      case 'daily-checkin':
        return buildDailyCheckinPrompt(context);

      case 'workout-recommendation':
        return buildWorkoutRecommendationPrompt(context);

      case 'plan-adjustment':
        return buildPlanAdjustmentPrompt(context, {
          reason: 'general',
          details: userMessage,
        });
      default: {
        const contextString = serializeContextForPrompt(context);
        return `# Athlete Context\n\n${contextString}\n\n---\n\n# Athlete's Question\n\n${userMessage ?? 'Please provide coaching guidance based on my current situation.'}`;
      }
    }
  }

  /**
   * Parse the API response into a CoachingResponse
   */
  private parseResponse(response: Message): CoachingResponse {
    let message = '';

    for (const block of response.content) {
      if (block.type === 'text') {
        message += block.text;
      }
      // Tool use blocks would be parsed here for structured outputs
    }

    // Try to extract workout recommendation from the message
    const recommendation = this.extractWorkoutRecommendation(message);

    return {
      message,
      recommendation,
    };
  }

  /**
   * Extract a structured workout recommendation from the message
   * This is a basic extraction - could be enhanced with tool use
   */
  private extractWorkoutRecommendation(message: string): WorkoutRecommendation | undefined {
    // Look for common workout patterns in the response
    // This is a simplified extraction - a more robust solution would use
    // Claude's tool use feature to return structured data

    const sportMatch = message.match(/Sport:\s*(swim|bike|run|strength|rest)/i);
    const durationMatch = message.match(/Duration:\s*(\d+)\s*minutes?/i);
    const intensityMatch = message.match(
      /Intensity:\s*(recovery|easy|moderate|tempo|threshold|vo2max|sprint)/i
    );

    if (!sportMatch) {
      return undefined;
    }

    const sport = sportMatch[1]?.toLowerCase() as WorkoutRecommendation['sport'];
    const durationMinutes = durationMatch ? Number.parseInt(durationMatch[1] ?? '0', 10) : 60;
    const intensity = (intensityMatch?.[1]?.toLowerCase() ??
      'moderate') as WorkoutRecommendation['intensity'];

    // Extract title - look for workout title patterns
    const titleMatch = message.match(/(?:Workout Title|Today's Recommendation)[:\s]*([^\n]+)/i);
    const title = titleMatch?.[1]?.trim() ?? `${sport} workout`;

    // Generate UUID with fallback for React Native compatibility
    // Using timestamp + counter pattern instead of Math.random() for deterministic fallback
    const id =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `workout-${Date.now().toString(36)}-${(++CoachingClient.idCounter).toString(36)}`;

    return {
      id,
      sport,
      title,
      description: message,
      durationMinutes,
      intensity,
      mainSet: [], // Would need more parsing for detailed structure
      reasoning: 'See full response for detailed reasoning.',
    };
  }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Create a new coaching client with default configuration
 */
export function createCoachingClient(config?: CoachingClientConfig): CoachingClient {
  return new CoachingClient(config);
}

/**
 * Check if the API key is configured
 */
export function isConfigured(): boolean {
  // Guard for non-Node environments (React Native, browser)
  if (typeof process === 'undefined' || !process.env) {
    return false;
  }
  return !!process.env.ANTHROPIC_API_KEY;
}
