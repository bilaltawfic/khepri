import { render } from '@testing-library/react-native';
import { Text } from 'react-native';
import { ProtectedRoute } from '../ProtectedRoute';

let mockUser: object | null = null;
let mockIsLoading = false;
let mockIsConfigured = true;

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    isLoading: mockIsLoading,
    isConfigured: mockIsConfigured,
    session: null,
    signIn: jest.fn(),
    signUp: jest.fn(),
    signOut: jest.fn(),
  }),
}));

describe('ProtectedRoute', () => {
  beforeEach(() => {
    mockUser = null;
    mockIsLoading = false;
    mockIsConfigured = true;
  });

  it('renders children when user is authenticated', () => {
    mockUser = { id: 'user-1', email: 'test@example.com' };

    const { toJSON } = render(
      <ProtectedRoute>
        <Text>Protected content</Text>
      </ProtectedRoute>
    );

    const json = JSON.stringify(toJSON());
    expect(json).toContain('Protected content');
  });

  it('redirects to login when user is not authenticated', () => {
    mockUser = null;

    const { toJSON } = render(
      <ProtectedRoute>
        <Text>Protected content</Text>
      </ProtectedRoute>
    );

    const json = JSON.stringify(toJSON());
    expect(json).toContain('Redirect:/auth/login');
    expect(json).not.toContain('Protected content');
  });

  it('shows loading indicator while checking auth state', () => {
    mockIsLoading = true;

    const { getByLabelText } = render(
      <ProtectedRoute>
        <Text>Protected content</Text>
      </ProtectedRoute>
    );

    expect(getByLabelText('Loading')).toBeTruthy();
  });

  it('renders custom fallback while loading', () => {
    mockIsLoading = true;

    const { toJSON } = render(
      <ProtectedRoute fallback={<Text>Custom loading...</Text>}>
        <Text>Protected content</Text>
      </ProtectedRoute>
    );

    const json = JSON.stringify(toJSON());
    expect(json).toContain('Custom loading...');
    expect(json).not.toContain('Protected content');
  });

  it('bypasses auth when Supabase is not configured (dev mode)', () => {
    mockIsConfigured = false;
    mockUser = null;

    const { toJSON } = render(
      <ProtectedRoute>
        <Text>Dev content</Text>
      </ProtectedRoute>
    );

    const json = JSON.stringify(toJSON());
    expect(json).toContain('Dev content');
  });

  it('does not redirect in dev mode even without user', () => {
    mockIsConfigured = false;
    mockUser = null;

    const { toJSON } = render(
      <ProtectedRoute>
        <Text>Still visible</Text>
      </ProtectedRoute>
    );

    const json = JSON.stringify(toJSON());
    expect(json).not.toContain('Redirect');
    expect(json).toContain('Still visible');
  });
});
