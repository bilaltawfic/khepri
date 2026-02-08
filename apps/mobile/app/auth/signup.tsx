import { Link, useRouter } from 'expo-router';
import { useState } from 'react';

import { AuthFormLayout } from '@/components/AuthFormLayout';
import { Button } from '@/components/Button';
import { FormInput } from '@/components/FormInput';
import { ThemedText } from '@/components/ThemedText';
import { useAuth } from '@/contexts/AuthContext';

const MIN_PASSWORD_LENGTH = 8;

function isValidEmail(email: string): boolean {
  const parts = email.split('@');
  return parts.length === 2 && parts[0].length > 0 && parts[1].includes('.');
}

export default function SignupScreen() {
  const { signUp } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = (): string | null => {
    if (!email.trim()) return 'Email is required';
    if (!isValidEmail(email.trim())) return 'Please enter a valid email address';
    if (!password) return 'Password is required';
    if (password.length < MIN_PASSWORD_LENGTH)
      return `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
    if (password !== confirmPassword) return 'Passwords do not match';
    return null;
  };

  const handleSignUp = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError('');
    setIsSubmitting(true);

    const { error: signUpError } = await signUp(email.trim(), password);
    if (signUpError) {
      setError(signUpError.message);
    } else {
      router.replace('/onboarding');
    }

    setIsSubmitting(false);
  };

  return (
    <AuthFormLayout
      title="Create Account"
      subtitle="Get started with your training"
      error={error}
      footer={
        <>
          <ThemedText type="caption">Already have an account? </ThemedText>
          <Link href="/auth/login" accessibilityRole="link" accessibilityLabel="Go to sign in">
            <ThemedText type="link">Sign In</ThemedText>
          </Link>
        </>
      }
    >
      <FormInput
        label="Email"
        value={email}
        onChangeText={setEmail}
        placeholder="you@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        accessibilityLabel="Email"
      />

      <FormInput
        label="Password"
        value={password}
        onChangeText={setPassword}
        placeholder="At least 8 characters"
        secureTextEntry
        autoComplete="new-password"
        accessibilityLabel="Password"
      />

      <FormInput
        label="Confirm Password"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        placeholder="Re-enter your password"
        secureTextEntry
        autoComplete="new-password"
        accessibilityLabel="Confirm password"
      />

      <Button
        title={isSubmitting ? 'Creating account...' : 'Sign Up'}
        onPress={handleSignUp}
        disabled={isSubmitting}
        accessibilityLabel="Sign up"
      />
    </AuthFormLayout>
  );
}
