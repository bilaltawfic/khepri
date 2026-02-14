import { supabase } from '@/lib/supabase';

/**
 * Standard MCP gateway response envelope.
 */
export interface MCPToolResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

/**
 * Get the MCP gateway URL from environment.
 * Throws if EXPO_PUBLIC_SUPABASE_URL is not configured.
 */
export function getMCPGatewayUrl(): string {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  if (!url) {
    throw new Error('EXPO_PUBLIC_SUPABASE_URL is not configured');
  }
  return `${url}/functions/v1/mcp-gateway`;
}

/**
 * Get auth headers for Supabase edge function calls.
 * Throws if Supabase is not configured or user is not authenticated.
 */
export async function getAuthHeaders(): Promise<HeadersInit> {
  if (!supabase) {
    throw new Error('Supabase is not configured');
  }
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('Not authenticated');
  }
  return {
    Authorization: `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  };
}
