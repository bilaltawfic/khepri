import { Link, useRouter } from 'expo-router';
import { useState } from 'react';

import { AuthFormLayout } from '@/components/AuthFormLayout';
import { Button } from '@/components/Button';
import { FormInput } from '@/components/FormInput';
import { ThemedText } from '@/components/ThemedText';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { getAthleteByAuthUser } from '@khepri/supabase-client';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = (): string | null => {
    if (!email.trim()) return 'Email is required';
    if (!password) return 'Password is required';
    return null;
  };

  const isFormIncomplete = !email.trim() || !password;

  const handleSignIn = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError('');
    setIsSubmitting(true);

    const { error: signInError } = await signIn(email.trim(), password);
    if (signInError) {
      setError(signInError.message);
      setIsSubmitting(false);
      return;
    }

    // Check if user has completed onboarding (has an athlete record)
    if (supabase) {
      const { data: session } = await supabase.auth.getSession();
      if (session?.session?.user?.id) {
        const { data: athlete } = await getAthleteByAuthUser(supabase, session.session.user.id);
        if (!athlete) {
          router.replace('/onboarding');
          return;
        }
      }
    }

    router.replace('/(tabs)');
  };

  return (
    <AuthFormLayout
      title="Welcome Back"
      subtitle="Sign in to continue"
      error={error}
      footer={
        <>
          <ThemedText type="caption">Don't have an account? </ThemedText>
          <Link
            href="/auth/signup"
            replace
            accessibilityRole="link"
            accessibilityLabel="Go to sign up"
          >
            <ThemedText type="link">Sign Up</ThemedText>
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
        placeholder="Enter your password"
        secureTextEntry
        autoComplete="password"
        accessibilityLabel="Password"
      />

      <Button
        title={isSubmitting ? 'Signing in...' : 'Sign In'}
        onPress={handleSignIn}
        disabled={isSubmitting || isFormIncomplete}
        accessibilityLabel="Sign in"
      />
    </AuthFormLayout>
  );
}
