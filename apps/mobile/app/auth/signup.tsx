import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View, useColorScheme } from 'react-native';

import { AuthFormLayout } from '@/components/AuthFormLayout';
import { Button } from '@/components/Button';
import { FormInput } from '@/components/FormInput';
import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';

const MIN_PASSWORD_LENGTH = 8;

function isValidEmail(email: string): boolean {
  const parts = email.split('@');
  return parts.length === 2 && parts[0].length > 0 && parts[1].includes('.');
}

export default function SignupScreen() {
  const { signUp } = useAuth();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmEmail, setShowConfirmEmail] = useState(false);

  const validate = (): string | null => {
    if (!email.trim()) return 'Email is required';
    if (!isValidEmail(email.trim())) return 'Please enter a valid email address';
    if (!password) return 'Password is required';
    if (password.length < MIN_PASSWORD_LENGTH)
      return `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
    if (!confirmPassword) return 'Confirm password is required';
    if (password !== confirmPassword) return 'Passwords do not match';
    return null;
  };

  const isFormIncomplete = !email.trim() || !password || !confirmPassword;

  const handleSignUp = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError('');
    setIsSubmitting(true);

    const { error: signUpError, emailConfirmationRequired } = await signUp(email.trim(), password);
    if (signUpError) {
      setError(signUpError.message);
      setIsSubmitting(false);
    } else if (emailConfirmationRequired) {
      setIsSubmitting(false);
      setShowConfirmEmail(true);
    } else {
      router.replace('/onboarding');
    }
  };

  if (showConfirmEmail) {
    return (
      <AuthFormLayout
        title="Check Your Email"
        subtitle={`We sent a confirmation link to ${email.trim()}`}
        footer={
          <>
            <ThemedText type="caption">Already confirmed? </ThemedText>
            <Link
              href="/auth/login"
              replace
              accessibilityRole="link"
              accessibilityLabel="Go to sign in"
            >
              <ThemedText type="link">Sign In</ThemedText>
            </Link>
          </>
        }
      >
        <View style={styles.confirmContainer}>
          <View
            style={[styles.iconContainer, { backgroundColor: `${Colors[colorScheme].primary}15` }]}
          >
            <Ionicons name="mail-outline" size={48} color={Colors[colorScheme].primary} />
          </View>
          <ThemedText style={styles.confirmText}>
            Please check your inbox and tap the confirmation link to activate your account. Once
            confirmed, you can sign in to start your onboarding.
          </ThemedText>
        </View>
        <Button
          title="Go to Sign In"
          onPress={() => router.replace('/auth/login')}
          accessibilityLabel="Go to sign in"
        />
      </AuthFormLayout>
    );
  }

  return (
    <AuthFormLayout
      title="Create Account"
      subtitle="Get started with your training"
      error={error}
      footer={
        <>
          <ThemedText type="caption">Already have an account? </ThemedText>
          <Link
            href="/auth/login"
            replace
            accessibilityRole="link"
            accessibilityLabel="Go to sign in"
          >
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
        disabled={isSubmitting || isFormIncomplete}
        accessibilityLabel="Sign up"
      />
    </AuthFormLayout>
  );
}

const styles = StyleSheet.create({
  confirmContainer: {
    alignItems: 'center',
    gap: 16,
    paddingVertical: 16,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmText: {
    textAlign: 'center',
    lineHeight: 22,
    opacity: 0.8,
  },
});
