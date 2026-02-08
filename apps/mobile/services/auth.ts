import { supabase } from '@/lib/supabase';

function toError(e: unknown, fallback: string): Error {
  if (e instanceof Error) return e;
  if (typeof e === 'string') return new Error(e);
  return new Error(fallback);
}

/**
 * Send a password reset email to the given address.
 * Returns an object with an `error` property containing an Error on failure, or null on success.
 */
export async function resetPassword(email: string): Promise<{ error: Error | null }> {
  if (!supabase) {
    return { error: new Error('Supabase is not configured') };
  }
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    return { error: error ? new Error(error.message) : null };
  } catch (e: unknown) {
    return { error: toError(e, 'Unknown error resetting password') };
  }
}

/**
 * Update the current user's password.
 * Requires the user to be authenticated (e.g. via a recovery link).
 */
export async function updatePassword(newPassword: string): Promise<{ error: Error | null }> {
  if (!supabase) {
    return { error: new Error('Supabase is not configured') };
  }
  try {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    return { error: error ? new Error(error.message) : null };
  } catch (e: unknown) {
    return { error: toError(e, 'Unknown error updating password') };
  }
}
