import { act, render, renderHook, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import { AuthProvider, useAuth } from '../AuthContext';

// Mock lib/supabase
const mockGetSession = jest.fn();
const mockOnAuthStateChange = jest.fn();
const mockSignInWithPassword = jest.fn();
const mockSignUp = jest.fn();
const mockSignOut = jest.fn();

let mockSupabase: object | undefined;
let mockIsConfigured = true;

jest.mock('@/lib/supabase', () => ({
  get supabase() {
    return mockSupabase;
  },
  isSupabaseConfigured: () => mockIsConfigured,
}));

function createMockSupabase() {
  return {
    auth: {
      getSession: mockGetSession,
      onAuthStateChange: mockOnAuthStateChange,
      signInWithPassword: mockSignInWithPassword,
      signUp: mockSignUp,
      signOut: mockSignOut,
    },
  };
}

function wrapper({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsConfigured = true;
    mockSupabase = createMockSupabase();
    mockGetSession.mockResolvedValue({ data: { session: null } });
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } },
    });
  });

  describe('useAuth', () => {
    it('throws when used outside AuthProvider', () => {
      // Suppress console.error for the expected error
      const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
      expect(() => renderHook(() => useAuth())).toThrow(
        'useAuth must be used within an AuthProvider'
      );
      spy.mockRestore();
    });

    it('provides auth state within AuthProvider', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.session).toBeNull();
      expect(result.current.user).toBeNull();
      expect(result.current.isConfigured).toBe(true);
    });
  });

  describe('AuthProvider', () => {
    it('renders children', () => {
      const { toJSON } = render(
        <AuthProvider>
          <Text>Child content</Text>
        </AuthProvider>
      );
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Child content');
    });

    it('loads session on mount', async () => {
      const mockSession = {
        user: { id: 'user-1', email: 'test@example.com' },
        access_token: 'token',
      };
      mockGetSession.mockResolvedValue({ data: { session: mockSession } });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.session).toEqual(mockSession);
      expect(result.current.user).toEqual(mockSession.user);
    });

    it('subscribes to auth state changes', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockOnAuthStateChange).toHaveBeenCalledTimes(1);
    });

    it('updates session when auth state changes', async () => {
      let authCallback: (event: string, session: unknown) => void = () => {};
      mockOnAuthStateChange.mockImplementation((cb: (event: string, session: unknown) => void) => {
        authCallback = cb;
        return { data: { subscription: { unsubscribe: jest.fn() } } };
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const newSession = {
        user: { id: 'user-2', email: 'new@example.com' },
        access_token: 'new-token',
      };

      act(() => {
        authCallback?.('SIGNED_IN', newSession);
      });

      expect(result.current.session).toEqual(newSession);
      expect(result.current.user).toEqual(newSession.user);
    });

    it('handles getSession error gracefully', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: null },
        error: { message: 'Session expired' },
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.session).toBeNull();
      expect(result.current.user).toBeNull();
    });

    it('handles getSession rejection gracefully', async () => {
      mockGetSession.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.session).toBeNull();
    });

    it('unsubscribes on unmount', async () => {
      const mockUnsubscribe = jest.fn();
      mockOnAuthStateChange.mockReturnValue({
        data: { subscription: { unsubscribe: mockUnsubscribe } },
      });

      const { result, unmount } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      unmount();
      expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
    });
  });

  describe('when Supabase is not configured', () => {
    beforeEach(() => {
      mockIsConfigured = false;
      mockSupabase = undefined;
    });

    it('sets isConfigured to false', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isConfigured).toBe(false);
    });

    it('stops loading without calling Supabase', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockGetSession).not.toHaveBeenCalled();
    });

    it('returns error from signIn', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const { error } = await result.current.signIn('test@example.com', 'password');
      expect(error).toEqual(new Error('Supabase is not configured'));
    });

    it('returns error from signUp', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const { error } = await result.current.signUp('test@example.com', 'password');
      expect(error).toEqual(new Error('Supabase is not configured'));
    });
  });

  describe('signIn', () => {
    it('calls supabase signInWithPassword', async () => {
      mockSignInWithPassword.mockResolvedValue({ error: null });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const { error } = await result.current.signIn('test@example.com', 'password123');

      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
      expect(error).toBeNull();
    });

    it('returns error on failure', async () => {
      mockSignInWithPassword.mockResolvedValue({
        error: { message: 'Invalid credentials' },
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const { error } = await result.current.signIn('test@example.com', 'wrong');
      expect(error).toEqual(new Error('Invalid credentials'));
    });

    it('catches unexpected signIn rejections', async () => {
      mockSignInWithPassword.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const { error } = await result.current.signIn('test@example.com', 'password');
      expect(error).toEqual(new Error('Network error'));
    });
  });

  describe('signUp', () => {
    it('calls supabase signUp', async () => {
      mockSignUp.mockResolvedValue({ error: null });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const { error } = await result.current.signUp('test@example.com', 'password123');

      expect(mockSignUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
      expect(error).toBeNull();
    });

    it('returns error on failure', async () => {
      mockSignUp.mockResolvedValue({
        error: { message: 'User already exists' },
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const { error } = await result.current.signUp('test@example.com', 'password123');
      expect(error).toEqual(new Error('User already exists'));
    });

    it('catches unexpected signUp rejections', async () => {
      mockSignUp.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const { error } = await result.current.signUp('test@example.com', 'password123');
      expect(error).toEqual(new Error('Network error'));
    });
  });

  describe('signOut', () => {
    it('calls supabase signOut', async () => {
      mockSignOut.mockResolvedValue({ error: null });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await result.current.signOut();
      expect(mockSignOut).toHaveBeenCalledTimes(1);
    });

    it('handles signOut errors gracefully', async () => {
      mockSignOut.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should not throw
      await result.current.signOut();
      expect(mockSignOut).toHaveBeenCalledTimes(1);
    });
  });
});
