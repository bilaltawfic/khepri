// Test lib/supabase.ts module behavior
// We need to test the module-level initialization, so we use jest.isolateModules

const mockCreateSupabaseClient = jest.fn(() => ({ auth: {} }));

jest.mock('@khepri/supabase-client', () => ({
  createSupabaseClient: mockCreateSupabaseClient,
}));

jest.mock('@react-native-async-storage/async-storage', () => {
  const storageMock = { getItem: jest.fn(), setItem: jest.fn(), removeItem: jest.fn() };
  return { __esModule: true, default: storageMock, ...storageMock };
});

describe('lib/supabase', () => {
  beforeEach(() => {
    jest.resetModules();
    mockCreateSupabaseClient.mockClear();
  });

  it('does not create client when config is missing', () => {
    jest.mock('expo-constants', () => {
      const mock = { expoConfig: { extra: {} } };
      return { __esModule: true, default: mock, ...mock };
    });

    const { supabase, isSupabaseConfigured } = require('../supabase');

    expect(supabase).toBeUndefined();
    expect(isSupabaseConfigured()).toBe(false);
    expect(mockCreateSupabaseClient).not.toHaveBeenCalled();
  });

  it('creates client when config is present', () => {
    jest.mock('expo-constants', () => {
      const mock = {
        expoConfig: {
          extra: {
            supabaseUrl: 'https://test.supabase.co',
            supabaseAnonKey: 'test-anon-key',
          },
        },
      };
      return { __esModule: true, default: mock, ...mock };
    });

    const { supabase, isSupabaseConfigured } = require('../supabase');

    expect(supabase).toBeDefined();
    expect(isSupabaseConfigured()).toBe(true);
    expect(mockCreateSupabaseClient).toHaveBeenCalledWith({
      url: 'https://test.supabase.co',
      key: 'test-anon-key',
      options: {
        auth: {
          storage: expect.any(Object),
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
        },
      },
    });
  });
});
