import { extractEdgeFunctionError } from '../edge-function-error';

const FALLBACK = 'fallback message';

function makeError(body: string | null, message = 'Edge Function returned a non-2xx status code') {
  const context =
    body == null
      ? undefined
      : ({
          text: () => Promise.resolve(body),
          clone: () => ({ text: () => Promise.resolve(body) }),
        } as unknown as Response);
  return { context, message };
}

describe('extractEdgeFunctionError', () => {
  it('returns the JSON `error` field from the response body', async () => {
    const err = makeError(JSON.stringify({ error: 'No quota left' }));
    expect(await extractEdgeFunctionError(err, FALLBACK)).toBe('No quota left');
  });

  it('returns the JSON `message` field if `error` is missing', async () => {
    const err = makeError(JSON.stringify({ message: 'Try again later' }));
    expect(await extractEdgeFunctionError(err, FALLBACK)).toBe('Try again later');
  });

  it('returns raw text body when not JSON and short', async () => {
    const err = makeError('plain text problem');
    expect(await extractEdgeFunctionError(err, FALLBACK)).toBe('plain text problem');
  });

  it('falls back when body is empty', async () => {
    const err = makeError('');
    expect(await extractEdgeFunctionError(err, FALLBACK)).toBe(FALLBACK);
  });

  it('falls back when message is the generic non-2xx text and body is unreadable', async () => {
    expect(await extractEdgeFunctionError(makeError(null), FALLBACK)).toBe(FALLBACK);
  });

  it('returns the error message if it is custom (not the generic non-2xx text)', async () => {
    const err = { context: undefined, message: 'Network unreachable' };
    expect(await extractEdgeFunctionError(err, FALLBACK)).toBe('Network unreachable');
  });

  it('falls back for non-Error inputs', async () => {
    expect(await extractEdgeFunctionError(null, FALLBACK)).toBe(FALLBACK);
    expect(await extractEdgeFunctionError(undefined, FALLBACK)).toBe(FALLBACK);
  });
});
