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
    // Return mock recommendation in dev mode
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
    const qualitySuffix =
      formData.sleepQuality != null ? ` (quality ${formData.sleepQuality}/10)` : '';
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
    // Return mock response in dev mode
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
