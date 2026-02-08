import { resetPassword, updatePassword } from '../auth';

const mockResetPasswordForEmail = jest.fn();
const mockUpdateUser = jest.fn();

let mockSupabase: object | undefined;

jest.mock('@/lib/supabase', () => ({
  get supabase() {
    return mockSupabase;
  },
}));

function createMockSupabase() {
  return {
    auth: {
      resetPasswordForEmail: mockResetPasswordForEmail,
      updateUser: mockUpdateUser,
    },
  };
}

describe('auth service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = createMockSupabase();
  });

  describe('resetPassword', () => {
    it('calls resetPasswordForEmail with the email', async () => {
      mockResetPasswordForEmail.mockResolvedValue({ error: null });

      const { error } = await resetPassword('test@example.com');

      expect(mockResetPasswordForEmail).toHaveBeenCalledWith('test@example.com');
      expect(error).toBeNull();
    });

    it('returns error on failure', async () => {
      mockResetPasswordForEmail.mockResolvedValue({
        error: { message: 'User not found' },
      });

      const { error } = await resetPassword('unknown@example.com');

      expect(error).toEqual(new Error('User not found'));
    });

    it('returns error when Supabase is not configured', async () => {
      mockSupabase = undefined;

      const { error } = await resetPassword('test@example.com');

      expect(error).toEqual(new Error('Supabase is not configured'));
      expect(mockResetPasswordForEmail).not.toHaveBeenCalled();
    });
  });

  describe('updatePassword', () => {
    it('calls updateUser with the new password', async () => {
      mockUpdateUser.mockResolvedValue({ error: null });

      const { error } = await updatePassword('newPassword123');

      expect(mockUpdateUser).toHaveBeenCalledWith({ password: 'newPassword123' });
      expect(error).toBeNull();
    });

    it('returns error on failure', async () => {
      mockUpdateUser.mockResolvedValue({
        error: { message: 'Password too weak' },
      });

      const { error } = await updatePassword('weak');

      expect(error).toEqual(new Error('Password too weak'));
    });

    it('returns error when Supabase is not configured', async () => {
      mockSupabase = undefined;

      const { error } = await updatePassword('newPassword123');

      expect(error).toEqual(new Error('Supabase is not configured'));
      expect(mockUpdateUser).not.toHaveBeenCalled();
    });
  });
});
