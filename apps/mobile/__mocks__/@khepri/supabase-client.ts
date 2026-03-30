// Manual mock for @khepri/supabase-client
// This allows tests to import from the package without the real module being present.

export const createSupabaseClient = jest.fn(() => ({
  auth: {
    getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
    onAuthStateChange: jest.fn(() => ({
      data: { subscription: { unsubscribe: jest.fn() } },
    })),
    signInWithPassword: jest.fn(),
    signUp: jest.fn(),
    signOut: jest.fn(),
    resetPasswordForEmail: jest.fn(),
    updateUser: jest.fn(),
  },
}));

// Query functions used by various hooks/screens
export const getAthleteByAuthUser = jest.fn().mockResolvedValue({ data: null, error: null });
export const getTodayCheckin = jest.fn().mockResolvedValue({ data: null, error: null });
export const getMostRecentConversation = jest.fn().mockResolvedValue({ data: null, error: null });
export const createConversation = jest.fn().mockResolvedValue({ data: null, error: null });
export const getMessages = jest.fn().mockResolvedValue({ data: [], error: null });
export const addMessage = jest.fn().mockResolvedValue({ data: null, error: null });
export const archiveConversation = jest.fn().mockResolvedValue({ data: null, error: null });
export const getRecentCheckins = jest.fn().mockResolvedValue({ data: [], error: null });
