import { Link } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View, useColorScheme } from 'react-native';

import { Button } from '@/components/Button';
import { FormInput } from '@/components/FormInput';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const colorScheme = useColorScheme() ?? 'light';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = (): string | null => {
    if (!email.trim()) return 'Email is required';
    if (!password) return 'Password is required';
    return null;
  };

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
    }

    setIsSubmitting(false);
  };

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          <ThemedText type="title" style={styles.title}>
            Welcome Back
          </ThemedText>
          <ThemedText type="caption" style={styles.subtitle}>
            Sign in to continue
          </ThemedText>

          {error ? (
            <ThemedText
              type="caption"
              style={[styles.errorText, { color: Colors[colorScheme].error }]}
              accessibilityRole="alert"
              accessibilityLabel={error}
            >
              {error}
            </ThemedText>
          ) : null}

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
            disabled={isSubmitting}
            accessibilityLabel="Sign in"
          />

          <View style={styles.footer}>
            <ThemedText type="caption">Don't have an account? </ThemedText>
            <Link href="/auth/signup" accessibilityRole="link" accessibilityLabel="Go to sign up">
              <ThemedText type="link">Sign Up</ThemedText>
            </Link>
          </View>
        </View>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 32,
  },
  errorText: {
    textAlign: 'center',
    marginBottom: 16,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
});
