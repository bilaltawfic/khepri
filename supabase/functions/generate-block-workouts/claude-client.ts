// Claude API client for block workout generation.
// Mirrors the pattern in generate-season-skeleton/index.ts.

// ============================================================================
// Tool-use schema — the contract Claude must return
// ============================================================================

const BLOCK_WORKOUT_TOOL = {
  name: 'generate_block_workouts',
  description: 'Generate the block training plan as structured JSON',
  input_schema: {
    type: 'object',
    properties: {
      weeks: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            weekNumber: { type: 'number', description: '1-indexed within the block' },
            weekStartDate: { type: 'string', description: 'YYYY-MM-DD, Monday of the week' },
            isRecoveryWeek: { type: 'boolean' },
            workouts: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  date: { type: 'string', description: 'YYYY-MM-DD' },
                  sport: {
                    type: 'string',
                    enum: ['swim', 'bike', 'run', 'strength', 'rest'],
                  },
                  workoutType: {
                    type: 'string',
                    enum: [
                      'endurance',
                      'threshold',
                      'vo2',
                      'tempo',
                      'recovery',
                      'long',
                      'race_pace',
                      'technique',
                      'rest',
                    ],
                  },
                  name: {
                    type: 'string',
                    description: "Short label, e.g. 'Bike - Threshold 4x8'",
                  },
                  plannedDurationMinutes: { type: 'number' },
                  intensityZone: {
                    type: 'string',
                    enum: ['Z1', 'Z2', 'Z3', 'Z4', 'Z5'],
                  },
                  structure: {
                    type: 'object',
                    properties: {
                      sections: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            name: {
                              type: 'string',
                              enum: ['Warmup', 'Main Set', 'Cooldown'],
                            },
                            durationMinutes: { type: 'number' },
                            steps: {
                              type: 'array',
                              items: {
                                type: 'object',
                                properties: {
                                  description: { type: 'string' },
                                  durationMinutes: { type: 'number' },
                                },
                                required: ['description', 'durationMinutes'],
                              },
                            },
                          },
                          required: ['name', 'durationMinutes', 'steps'],
                        },
                      },
                      totalDurationMinutes: { type: 'number' },
                    },
                    required: ['sections', 'totalDurationMinutes'],
                  },
                },
                required: [
                  'date',
                  'sport',
                  'workoutType',
                  'name',
                  'plannedDurationMinutes',
                  'intensityZone',
                  'structure',
                ],
              },
            },
          },
          required: ['weekNumber', 'weekStartDate', 'isRecoveryWeek', 'workouts'],
        },
      },
    },
    required: ['weeks'],
  },
} as const;

// ============================================================================
// Types
// ============================================================================

interface ClaudeWorkoutSection {
  name: string;
  durationMinutes: number;
  steps: Array<{ description: string; durationMinutes: number }>;
}

export interface ClaudeWorkout {
  date: string;
  sport: string;
  workoutType: string;
  name: string;
  plannedDurationMinutes: number;
  intensityZone: string;
  structure: {
    sections: ClaudeWorkoutSection[];
    totalDurationMinutes: number;
  };
}

export interface ClaudeWeek {
  weekNumber: number;
  weekStartDate: string;
  isRecoveryWeek: boolean;
  workouts: ClaudeWorkout[];
}

export interface ClaudeBlockResponse {
  weeks: ClaudeWeek[];
}

// ============================================================================
// API call
// ============================================================================

export async function callClaudeForBlock(
  systemPrompt: string,
  userPrompt: string
): Promise<ClaudeBlockResponse> {
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not configured');
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 8192,
      // temperature: 0 for repeatable plans given the same inputs
      temperature: 0,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      tools: [BLOCK_WORKOUT_TOOL],
      tool_choice: { type: 'tool', name: 'generate_block_workouts' },
    }),
  });

  if (!response.ok) {
    throw new Error(`Block workout generation failed (upstream ${response.status})`);
  }

  const result = await response.json();
  const toolBlock = result.content?.find(
    (c: { type: string; name?: string }) => c.type === 'tool_use'
  );

  if (!toolBlock) {
    throw new Error('No tool_use response from Claude API');
  }

  if (toolBlock.name !== BLOCK_WORKOUT_TOOL.name) {
    throw new Error(
      `Unexpected tool from Claude API: expected "${BLOCK_WORKOUT_TOOL.name}", got "${String(toolBlock.name)}"`
    );
  }

  if (!toolBlock.input) {
    throw new Error(`No input returned for tool "${BLOCK_WORKOUT_TOOL.name}"`);
  }

  return toolBlock.input as ClaudeBlockResponse;
}
