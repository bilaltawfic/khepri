// Helpers for surfacing actionable error messages from Supabase Edge Function
// invocations. The supabase-js client wraps non-2xx responses in a
// `FunctionsHttpError` whose `.message` is always the generic
// "Edge Function returned a non-2xx status code". The real cause lives in the
// underlying Response body, which we read here and turn into a friendly string.

interface FunctionsHttpErrorLike {
  context?: Response;
  message?: string;
}

const MAX_BODY_MESSAGE_LENGTH = 500;

async function readResponseBody(response: Response): Promise<string> {
  try {
    if (typeof response.clone === 'function') {
      return await response.clone().text();
    }
  } catch {
    // Cloning failed (or unsupported); fall through to direct read.
  }
  return await response.text();
}

/**
 * Try to read a meaningful error message out of a Supabase Edge Function
 * error. Falls back to a friendly default if the body cannot be parsed.
 *
 * Only surfaces server-provided messages for 4xx (validation/auth) responses;
 * for 5xx responses we return the friendly `fallback` to avoid leaking
 * internal details from upstream/DB errors.
 *
 * @param error Error returned from `supabase.functions.invoke({...}).error`
 * @param fallback Friendly fallback message if we cannot extract anything
 */
export async function extractEdgeFunctionError(error: unknown, fallback: string): Promise<string> {
  const httpError = error as FunctionsHttpErrorLike;
  const response = httpError?.context;

  if (response != null && typeof response.text === 'function') {
    const status = typeof response.status === 'number' ? response.status : 0;
    const isClientError = status >= 400 && status < 500;

    if (isClientError) {
      try {
        const text = await readResponseBody(response);
        const trimmedText = text.trim();
        if (trimmedText.length > 0) {
          try {
            const parsed = JSON.parse(trimmedText) as { error?: unknown; message?: unknown };
            const candidate = parsed.error ?? parsed.message;
            if (typeof candidate === 'string') {
              const trimmedCandidate = candidate.trim();
              if (
                trimmedCandidate.length > 0 &&
                trimmedCandidate.length < MAX_BODY_MESSAGE_LENGTH
              ) {
                return trimmedCandidate;
              }
            }
          } catch {
            // Body wasn't JSON — surface the raw text if it looks human-readable.
            if (trimmedText.length < MAX_BODY_MESSAGE_LENGTH) {
              return trimmedText;
            }
          }
        }
      } catch {
        // Reading the body failed; fall through to the fallback.
      }
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
