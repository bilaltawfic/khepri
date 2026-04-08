// Helpers for surfacing actionable error messages from Supabase Edge Function
// invocations. The supabase-js client wraps non-2xx responses in a
// `FunctionsHttpError` whose `.message` is always the generic
// "Edge Function returned a non-2xx status code". The real cause lives in the
// underlying Response body, which we read here and turn into a friendly string.

interface FunctionsHttpErrorLike {
  context?: Response;
  message?: string;
}

/**
 * Try to read a meaningful error message out of a Supabase Edge Function
 * error. Falls back to a friendly default if the body cannot be parsed.
 *
 * @param error Error returned from `supabase.functions.invoke({...}).error`
 * @param fallback Friendly fallback message if we cannot extract anything
 */
export async function extractEdgeFunctionError(error: unknown, fallback: string): Promise<string> {
  const httpError = error as FunctionsHttpErrorLike;
  const response = httpError?.context;

  if (response != null && typeof response.text === 'function') {
    try {
      const text = await response.clone().text();
      if (text.length > 0) {
        try {
          const parsed = JSON.parse(text) as { error?: unknown; message?: unknown };
          const candidate = parsed.error ?? parsed.message;
          if (typeof candidate === 'string' && candidate.length > 0) {
            return candidate;
          }
        } catch {
          // Body wasn't JSON — surface the raw text if it looks human-readable.
          if (text.length < 500) {
            return text;
          }
        }
      }
    } catch {
      // Reading the body failed; fall through to the fallback.
    }
  }

  if (typeof httpError?.message === 'string' && httpError.message.length > 0) {
    // Replace the unhelpful default with the fallback so users see something
    // actionable instead of HTTP plumbing.
    if (httpError.message.includes('non-2xx status code')) {
      return fallback;
    }
    return httpError.message;
  }

  return fallback;
}
